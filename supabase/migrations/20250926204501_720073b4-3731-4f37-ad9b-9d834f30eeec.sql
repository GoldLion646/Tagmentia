-- Create a new table for storing text configuration settings
CREATE TABLE IF NOT EXISTS public.config_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL DEFAULT '',
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on config_settings
ALTER TABLE public.config_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config settings
CREATE POLICY "Admins can manage config settings"
ON public.config_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert Google OAuth configuration settings
INSERT INTO public.config_settings (setting_key, setting_value, description) VALUES
('google_oauth_client_id', '', 'Google OAuth Client ID'),
('google_oauth_client_secret', '', 'Google OAuth Client Secret')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert Google OAuth enabled setting into system_settings (boolean table)
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('google_oauth_enabled', false, 'Enable/disable Google OAuth authentication')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to get Google OAuth settings for admin use
CREATE OR REPLACE FUNCTION public.get_google_oauth_settings()
RETURNS TABLE(client_id text, client_secret text, enabled boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'google_oauth_client_id'), '') as client_id,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'google_oauth_client_secret'), '') as client_secret,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'google_oauth_enabled'), false) as enabled;
END;
$$;

-- Create function to update Google OAuth settings (admin only)
CREATE OR REPLACE FUNCTION public.update_google_oauth_settings(
  p_client_id text,
  p_client_secret text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Log the admin action
  PERFORM public.log_security_event(
    'admin_action',
    auth.uid(),
    jsonb_build_object(
      'action', 'update_google_oauth_settings',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert the text settings
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES 
    ('google_oauth_client_id', p_client_id, 'Google OAuth Client ID'),
    ('google_oauth_client_secret', p_client_secret, 'Google OAuth Client Secret')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  -- Update or insert the boolean setting
  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('google_oauth_enabled', p_enabled, 'Enable/disable Google OAuth authentication')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$$;

-- Add trigger for updated_at on config_settings
CREATE TRIGGER update_config_settings_updated_at
  BEFORE UPDATE ON public.config_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();