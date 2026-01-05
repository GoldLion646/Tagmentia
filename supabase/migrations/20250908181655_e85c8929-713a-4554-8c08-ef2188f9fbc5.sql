-- Remove SECURITY DEFINER warning and complete security hardening
-- 1) Drop the SECURITY DEFINER view 
DROP VIEW IF EXISTS public.public_branding;

-- 2) Create normal view (without SECURITY DEFINER which causes the warning)
CREATE VIEW public.public_branding AS
SELECT logo_url, favicon_url
FROM public.branding_settings
ORDER BY created_at DESC
LIMIT 1;

-- 3) Grant access to the view for API roles
GRANT SELECT ON public.public_branding TO anon, authenticated;

-- 4) Ensure branding_settings public policy is removed
DROP POLICY IF EXISTS "Enable public read access for branding" ON public.branding_settings;

-- 5) Check if broadcast policy exists and create if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'broadcasts' 
      AND policyname = 'Authenticated users can view active broadcasts'
  ) THEN
    -- Only create if it doesn't exist
    EXECUTE 'CREATE POLICY "Authenticated users can view active broadcasts" ON public.broadcasts FOR SELECT TO authenticated USING (active = true)';
  END IF;
END $$;

-- 6) Remove the public broadcast policy if it exists
DROP POLICY IF EXISTS "Anyone can view active broadcasts" ON public.broadcasts;

-- 7) Log the security hardening completion
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  details,
  severity
) VALUES (
  'security_configuration_update',
  NULL,
  jsonb_build_object(
    'action', 'security_hardening_completed',
    'changes', jsonb_build_array(
      'removed_security_definer_from_branding_view',
      'secured_branding_table_access',
      'ensured_broadcasts_restricted_to_authenticated'
    ),
    'timestamp', extract(epoch from now())
  ),
  'high'
);