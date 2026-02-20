CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Create a profile for the new user
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

  -- Check if this is the first admin signup (no admin roles exist)
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  
  -- If no admins exist yet, make this user an admin
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;