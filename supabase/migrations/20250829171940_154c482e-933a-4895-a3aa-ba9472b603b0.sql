-- Allow freezing promotions by expanding status CHECK constraint
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_status_check;
ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_status_check CHECK (status IN ('active', 'frozen', 'expired'));

-- Ensure default remains 'active'
ALTER TABLE public.promotions ALTER COLUMN status SET DEFAULT 'active';