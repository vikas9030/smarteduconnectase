
CREATE POLICY "Teachers can view complaints visible to them"
ON public.complaints
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND 'teacher' = ANY(visible_to)
);
