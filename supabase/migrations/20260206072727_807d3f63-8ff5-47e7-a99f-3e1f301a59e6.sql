-- Update the handle_new_user function to accept a role parameter via metadata
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
  IF user_role IS NOT NULL AND user_role IN ('teacher', 'parent') THEN
    -- Role specified in metadata - use it
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::app_role);
  ELSE
    -- No role specified, check if first admin
    SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
    IF admin_count = 0 THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;