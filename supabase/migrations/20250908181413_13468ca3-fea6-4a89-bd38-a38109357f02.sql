-- Security fixes implementation - Harden branding exposure and secure broadcasts  
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

-- 2) Drop and recreate the function with whitelisted fields
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

-- 3) Create a stable view that PostgREST can expose without touching the table directly
DROP VIEW IF EXISTS public.public_branding;
CREATE VIEW public.public_branding AS
SELECT * FROM public.get_public_branding();

-- 4) Grant access to the view for API roles (no RLS on views)
GRANT SELECT ON public.public_branding TO anon, authenticated;

-- 5) Secure broadcasts by restricting public access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active broadcasts" ON public.broadcasts;

CREATE POLICY "Authenticated users can view active broadcasts" 
ON public.broadcasts 
FOR SELECT 
TO authenticated
USING (active = true);

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
    'action', 'security_hardening_implemented',
    'changes', jsonb_build_array(
      'removed_public_branding_access',
      'created_safe_branding_view',
      'restricted_broadcasts_to_authenticated'
    ),
    'timestamp', extract(epoch from now())
  ),
  'high'
);