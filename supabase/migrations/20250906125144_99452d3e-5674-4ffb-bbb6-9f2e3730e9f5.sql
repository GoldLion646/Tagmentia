-- Security Enhancement: Fix Security Definer Views

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.public_plans;
CREATE VIEW public.public_plans 
SECURITY INVOKER  -- Use invoker's permissions instead
AS
SELECT 
  id,
  name,
  price_monthly,
  price_yearly,
  max_categories,
  max_videos_per_category,
  ai_summary_enabled
FROM public.plans 
WHERE enabled = true;

DROP VIEW IF EXISTS public.public_branding;
CREATE VIEW public.public_branding 
SECURITY INVOKER  -- Use invoker's permissions instead
AS
SELECT 
  logo_url,
  favicon_url
FROM public.branding_settings 
LIMIT 1;

-- Grant SELECT permissions on these views to anon and authenticated users
GRANT SELECT ON public.public_plans TO anon, authenticated;
GRANT SELECT ON public.public_branding TO anon, authenticated;