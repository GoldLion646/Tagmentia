-- Update get_stripe_configuration to allow service role access
CREATE OR REPLACE FUNCTION public.get_stripe_configuration()
RETURNS TABLE(secret_key text, publishable_key text, enabled boolean, webhook_secret text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow admin users OR service role (edge functions)
  -- Service role is identified by auth.uid() being NULL in SECURITY DEFINER context
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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