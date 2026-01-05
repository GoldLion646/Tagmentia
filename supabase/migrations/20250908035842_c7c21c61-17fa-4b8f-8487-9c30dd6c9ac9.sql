-- Security fixes implementation

-- 1. Update plans table RLS policies to restrict access to authenticated users only
-- First, drop the existing public read policy
DROP POLICY IF EXISTS "Enable public read access for plans" ON public.plans;

-- Create new policy requiring authentication for plans access
CREATE POLICY "Authenticated users can view enabled plans" 
ON public.plans 
FOR SELECT 
TO authenticated
USING (enabled = true);

-- 2. Enable leaked password protection in system settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'enable_leaked_password_protection',
  true,
  'Reject passwords found in known data breach databases'
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = true,
  updated_at = now();

-- 3. Add additional security settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES 
  ('enforce_strong_passwords', true, 'Require strong password complexity'),
  ('enable_account_lockout', true, 'Lock accounts after multiple failed login attempts'),
  ('session_timeout_hours', true, 'Enable automatic session timeout')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

-- 4. Create a public function for unauthenticated access to limited plan data
CREATE OR REPLACE FUNCTION public.get_public_pricing()
RETURNS TABLE(
  id uuid,
  name text,
  price_monthly numeric,
  price_yearly numeric,
  display_features jsonb
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
    CASE 
      WHEN p.features ? 'display_features' THEN p.features->'display_features'
      ELSE '[]'::jsonb
    END as display_features
  FROM public.plans p
  WHERE p.enabled = true;
END;
$$;

-- 5. Log security configuration changes
INSERT INTO public.security_audit_log (
  event_type,
  user_id,
  details,
  severity
) VALUES (
  'security_configuration_update',
  auth.uid(),
  jsonb_build_object(
    'action', 'security_policies_hardened',
    'changes', jsonb_build_array(
      'restricted_plans_access_to_authenticated_users',
      'enabled_leaked_password_protection',
      'added_security_hardening_settings',
      'created_public_pricing_function'
    ),
    'timestamp', extract(epoch from now())
  ),
  'high'
);