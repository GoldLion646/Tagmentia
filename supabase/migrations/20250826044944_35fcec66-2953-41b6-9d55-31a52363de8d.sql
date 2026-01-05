
-- 1) Add an "email_confirmed" flag to profiles, defaulting to false
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_confirmed boolean NOT NULL DEFAULT false;

-- 2) Backfill for existing users: mark profiles as confirmed if their auth.users record is confirmed
UPDATE public.profiles p
SET email_confirmed = true
FROM auth.users u
WHERE u.id = p.id
  AND u.email_confirmed_at IS NOT NULL;

-- Optional: simple index to speed up filtering in the admin list
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed ON public.profiles (email_confirmed);
