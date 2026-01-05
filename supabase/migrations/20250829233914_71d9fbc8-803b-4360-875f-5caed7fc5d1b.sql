-- Fix unique constraint to allow multiple expired subscriptions and only one active per user
-- 1) Drop the existing unique constraint on (user_id, status)
ALTER TABLE public.user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_status_key;

-- 2) Create a partial unique index to enforce only one active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_one_active_per_user
ON public.user_subscriptions (user_id)
WHERE status = 'active';