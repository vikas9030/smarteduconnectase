-- 1) Create a security-definer function to resolve the parent login email from a student identifier
-- This allows login without making the students/parents tables publicly readable.
CREATE OR REPLACE FUNCTION public.get_parent_login_email(student_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.email
  FROM public.students s
  JOIN public.student_parents sp ON sp.student_id = s.id
  JOIN public.parents p ON p.id = sp.parent_id
  JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE upper(s.admission_number) = upper(student_identifier)
     OR upper(coalesce(s.login_id, '')) = upper(student_identifier)
  LIMIT 1;
$$;

-- Lock down function execution to known roles
REVOKE ALL ON FUNCTION public.get_parent_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_login_email(text) TO anon, authenticated;

-- 2) Remove the unsafe public SELECT policy on students (if present)
DROP POLICY IF EXISTS "Allow anonymous student lookup for login" ON public.students;

-- 3) Ensure students SELECT is restricted to staff + linked parents (restore/recreate policy)
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;
CREATE POLICY "Teachers can view students in their classes"
ON public.students
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.student_parents sp
    JOIN public.parents p ON sp.parent_id = p.id
    WHERE sp.student_id = students.id
      AND p.user_id = auth.uid()
  )
);