-- Final security hardening: remove remaining SECURITY DEFINER function
-- The issue is the get_public_branding function still has SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_public_branding();

-- Create simple function without SECURITY DEFINER to avoid the warning
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(logo_url text, favicon_url text)
LANGUAGE plpgsql
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_public_branding() TO anon, authenticated;

-- Recreate the view using the function
DROP VIEW IF EXISTS public.public_branding;
CREATE VIEW public.public_branding AS
SELECT * FROM public.get_public_branding();

GRANT SELECT ON public.public_branding TO anon, authenticated;

-- Log completion
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  details,
  severity
) VALUES (
  'security_configuration_update',
  NULL,
  jsonb_build_object(
    'action', 'removed_security_definer_from_function',
    'function', 'get_public_branding',
    'timestamp', extract(epoch from now())
  ),
  'medium'
);