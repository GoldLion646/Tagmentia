-- Harden branding exposure by replacing public table access with a safe view
-- 1) Drop public SELECT policy on branding_settings if exists
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

-- 2) Ensure RLS remains for branding_settings (admins already have ALL policy)
--    No additional changes needed; table stays protected by admin-only policy

-- 3) Replace get_public_branding with a safer variant exposing only whitelisted fields
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

-- 4) Create a stable view that PostgREST can expose without touching the table directly
CREATE OR REPLACE VIEW public.public_branding AS
SELECT * FROM public.get_public_branding();

-- 5) Grant access to the view for API roles (no RLS on views)
GRANT SELECT ON public.public_branding TO anon, authenticated;

-- 6) Audit log for configuration changes
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  details,
  severity
) VALUES (
  'security_configuration_update',
  NULL,
  jsonb_build_object(
    'action', 'branding_table_public_read_removed',
    'created_view', 'public_branding',
    'function', 'get_public_branding',
    'timestamp', extract(epoch from now())
  ),
  'medium'
);