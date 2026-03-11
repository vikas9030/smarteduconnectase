
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins and super admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin_or_super(auth.uid()))
WITH CHECK (public.is_admin_or_super(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
