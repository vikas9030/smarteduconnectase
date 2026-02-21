
-- Attendance trigger
CREATE TRIGGER trg_notify_parent_attendance
AFTER INSERT ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.notify_parent_attendance();

-- Exam result trigger
CREATE TRIGGER trg_notify_parent_exam_result
AFTER INSERT ON public.exam_marks
FOR EACH ROW
EXECUTE FUNCTION public.notify_parent_exam_result();

-- Certificate request trigger
CREATE TRIGGER trg_notify_admin_certificate_request
AFTER INSERT ON public.certificate_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_certificate_request();

-- Leave request trigger
CREATE TRIGGER trg_notify_admin_leave_request
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_leave_request();

-- Announcement notification function
CREATE OR REPLACE FUNCTION public.notify_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
  audiences text[];
BEGIN
  audiences := COALESCE(NEW.target_audience, ARRAY['all']);

  IF 'all' = ANY(audiences) OR 'admin' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/admin/announcements');
    END LOOP;
  END IF;

  IF 'all' = ANY(audiences) OR 'teacher' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'teacher'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/teacher/announcements');
    END LOOP;
  END IF;

  IF 'all' = ANY(audiences) OR 'parent' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'parent'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/parent/announcements');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Announcement trigger
CREATE TRIGGER trg_notify_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_announcement();
