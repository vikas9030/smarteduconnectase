-- Remove duplicate triggers that cause double notifications

DROP TRIGGER IF EXISTS trg_notify_parent_attendance ON public.attendance;
DROP TRIGGER IF EXISTS trg_notify_admin_certificate_request ON public.certificate_requests;
DROP TRIGGER IF EXISTS trg_notify_parent_exam_result ON public.exam_marks;
DROP TRIGGER IF EXISTS trg_notify_admin_leave_request ON public.leave_requests;