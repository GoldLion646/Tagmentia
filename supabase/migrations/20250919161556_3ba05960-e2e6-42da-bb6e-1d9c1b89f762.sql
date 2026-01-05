-- Fix security definer view issue by updating get_public_branding function
-- to explicitly use SECURITY INVOKER instead of relying on defaults
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(logo_url text, favicon_url text)
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT b.logo_url, b.favicon_url
  FROM public.branding_settings b
  ORDER BY b.created_at DESC
  LIMIT 1;
END;
$function$;