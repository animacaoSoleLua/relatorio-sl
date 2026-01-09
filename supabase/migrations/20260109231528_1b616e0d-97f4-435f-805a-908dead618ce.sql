-- Drop existing SELECT policy for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy: Admins can view all profiles, users can view their own
CREATE POLICY "Users can view profiles based on role"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR auth.uid() = user_id
);

-- Allow admins to view all user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view roles based on access"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR auth.uid() = user_id
);