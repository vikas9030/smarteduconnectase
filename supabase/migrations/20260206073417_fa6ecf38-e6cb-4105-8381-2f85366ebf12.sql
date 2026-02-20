-- Fix the trigger to always assign a role (default to admin for signups from auth page)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_role TEXT;
  user_phone TEXT;
  admin_count INTEGER;
BEGIN
  -- Get data from user metadata
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  user_role := NEW.raw_user_meta_data->>'role';
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  IF user_full_name IS NULL THEN
    user_full_name := 'User';
  END IF;

  -- Create profile with phone if provided
  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (NEW.id, user_full_name, NEW.email, user_phone);

  -- Handle role assignment
  IF user_role IS NOT NULL AND user_role IN ('admin', 'teacher', 'parent') THEN
    -- Role explicitly specified in metadata - use it
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::app_role);
  ELSE
    -- No role specified - check if first user (admin) or default behavior
    SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
    IF admin_count = 0 THEN
      -- First signup becomes admin
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
    ELSE
      -- Subsequent signups from public auth page should be admin
      -- (since signup form only shows when no admins exist, this shouldn't happen)
      -- For safety, assign admin role to prevent orphan users
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also add missing roles for existing users (dileep, vikas, john)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id
)
ON CONFLICT DO NOTHING;