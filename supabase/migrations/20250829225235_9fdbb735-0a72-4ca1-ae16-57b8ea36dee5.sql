-- Remove overly permissive policy on user_subscriptions
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

-- (No replacement needed) Edge functions using the service role bypass RLS safely.
-- Existing policies kept:
--  - "Admins can view all subscriptions" (SELECT)
--  - "Users can view their own subscriptions" (SELECT)
-- This locks down INSERT/UPDATE/DELETE from the client.
