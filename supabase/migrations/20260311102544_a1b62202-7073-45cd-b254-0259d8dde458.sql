
DROP POLICY IF EXISTS "Admins can manage syllabus" ON public.syllabus;

CREATE POLICY "Admins can manage syllabus"
ON public.syllabus
FOR ALL
TO authenticated
USING (is_admin_or_super(auth.uid()))
WITH CHECK (is_admin_or_super(auth.uid()));
