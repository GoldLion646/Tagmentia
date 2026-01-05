-- Create storage_policy table (single row configuration)
CREATE TABLE IF NOT EXISTS public.storage_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_upload_mb integer NOT NULL DEFAULT 5,
  max_longest_edge_px integer NOT NULL DEFAULT 1600,
  compression_quality integer NOT NULL DEFAULT 80,
  enforce_webp boolean NOT NULL DEFAULT true,
  default_quota_free_mb integer NOT NULL DEFAULT 50,
  default_quota_premium_mb integer NOT NULL DEFAULT 1024,
  default_quota_gold_mb integer NULL, -- null = unlimited
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default policy
INSERT INTO public.storage_policy (
  max_upload_mb,
  max_longest_edge_px,
  compression_quality,
  enforce_webp,
  default_quota_free_mb,
  default_quota_premium_mb,
  default_quota_gold_mb
) VALUES (5, 1600, 80, true, 50, 1024, NULL)
ON CONFLICT DO NOTHING;

-- Create user_storage_usage table
CREATE TABLE IF NOT EXISTS public.user_storage_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  used_bytes bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for storage_policy
CREATE POLICY "Admins can view storage policy"
  ON public.storage_policy FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update storage policy"
  ON public.storage_policy FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_storage_usage
CREATE POLICY "Users can view own storage usage"
  ON public.user_storage_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all storage usage"
  ON public.user_storage_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own storage usage"
  ON public.user_storage_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage usage"
  ON public.user_storage_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get user's effective storage quota in bytes
CREATE OR REPLACE FUNCTION public.get_user_storage_quota(user_uuid uuid)
RETURNS TABLE(quota_bytes bigint, used_bytes bigint, remaining_bytes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_record RECORD;
  plan_record RECORD;
  quota_mb integer;
  used bigint;
BEGIN
  -- Get storage policy
  SELECT * INTO policy_record FROM public.storage_policy LIMIT 1;
  
  -- Check if user is admin (unlimited)
  IF public.has_role(user_uuid, 'admin'::app_role) THEN
    SELECT COALESCE(u.used_bytes, 0) INTO used
    FROM public.user_storage_usage u
    WHERE u.user_id = user_uuid;
    
    RETURN QUERY SELECT NULL::bigint, COALESCE(used, 0::bigint), NULL::bigint;
    RETURN;
  END IF;
  
  -- Get user's plan
  SELECT p.name INTO plan_record
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid 
    AND us.status IN ('active', 'canceling')
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- Determine quota based on plan
  IF plan_record.name = 'Gold Plan' THEN
    quota_mb := policy_record.default_quota_gold_mb; -- NULL for unlimited
  ELSIF plan_record.name = 'Premium Plan' THEN
    quota_mb := policy_record.default_quota_premium_mb;
  ELSE
    quota_mb := policy_record.default_quota_free_mb;
  END IF;
  
  -- Get used bytes
  SELECT COALESCE(u.used_bytes, 0) INTO used
  FROM public.user_storage_usage u
  WHERE u.user_id = user_uuid;
  
  -- Return results
  IF quota_mb IS NULL THEN
    -- Unlimited
    RETURN QUERY SELECT NULL::bigint, COALESCE(used, 0::bigint), NULL::bigint;
  ELSE
    RETURN QUERY SELECT 
      (quota_mb * 1024 * 1024)::bigint,
      COALESCE(used, 0::bigint),
      GREATEST(0, (quota_mb * 1024 * 1024)::bigint - COALESCE(used, 0::bigint));
  END IF;
END;
$$;