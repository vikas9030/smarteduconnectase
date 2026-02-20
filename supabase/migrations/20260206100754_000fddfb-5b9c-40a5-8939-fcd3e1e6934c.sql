-- Allow teachers to insert subjects
CREATE POLICY "Teachers can create subjects"
ON public.subjects
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));