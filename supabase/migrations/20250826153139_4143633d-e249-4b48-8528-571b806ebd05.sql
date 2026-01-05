-- Clean up the pending_signups policies that were added
DROP POLICY IF EXISTS "Service role full access" ON public.pending_signups;