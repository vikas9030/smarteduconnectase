-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );

  -- Check if this is the first admin signup (no admin roles exist)
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  
  -- If no admins exist yet, make this user an admin
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also add RLS policy for users to read their own role
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" 
  ON public.user_roles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Add RLS policy for users to read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Add policy for public profiles (for messaging, etc.)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;