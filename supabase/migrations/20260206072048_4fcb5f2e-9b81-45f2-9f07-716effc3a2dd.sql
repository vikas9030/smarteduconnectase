-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  admin_count INTEGER;
BEGIN
  -- Get full_name from user metadata
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  IF user_full_name IS NULL THEN
    user_full_name := 'User';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, user_full_name, NEW.email);

  -- Check if this is the first user (should be admin)
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  
  -- If no admins exist, make this user an admin
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();