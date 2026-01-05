-- Security Enhancement Phase 1: Restrict Public Data Access (Fixed)

-- Update Plans Table RLS Policy - Restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view enabled plans" ON public.plans;
CREATE POLICY "Authenticated users can view enabled plans" 
ON public.plans 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND enabled = true);

-- Create a public view for marketing/pricing page if needed (limited data)
CREATE OR REPLACE VIEW public.public_plans AS
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

-- Update Branding Settings RLS Policy - Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view branding settings" ON public.branding_settings;
CREATE POLICY "Authenticated users can view branding settings" 
ON public.branding_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create a public view for branding (logos only) for unauthenticated users
CREATE OR REPLACE VIEW public.public_branding AS
SELECT 
  logo_url,
  favicon_url
FROM public.branding_settings 
LIMIT 1;