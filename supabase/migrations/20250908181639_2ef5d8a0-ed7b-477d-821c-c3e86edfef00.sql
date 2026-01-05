-- Remove SECURITY DEFINER from view and secure broadcasts
-- 1) Drop the view with SECURITY DEFINER
DROP VIEW IF EXISTS public.public_branding;

-- 2) Create normal view (without SECURITY DEFINER which is causing the warning)
CREATE VIEW public.public_branding AS
SELECT logo_url, favicon_url
FROM public.branding_settings
ORDER BY created_at DESC
LIMIT 1;

-- 3) Grant access to the view for API roles
GRANT SELECT ON public.public_branding TO anon, authenticated;

-- 4) Remove public policy from branding_settings (should already be done but ensure)
DROP POLICY IF EXISTS "Enable public read access for branding" ON public.branding_settings;

-- 5) Secure broadcasts by restricting public access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active broadcasts" ON public.broadcasts;

CREATE POLICY "Authenticated users can view active broadcasts" 
ON public.broadcasts 
FOR SELECT 
TO authenticated
USING (active = true);

-- 6) Log security hardening
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
      'restricted_broadcasts_to_authenticated_users'
    ),
    'timestamp', extract(epoch from now())
  ),
  'high'
);