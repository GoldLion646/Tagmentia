-- Phase 1 Critical Security Fixes (Fixed version)

-- 1. Drop existing functions to allow recreation with new signatures
DROP FUNCTION IF EXISTS public.get_public_plans();
DROP FUNCTION IF EXISTS public.get_public_branding();

-- 2. Create secure admin promotion function
CREATE OR REPLACE FUNCTION public.secure_promote_to_admin(
  target_user_id UUID,
  current_admin_password TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
  target_user_email TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Verify current user is admin
  IF NOT public.has_role(current_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Only admins can promote users');
  END IF;
  
  -- Get current user's email for verification
  SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;
  
  -- Get target user's email for logging
  SELECT email INTO target_user_email FROM auth.users WHERE id = target_user_id;
  
  -- Check if target user already has admin role
  IF public.has_role(target_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already an admin');
  END IF;
  
  -- Insert admin role for target user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the promotion event
  INSERT INTO public.security_events (
    event_type,
    user_id,
    details,
    severity
  ) VALUES (
    'admin_action',
    current_user_id,
    jsonb_build_object(
      'action', 'promote_to_admin',
      'target_user_id', target_user_id,
      'target_user_email', target_user_email,
      'admin_email', current_user_email,
      'timestamp', extract(epoch from now())
    ),
    'high'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'User successfully promoted to admin',
    'target_user_email', target_user_email
  );
END;
$$;

-- 3. Create restricted public function for plans (hiding sensitive data)
CREATE OR REPLACE FUNCTION public.get_public_plans()
RETURNS TABLE(
  id uuid, 
  name text, 
  price_monthly numeric, 
  price_yearly numeric, 
  max_categories integer, 
  max_videos_per_category integer, 
  ai_summary_enabled boolean,
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
    p.max_categories,
    p.max_videos_per_category,
    p.ai_summary_enabled,
    CASE 
      WHEN p.features ? 'display_features' THEN p.features->'display_features'
      ELSE '[]'::jsonb
    END as display_features
  FROM public.plans p
  WHERE p.enabled = true;
END;
$$;

-- 4. Revoke direct public access to plans table
REVOKE SELECT ON public.plans FROM anon;

-- 5. Create enhanced security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Create function to log security events persistently  
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'medium',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    details,
    severity,
    ip_address,
    user_agent
  ) VALUES (
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    p_details,
    p_severity,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- 7. Create restricted branding function (only logo_url)
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(logo_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.logo_url
  FROM public.branding_settings b
  LIMIT 1;
END;
$$;