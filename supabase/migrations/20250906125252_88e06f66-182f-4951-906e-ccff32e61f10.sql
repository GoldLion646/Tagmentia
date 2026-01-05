-- Security Enhancement: Fix Security Definer Views (Corrected)

-- Drop existing views
DROP VIEW IF EXISTS public.public_plans;
DROP VIEW IF EXISTS public.public_branding;

-- Create simple views without SECURITY DEFINER (they default to SECURITY INVOKER)
CREATE VIEW public.public_plans AS
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

CREATE VIEW public.public_branding AS
SELECT 
  logo_url,
  favicon_url
FROM public.branding_settings 
LIMIT 1;

-- Grant SELECT permissions on these views to anon and authenticated users
GRANT SELECT ON public.public_plans TO anon, authenticated;
GRANT SELECT ON public.public_branding TO anon, authenticated;