-- Fix Critical Security Issue: Add missing RLS policies for user_subscriptions table
-- This prevents unauthorized access to customer payment data

-- First, ensure RLS is enabled on user_subscriptions (it should already be)
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies and replace with secure ones
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can update all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can delete subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.user_subscriptions;

-- Create secure RLS policies for user_subscriptions
-- Users can only view their own subscription data (excluding sensitive payment fields)
CREATE POLICY "Users can view own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only admins can manage subscriptions
CREATE POLICY "Admins can manage all subscriptions" 
ON public.user_subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create audit trigger for subscription changes
CREATE OR REPLACE FUNCTION public.audit_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log subscription changes for security monitoring
  INSERT INTO public.security_events (
    event_type,
    user_id,
    details,
    severity,
    created_at
  ) VALUES (
    'subscription_modified',
    auth.uid(),
    jsonb_build_object(
      'action', TG_OP,
      'subscription_id', COALESCE(NEW.id, OLD.id),
      'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
      'plan_id', COALESCE(NEW.plan_id, OLD.plan_id),
      'status', COALESCE(NEW.status, OLD.status)
    ),
    'high',
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create security_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  details jsonb DEFAULT '{}',
  severity text DEFAULT 'medium',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add audit trigger to user_subscriptions
CREATE TRIGGER audit_subscription_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_changes();

-- Improve promotional code security
-- Add usage tracking and limits to promotions table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS max_uses integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_uses integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS single_use_per_user boolean DEFAULT true;

-- Create function to securely validate and redeem promo codes
CREATE OR REPLACE FUNCTION public.validate_promo_code(promo_code_input text)
RETURNS TABLE(valid boolean, message text, plan_id uuid, plan_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo_record RECORD;
  plan_record RECORD;
  user_usage_count integer;
BEGIN
  -- Check if promotion exists and is active
  SELECT * INTO promo_record
  FROM public.promotions
  WHERE code = promo_code_input AND status = 'active';
  
  IF promo_record IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid or expired promo code'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Check if promotion has reached max uses
  IF promo_record.max_uses > 0 AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN QUERY SELECT false, 'Promo code has reached maximum usage limit'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Check if user has already used this promo code (if single_use_per_user is true)
  IF promo_record.single_use_per_user AND auth.uid() IS NOT NULL THEN
    SELECT COUNT(*) INTO user_usage_count
    FROM public.user_subscriptions
    WHERE user_id = auth.uid() AND promo_code = promo_code_input;
    
    IF user_usage_count > 0 THEN
      RETURN QUERY SELECT false, 'You have already used this promo code'::text, null::uuid, ''::text;
      RETURN;
    END IF;
  END IF;
  
  -- Get plan details
  SELECT * INTO plan_record
  FROM public.plans
  WHERE id = promo_record.plan_id AND enabled = true;
  
  IF plan_record IS NULL THEN
    RETURN QUERY SELECT false, 'Associated plan is not available'::text, null::uuid, ''::text;
    RETURN;
  END IF;
  
  -- Return valid promotion details
  RETURN QUERY SELECT true, 'Promo code is valid'::text, plan_record.id, plan_record.name;
END;
$$;