-- Drop existing SELECT policy for reports
DROP POLICY IF EXISTS "Authenticated users can view reports" ON public.reports;

-- Create new policy: Admins can view all reports, animadores only their own
CREATE POLICY "Users can view reports based on role"
ON public.reports
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR created_by = auth.uid()
);