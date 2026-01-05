-- Harden database security by removing public access to sensitive tables
-- (Fixes the SQL syntax error from previous migration)

-- 1. Drop public SELECT policy on branding_settings if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'branding_settings' 
      AND policyname = 'Enable public read access for branding'
  ) THEN
    EXECUTE 'DROP POLICY "Enable public read access for branding" ON public.branding_settings';
  END IF;
END $$;

-- 2. Create safe function for public branding access
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

-- 3. Create view for stable API access
CREATE OR REPLACE VIEW public.public_branding AS
SELECT * FROM public.get_public_branding();

-- 4. Grant access to the view for API roles
GRANT SELECT ON public.public_branding TO anon, authenticated;

-- 5. Log security configuration changes (FIXED: Use INSERT instead of PERFORM)
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  details,
  severity
) VALUES (
  'security_configuration_update',
  NULL,
  jsonb_build_object(
    'action', 'branding_table_hardened',
    'changes', jsonb_build_array(
      'removed_public_access_to_branding_settings',
      'created_safe_public_branding_view'
    ),
    'timestamp', extract(epoch from now())
  ),
  'medium'
);