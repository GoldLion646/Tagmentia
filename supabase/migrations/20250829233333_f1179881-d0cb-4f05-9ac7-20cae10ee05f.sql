-- Create admin policies for managing user_subscriptions using DO blocks for idempotency
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_subscriptions' 
      AND policyname = 'Admins can update all subscriptions'
  ) THEN
    CREATE POLICY "Admins can update all subscriptions"
    ON public.user_subscriptions
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_subscriptions' 
      AND policyname = 'Admins can delete subscriptions'
  ) THEN
    CREATE POLICY "Admins can delete subscriptions"
    ON public.user_subscriptions
    FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_subscriptions' 
      AND policyname = 'Admins can insert subscriptions'
  ) THEN
    CREATE POLICY "Admins can insert subscriptions"
    ON public.user_subscriptions
    FOR INSERT
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;