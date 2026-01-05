-- Add storage quota field to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_quota_mb integer NULL;

COMMENT ON COLUMN public.plans.storage_quota_mb IS 'Storage quota in MB for this plan. NULL = unlimited';

-- Update existing plans with defaults from storage_policy
DO $$
DECLARE
  policy RECORD;
BEGIN
  SELECT * INTO policy FROM public.storage_policy LIMIT 1;
  
  UPDATE public.plans SET storage_quota_mb = policy.default_quota_free_mb WHERE name = 'Free Plan';
  UPDATE public.plans SET storage_quota_mb = policy.default_quota_premium_mb WHERE name = 'Premium Plan';
  UPDATE public.plans SET storage_quota_mb = NULL WHERE name = 'Gold Plan';
END $$;

-- Update get_user_storage_quota to use plan-specific quotas
CREATE OR REPLACE FUNCTION public.get_user_storage_quota(user_uuid uuid)
RETURNS TABLE(quota_bytes bigint, used_bytes bigint, remaining_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_record RECORD;
  used bigint;
BEGIN
  -- Check if user is admin (unlimited)
  IF public.has_role(user_uuid, 'admin'::app_role) THEN
    SELECT COALESCE(u.used_bytes, 0) INTO used
    FROM public.user_storage_usage u
    WHERE u.user_id = user_uuid;
    
    RETURN QUERY SELECT NULL::bigint, COALESCE(used, 0::bigint), NULL::bigint;
    RETURN;
  END IF;
  
  -- Get user's active plan with storage quota
  SELECT p.storage_quota_mb INTO plan_record
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid 
    AND us.status IN ('active', 'canceling')
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Get used bytes
  SELECT COALESCE(u.used_bytes, 0) INTO used
  FROM public.user_storage_usage u
  WHERE u.user_id = user_uuid;
  
  -- If no active subscription, use Free Plan quota
  IF plan_record.storage_quota_mb IS NULL AND NOT FOUND THEN
    SELECT p.storage_quota_mb INTO plan_record
    FROM public.plans p
    WHERE p.name = 'Free Plan'
    LIMIT 1;
  END IF;
  
  -- Return results
  IF plan_record.storage_quota_mb IS NULL THEN
    -- Unlimited
    RETURN QUERY SELECT NULL::bigint, COALESCE(used, 0::bigint), NULL::bigint;
  ELSE
    RETURN QUERY SELECT 
      (plan_record.storage_quota_mb * 1024 * 1024)::bigint,
      COALESCE(used, 0::bigint),
      GREATEST(0, (plan_record.storage_quota_mb * 1024 * 1024)::bigint - COALESCE(used, 0::bigint));
  END IF;
END;
$$;