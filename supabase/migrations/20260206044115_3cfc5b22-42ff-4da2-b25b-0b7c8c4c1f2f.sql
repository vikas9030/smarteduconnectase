-- Fix overly permissive RLS policies by making them more specific

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Parents can create requests" ON public.certificate_requests;

-- Create more specific policies for leave_requests
CREATE POLICY "Teachers can create their own leave requests" ON public.leave_requests 
FOR INSERT WITH CHECK (
  request_type = 'teacher' AND 
  EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid() AND id = leave_requests.teacher_id)
);

CREATE POLICY "Parents can create student leave requests" ON public.leave_requests 
FOR INSERT WITH CHECK (
  request_type = 'student' AND 
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = leave_requests.student_id AND p.user_id = auth.uid()
  )
);

-- Create more specific policy for certificate_requests
CREATE POLICY "Parents can create certificate requests for their children" ON public.certificate_requests 
FOR INSERT WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = certificate_requests.student_id AND p.user_id = auth.uid()
  )
);