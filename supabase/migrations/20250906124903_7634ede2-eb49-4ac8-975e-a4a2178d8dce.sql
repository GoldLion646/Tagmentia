-- Fix Security Definer View Issues - Remove SECURITY DEFINER and make views regular views

-- Drop and recreate public_plans view without SECURITY DEFINER
DROP VIEW IF EXISTS public.public_plans;
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

-- Drop and recreate public_branding view without SECURITY DEFINER  
DROP VIEW IF EXISTS public.public_branding;
CREATE VIEW public.public_branding AS
SELECT 
  logo_url,
  favicon_url
FROM public.branding_settings 
LIMIT 1;

-- Add RLS policies to views to make them accessible to public without authentication
-- Note: Views inherit the RLS policies of their underlying tables
-- So we need to grant specific access to these views

-- Enable RLS on the views
-- Note: PostgreSQL views don't support RLS directly, so we'll create functions instead

-- Create a function to get public plans data
CREATE OR REPLACE FUNCTION public.get_public_plans()
RETURNS TABLE(
  id uuid,
  name text,
  price_monthly numeric,
  price_yearly numeric,
  max_categories integer,
  max_videos_per_category integer,
  ai_summary_enabled boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.price_monthly,
    p.price_yearly,
    p.max_categories,
    p.max_videos_per_category,
    p.ai_summary_enabled
  FROM public.plans p
  WHERE p.enabled = true;
END;
$$;

-- Create a function to get public branding data
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(
  logo_url text,
  favicon_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.logo_url,
    b.favicon_url
  FROM public.branding_settings b
  LIMIT 1;
END;
$$;