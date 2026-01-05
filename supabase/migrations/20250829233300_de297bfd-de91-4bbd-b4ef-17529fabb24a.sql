-- Allow admins to manage user subscriptions so UI actions reflect immediately
-- UPDATE policy for admins
CREATE POLICY IF NOT EXISTS "Admins can update all subscriptions"
ON public.user_subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Optional: allow admins to delete subscriptions (not required by UI but useful for management)
CREATE POLICY IF NOT EXISTS "Admins can delete subscriptions"
ON public.user_subscriptions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Optional: allow admins to insert subscriptions manually if needed
CREATE POLICY IF NOT EXISTS "Admins can insert subscriptions"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));