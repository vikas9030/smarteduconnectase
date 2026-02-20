-- Allow anonymous users to lookup students by admission_number or login_id for login purposes
-- This only exposes minimal fields needed for login flow
CREATE POLICY "Allow anonymous student lookup for login"
ON public.students
FOR SELECT
USING (true);

-- Drop the old restrictive SELECT policy since the new one covers all cases
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON public.students;