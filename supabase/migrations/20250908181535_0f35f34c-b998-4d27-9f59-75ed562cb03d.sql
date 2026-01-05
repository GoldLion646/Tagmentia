-- Fix ordering for branding hardening migration
-- 1) Drop dependent view first, then replace function, then re-create view
DROP VIEW IF EXISTS public.public_branding;

DROP FUNCTION IF EXISTS public.get_public_branding();

CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(logo_url text, favicon_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.logo_url, b.favicon_url
  FROM public.branding_settings b
  ORDER BY b.created_at DESC
  LIMIT 1;
END;
$$;

CREATE VIEW public.public_branding AS
SELECT * FROM public.get_public_branding();

GRANT SELECT ON public.public_branding TO anon, authenticated;