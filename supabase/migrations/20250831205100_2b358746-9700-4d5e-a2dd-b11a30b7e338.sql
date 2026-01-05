-- Enforce strict RLS on promotions to prevent public access to promo codes
-- 1) Ensure RLS is enabled and enforced
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions FORCE ROW LEVEL SECURITY;

-- 2) Remove any overly permissive SELECT policies if they exist
DROP POLICY IF EXISTS "Anyone can view promotions" ON public.promotions;
DROP POLICY IF EXISTS "Promotions are viewable by everyone" ON public.promotions;
DROP POLICY IF EXISTS "Authenticated users can view promotions" ON public.promotions;

-- 3) Ensure admin-only policies are present
DO $$
BEGIN
  -- Admins can manage (insert/update/delete/select) promotions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'promotions' AND policyname = 'Admins can manage promotions'
  ) THEN
    CREATE POLICY "Admins can manage promotions"
    ON public.promotions
    FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  -- Explicit admin-only SELECT policy for clarity
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'promotions' AND policyname = 'Admins can view promotions'
  ) THEN
    CREATE POLICY "Admins can view promotions"
    ON public.promotions
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;