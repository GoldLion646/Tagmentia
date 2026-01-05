-- RLS policies for pending_signups table (service-role bypass for backend ops)
-- Since this is purely backend-managed, no user-facing policies needed
-- The table is secure by having RLS enabled but no policies, meaning only service role can access
create policy "Service role full access" on public.pending_signups
  for all using (false); -- This effectively blocks all user access while allowing service role

-- Alternative: if we want to allow users to check their own pending status
-- create policy "Users can view their own pending signup" on public.pending_signups
--   for select using (auth.jwt() ->> 'email' = email);