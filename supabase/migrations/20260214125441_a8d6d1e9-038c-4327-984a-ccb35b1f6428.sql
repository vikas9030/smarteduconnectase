
-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Allow system inserts via triggers (security definer functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: Notify admins on new leave request
CREATE OR REPLACE FUNCTION public.notify_admin_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  requester_name text;
BEGIN
  -- Get requester name
  IF NEW.request_type = 'student' AND NEW.student_id IS NOT NULL THEN
    SELECT full_name INTO requester_name FROM students WHERE id = NEW.student_id;
  ELSIF NEW.request_type = 'teacher' AND NEW.teacher_id IS NOT NULL THEN
    SELECT p.full_name INTO requester_name FROM teachers t JOIN profiles p ON p.user_id = t.user_id WHERE t.id = NEW.teacher_id;
  END IF;

  FOR admin_id IN SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (admin_id, 'New Leave Request', COALESCE(requester_name, 'Someone') || ' submitted a leave request', 'leave', '/admin/leave');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_leave_request_created
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_leave_request();

-- Trigger: Notify admins on new certificate request
CREATE OR REPLACE FUNCTION public.notify_admin_certificate_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  student_name text;
BEGIN
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;

  FOR admin_id IN SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (admin_id, 'Certificate Request', COALESCE(student_name, 'A student') || ' requested a ' || NEW.certificate_type || ' certificate', 'certificate', '/admin/certificates');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_certificate_request_created
AFTER INSERT ON public.certificate_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_certificate_request();

-- Trigger: Notify parent on attendance marked
CREATE OR REPLACE FUNCTION public.notify_parent_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
  student_name text;
BEGIN
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;

  FOR parent_user_id IN
    SELECT p.user_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE sp.student_id = NEW.student_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (parent_user_id, 'Attendance Update', COALESCE(student_name, 'Your child') || ' marked ' || NEW.status || ' today', 'attendance', '/parent/attendance');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_attendance_marked
AFTER INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_attendance();

-- Trigger: Notify parent on exam marks entered
CREATE OR REPLACE FUNCTION public.notify_parent_exam_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
  student_name text;
  exam_name text;
BEGIN
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
  SELECT name INTO exam_name FROM exams WHERE id = NEW.exam_id;

  FOR parent_user_id IN
    SELECT p.user_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE sp.student_id = NEW.student_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (parent_user_id, 'Exam Result Published', COALESCE(student_name, 'Your child') || '''s ' || COALESCE(exam_name, 'exam') || ' result is available', 'result', '/parent/exams');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_exam_marks_entered
AFTER INSERT ON public.exam_marks
FOR EACH ROW EXECUTE FUNCTION public.notify_parent_exam_result();
