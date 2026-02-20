-- Allow unauthenticated users to read teacher_id and user_id for login purposes
CREATE POLICY "Allow reading teacher info for login" 
  ON public.teachers 
  FOR SELECT 
  USING (true);