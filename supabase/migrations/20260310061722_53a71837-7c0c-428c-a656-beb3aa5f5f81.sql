
-- Allow teachers to update complaints visible to them
CREATE POLICY "Teachers can update complaints visible to them"
ON public.complaints FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to))
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to));

-- Notification trigger for complaints
CREATE OR REPLACE FUNCTION public.notify_complaint()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  target_id uuid;
  submitter_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO submitter_name FROM profiles WHERE user_id = NEW.submitted_by;
    
    IF 'admin' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'admin'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/admin/complaints');
      END LOOP;
    END IF;
    
    IF 'teacher' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'teacher'
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/teacher/reports');
      END LOOP;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.response IS DISTINCT FROM NEW.response) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.submitted_by, 'Complaint Updated', 
        CASE WHEN NEW.status = 'resolved' THEN 'Your complaint "' || NEW.subject || '" has been resolved'
             ELSE 'Your complaint "' || NEW.subject || '" status updated to ' || NEW.status END,
        'complaint', '/parent/complaints');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_complaint_change
AFTER INSERT OR UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_complaint();
