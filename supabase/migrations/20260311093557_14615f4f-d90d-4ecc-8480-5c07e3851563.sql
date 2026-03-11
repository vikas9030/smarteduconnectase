
-- Create module_visibility table
CREATE TABLE public.module_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text UNIQUE NOT NULL,
  module_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;

-- RLS: super_admin full CRUD
CREATE POLICY "Super admins can manage module_visibility"
ON public.module_visibility
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- RLS: all authenticated can SELECT
CREATE POLICY "All authenticated can view module_visibility"
ON public.module_visibility
FOR SELECT
TO authenticated
USING (true);

-- Seed all modules
INSERT INTO public.module_visibility (module_key, module_label) VALUES
  ('teachers', 'Teachers Management'),
  ('students', 'Students Management'),
  ('classes', 'Classes Management'),
  ('subjects', 'Subjects Management'),
  ('timetable', 'Timetable'),
  ('attendance', 'Attendance'),
  ('exams', 'Exams'),
  ('syllabus', 'Syllabus'),
  ('homework', 'Homework'),
  ('announcements', 'Announcements'),
  ('leave', 'Leave Requests'),
  ('complaints', 'Complaints'),
  ('certificates', 'Certificates'),
  ('fees', 'Fees Management'),
  ('messages', 'Messages'),
  ('gallery', 'Gallery'),
  ('leads', 'Leads'),
  ('weekly-exams', 'Weekly Exams'),
  ('reports', 'Reports'),
  ('notifications', 'Notifications');

-- Create is_admin_or_super helper function
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Update handle_new_user to create super_admin for first signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role IN ('admin', 'super_admin');
  
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
  END IF;

  RETURN NEW;
END;
$$;

-- Update admin_exists to also check super_admin
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin', 'super_admin'));
END;
$$;

-- Update get_admin_user_ids to include super_admin
CREATE OR REPLACE FUNCTION public.get_admin_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
$$;
