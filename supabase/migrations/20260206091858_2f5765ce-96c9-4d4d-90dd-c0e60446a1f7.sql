-- Create a secure function to check if any admin exists (doesn't expose data)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;