-- Create RPC functions for Stripe configuration
CREATE OR REPLACE FUNCTION public.get_stripe_configuration()
RETURNS TABLE(
  secret_key text,
  publishable_key text,
  enabled boolean,
  webhook_secret text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'stripe_secret_key'), '') as secret_key,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'stripe_publishable_key'), '') as publishable_key,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'stripe_enabled'), false) as enabled,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'stripe_webhook_secret'), '') as webhook_secret;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_stripe_configuration(
  p_secret_key text,
  p_publishable_key text,
  p_enabled boolean,
  p_webhook_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      'action', 'update_stripe_configuration',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert settings
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES 
    ('stripe_secret_key', p_secret_key, 'Stripe Secret Key'),
    ('stripe_publishable_key', p_publishable_key, 'Stripe Publishable Key'),
    ('stripe_webhook_secret', p_webhook_secret, 'Stripe Webhook Secret')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('stripe_enabled', p_enabled, 'Enable/disable Stripe payment integration')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$function$;

-- Create RPC functions for Push Notification (VAPID) configuration
CREATE OR REPLACE FUNCTION public.get_push_notification_settings()
RETURNS TABLE(
  vapid_public_key text,
  vapid_private_key text,
  enabled boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'vapid_public_key'), '') as vapid_public_key,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'vapid_private_key'), '') as vapid_private_key,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'push_notifications_enabled'), false) as enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_push_notification_settings(
  p_vapid_public_key text,
  p_vapid_private_key text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      'action', 'update_push_notification_settings',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert settings
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES 
    ('vapid_public_key', p_vapid_public_key, 'VAPID Public Key for Push Notifications'),
    ('vapid_private_key', p_vapid_private_key, 'VAPID Private Key for Push Notifications')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('push_notifications_enabled', p_enabled, 'Enable/disable push notifications')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$function$;

-- Create RPC functions for Twilio configuration
CREATE OR REPLACE FUNCTION public.get_twilio_settings()
RETURNS TABLE(
  account_sid text,
  auth_token text,
  phone_number text,
  enabled boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'twilio_account_sid'), '') as account_sid,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'twilio_auth_token'), '') as auth_token,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'twilio_phone_number'), '') as phone_number,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'twilio_enabled'), false) as enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_twilio_settings(
  p_account_sid text,
  p_auth_token text,
  p_phone_number text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      'action', 'update_twilio_settings',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert settings
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES 
    ('twilio_account_sid', p_account_sid, 'Twilio Account SID'),
    ('twilio_auth_token', p_auth_token, 'Twilio Auth Token'),
    ('twilio_phone_number', p_phone_number, 'Twilio Phone Number')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('twilio_enabled', p_enabled, 'Enable/disable Twilio integration')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$function$;

-- Create RPC functions for Resend configuration
CREATE OR REPLACE FUNCTION public.get_resend_settings()
RETURNS TABLE(
  api_key text,
  from_domain text,
  enabled boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'resend_api_key'), '') as api_key,
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'resend_from_domain'), 'noreply@yourdomain.com') as from_domain,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'resend_enabled'), false) as enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_resend_settings(
  p_api_key text,
  p_from_domain text,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      'action', 'update_resend_settings',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert settings
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES 
    ('resend_api_key', p_api_key, 'Resend API Key'),
    ('resend_from_domain', p_from_domain, 'Resend From Domain')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('resend_enabled', p_enabled, 'Enable/disable Resend email integration')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$function$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_stripe_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_stripe_configuration(text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_notification_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_push_notification_settings(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_twilio_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_twilio_settings(text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_resend_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_resend_settings(text, text, boolean) TO authenticated;