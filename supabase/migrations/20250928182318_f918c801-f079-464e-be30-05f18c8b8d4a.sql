-- Create functions for OpenAI settings management
CREATE OR REPLACE FUNCTION public.get_openai_settings()
RETURNS TABLE(api_key text, enabled boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE((SELECT setting_value FROM public.config_settings WHERE setting_key = 'openai_api_key'), '') as api_key,
    COALESCE((SELECT setting_value FROM public.system_settings WHERE setting_key = 'openai_enabled'), false) as enabled;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_openai_settings(p_api_key text, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'action', 'update_openai_settings',
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );

  -- Update or insert the API key
  INSERT INTO public.config_settings (setting_key, setting_value, description)
  VALUES ('openai_api_key', p_api_key, 'OpenAI API Key for AI features')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();

  -- Update or insert the enabled setting
  INSERT INTO public.system_settings (setting_key, setting_value, description)
  VALUES ('openai_enabled', p_enabled, 'Enable/disable OpenAI integration')
  ON CONFLICT (setting_key) 
  DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
END;
$function$;