-- Create subscription plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}',
  max_categories INTEGER NOT NULL DEFAULT 0,
  max_videos_per_category INTEGER NOT NULL DEFAULT 0,
  ai_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  stripe_monthly_price_id TEXT,
  stripe_yearly_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create promotions table
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  validity_period TEXT NOT NULL,
  validity_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  promo_code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Plans policies - Admin only for modifications, everyone can read enabled plans
CREATE POLICY "Anyone can view enabled plans" ON public.plans
  FOR SELECT USING (enabled = true);

CREATE POLICY "Admins can manage plans" ON public.plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Promotions policies - Admin only
CREATE POLICY "Admins can manage promotions" ON public.promotions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (true);

-- Insert default plans
INSERT INTO public.plans (name, price_monthly, price_yearly, features, max_categories, max_videos_per_category, ai_summary_enabled) VALUES
('Free Plan', 0.00, 0.00, '{"basic_analytics": true, "users": 5, "email_support": true, "storage_gb": 1, "custom_branding": false}', 3, 10, false),
('Premium Plan', 29.99, 299.99, '{"advanced_analytics": true, "users": 50, "priority_email_support": true, "storage_gb": 50, "custom_branding": false}', 20, 100, false),
('Gold Plan', 99.99, 999.99, '{"enterprise_analytics": true, "users": -1, "phone_email_support": true, "storage_gb": -1, "custom_branding": true}', -1, -1, true);

-- Create function to get user's current plan with limits
CREATE OR REPLACE FUNCTION public.get_user_plan_limits(user_uuid UUID)
RETURNS TABLE(
  plan_name TEXT,
  max_categories INTEGER,
  max_videos_per_category INTEGER,
  ai_summary_enabled BOOLEAN,
  current_categories INTEGER,
  features JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_record RECORD;
BEGIN
  -- Get user's current active subscription
  SELECT p.name, p.max_categories, p.max_videos_per_category, p.ai_summary_enabled, p.features
  INTO user_plan_record
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.end_date IS NULL OR us.end_date > now())
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- If no subscription found, default to Free Plan
  IF user_plan_record IS NULL THEN
    SELECT p.name, p.max_categories, p.max_videos_per_category, p.ai_summary_enabled, p.features
    INTO user_plan_record
    FROM public.plans p
    WHERE p.name = 'Free Plan';
  END IF;

  -- Count current categories
  RETURN QUERY
  SELECT 
    user_plan_record.name,
    user_plan_record.max_categories,
    user_plan_record.max_videos_per_category,
    user_plan_record.ai_summary_enabled,
    (SELECT COUNT(*)::INTEGER FROM public.categories WHERE user_id = user_uuid),
    user_plan_record.features;
END;
$$;

-- Create function to check if user can create category
CREATE OR REPLACE FUNCTION public.can_create_category(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limits RECORD;
BEGIN
  SELECT * INTO limits FROM public.get_user_plan_limits(user_uuid);
  
  -- -1 means unlimited
  IF limits.max_categories = -1 THEN
    RETURN true;
  END IF;
  
  RETURN limits.current_categories < limits.max_categories;
END;
$$;

-- Create function to check if user can add video to category
CREATE OR REPLACE FUNCTION public.can_add_video_to_category(user_uuid UUID, category_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limits RECORD;
  current_videos INTEGER;
BEGIN
  SELECT * INTO limits FROM public.get_user_plan_limits(user_uuid);
  
  -- -1 means unlimited
  IF limits.max_videos_per_category = -1 THEN
    RETURN true;
  END IF;
  
  -- Count current videos in the category
  SELECT COUNT(*) INTO current_videos
  FROM public.videos
  WHERE category_id = category_uuid AND user_id = user_uuid;
  
  RETURN current_videos < limits.max_videos_per_category;
END;
$$;

-- Create trigger to update updated_at
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to activate promotion
CREATE OR REPLACE FUNCTION public.activate_promotion(promo_code_input TEXT, user_uuid UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, plan_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record RECORD;
  plan_record RECORD;
  end_date_calculated TIMESTAMPTZ;
BEGIN
  -- Find the promotion
  SELECT * INTO promo_record
  FROM public.promotions
  WHERE code = promo_code_input AND status = 'active';
  
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code', ''::TEXT;
    RETURN;
  END IF;
  
  -- Get the plan details
  SELECT * INTO plan_record
  FROM public.plans
  WHERE id = promo_record.plan_id AND enabled = true;
  
  IF plan_record IS NULL THEN
    RETURN QUERY SELECT false, 'Associated plan is not available', ''::TEXT;
    RETURN;
  END IF;
  
  -- Calculate end date
  end_date_calculated := now() + (promo_record.validity_days || ' days')::INTERVAL;
  
  -- Deactivate any current active subscription
  UPDATE public.user_subscriptions 
  SET status = 'expired', updated_at = now()
  WHERE user_id = user_uuid AND status = 'active';
  
  -- Create new subscription
  INSERT INTO public.user_subscriptions (
    user_id, plan_id, start_date, end_date, promo_code, status
  ) VALUES (
    user_uuid, promo_record.plan_id, now(), end_date_calculated, promo_code_input, 'active'
  );
  
  RETURN QUERY SELECT true, 'Promotion activated successfully', plan_record.name;
END;
$$;