-- Drop and recreate get_user_plan_limits with storage quota and screenshot limits
DROP FUNCTION IF EXISTS public.get_user_plan_limits(uuid);

CREATE FUNCTION public.get_user_plan_limits(user_uuid uuid)
RETURNS TABLE(
  plan_name text, 
  max_categories integer, 
  max_videos_per_category integer, 
  max_screenshots_per_user integer,
  storage_quota_mb integer,
  ai_summary_enabled boolean, 
  current_categories integer, 
  features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_plan_record RECORD;
  is_admin_user boolean;
BEGIN
  -- Check if user is admin
  SELECT public.has_role(user_uuid, 'admin'::app_role) INTO is_admin_user;
  
  -- If user is admin, return gold-level features
  IF is_admin_user THEN
    RETURN QUERY
    SELECT 
      'Gold Plan (Admin)'::text as plan_name,
      -1 as max_categories,
      -1 as max_videos_per_category,
      -1 as max_screenshots_per_user,
      NULL::integer as storage_quota_mb,
      true as ai_summary_enabled,
      (SELECT COUNT(*)::INTEGER FROM public.categories WHERE user_id = user_uuid) as current_categories,
      '{"display_features": ["Unlimited Categories", "Unlimited Videos", "Unlimited Screenshots", "Unlimited Storage", "AI Summaries", "Admin Access", "Priority Support"]}'::jsonb as features;
    RETURN;
  END IF;

  -- For non-admin users, get their actual subscription
  SELECT p.name, p.max_categories, p.max_videos_per_category, p.max_screenshots_per_user, p.storage_quota_mb, p.ai_summary_enabled, p.features
  INTO user_plan_record
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid 
    AND (
      (us.status = 'active') OR 
      (us.status = 'canceling' AND (us.end_date IS NULL OR us.end_date > now()))
    )
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- If no active subscription, default to Free Plan
  IF user_plan_record IS NULL THEN
    SELECT p.name, p.max_categories, p.max_videos_per_category, p.max_screenshots_per_user, p.storage_quota_mb, p.ai_summary_enabled, p.features
    INTO user_plan_record
    FROM public.plans p
    WHERE p.name = 'Free Plan'
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT 
    user_plan_record.name,
    user_plan_record.max_categories,
    user_plan_record.max_videos_per_category,
    user_plan_record.max_screenshots_per_user,
    user_plan_record.storage_quota_mb,
    user_plan_record.ai_summary_enabled,
    (SELECT COUNT(*)::INTEGER FROM public.categories WHERE user_id = user_uuid),
    user_plan_record.features;
END;
$function$;