-- Fix Security Definer View warnings and complete security hardening

-- 1. Remove any views with SECURITY DEFINER (if they exist)
-- Check for problematic views and remove them
DROP VIEW IF EXISTS public.public_plans_view;
DROP VIEW IF EXISTS public.public_branding_view;

-- 2. Create a secure RPC function for fetching branding that doesn't use SECURITY DEFINER view
CREATE OR REPLACE FUNCTION public.get_safe_branding()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object('logo_url', logo_url)
  INTO result
  FROM public.branding_settings
  LIMIT 1;
  
  RETURN COALESCE(result, '{"logo_url": null}'::jsonb);
END;
$$;

-- 3. Create a safe RPC function for public plans that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.get_safe_plans()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'price_monthly', price_monthly,
      'price_yearly', price_yearly,
      'max_categories', max_categories,
      'max_videos_per_category', max_videos_per_category,
      'ai_summary_enabled', ai_summary_enabled,
      'display_features', CASE 
        WHEN features ? 'display_features' THEN features->'display_features'
        ELSE '[]'::jsonb
      END
    )
  )
  INTO result
  FROM public.plans
  WHERE enabled = true;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 4. Grant execute permissions for these safe functions
GRANT EXECUTE ON FUNCTION public.get_safe_branding() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_plans() TO anon, authenticated;

-- 5. Create a function to check subscription limits safely
CREATE OR REPLACE FUNCTION public.check_user_limits(check_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_limits jsonb;
  current_categories integer;
BEGIN
  -- Only allow users to check their own limits or admins to check any
  IF auth.uid() != check_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Get user plan limits
  SELECT to_jsonb(limits.*) INTO user_plan_limits
  FROM public.get_user_plan_limits(check_user_id) AS limits;
  
  RETURN COALESCE(user_plan_limits, '{"error": "No plan found"}'::jsonb);
END;
$$;

-- 6. Add additional security constraints
-- Ensure security audit log has proper constraints
ALTER TABLE public.security_audit_log 
ADD CONSTRAINT security_audit_log_severity_check 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE public.security_audit_log 
ADD CONSTRAINT security_audit_log_event_type_not_empty 
CHECK (length(trim(event_type)) > 0);

-- 7. Create a function to validate admin operations with additional checks
CREATE OR REPLACE FUNCTION public.validate_admin_operation(
  operation_type text,
  target_user_id uuid DEFAULT NULL,
  additional_data jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_admin boolean;
  result jsonb;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if current user is admin
  is_admin := public.has_role(current_user_id, 'admin'::app_role);
  
  IF NOT is_admin THEN
    RETURN jsonb_build_object(
      'authorized', false,
      'error', 'Insufficient privileges'
    );
  END IF;
  
  -- Log the validation check
  PERFORM public.log_security_event(
    'admin_operation_validated',
    current_user_id,
    jsonb_build_object(
      'operation_type', operation_type,
      'target_user_id', target_user_id,
      'additional_data', additional_data
    ),
    'medium'
  );
  
  RETURN jsonb_build_object(
    'authorized', true,
    'admin_user_id', current_user_id,
    'operation_type', operation_type
  );
END;
$$;