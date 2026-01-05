-- Since we're using Supabase's built-in OTP flow instead of custom pending_signups,
-- let's remove the pending_signups table entirely
DROP TABLE IF EXISTS public.pending_signups;