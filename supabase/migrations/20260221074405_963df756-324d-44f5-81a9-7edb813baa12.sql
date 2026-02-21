
-- 1. DELETE policy for notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- 2. Homework notification trigger function
CREATE OR REPLACE FUNCTION public.notify_parent_homework()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  parent_user_id uuid;
  hw_class_name text;
  hw_subject text;
BEGIN
  SELECT name || '-' || section INTO hw_class_name 
  FROM classes WHERE id = NEW.class_id;
  
  IF NEW.subject_id IS NOT NULL THEN
    SELECT name INTO hw_subject FROM subjects WHERE id = NEW.subject_id;
  END IF;

  FOR parent_user_id IN
    SELECT p.user_id 
    FROM student_parents sp 
    JOIN parents p ON p.id = sp.parent_id 
    JOIN students s ON s.id = sp.student_id
    WHERE s.class_id = NEW.class_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      parent_user_id, 
      'New Homework Assigned', 
      NEW.title || COALESCE(' (' || hw_subject || ')', '') || ' - Due: ' || NEW.due_date,
      'homework', 
      '/parent/homework'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- 3. Trigger
CREATE TRIGGER trg_notify_parent_homework
AFTER INSERT ON public.homework
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_homework();
