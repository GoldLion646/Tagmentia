-- Expose a safe, read-only function to fetch specific public system settings
-- The function is SECURITY DEFINER to bypass RLS but restricts allowed keys
CREATE OR REPLACE FUNCTION public.get_system_setting_bool(_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result boolean;
BEGIN
  -- Whitelist only the keys we want to expose publicly
  IF _key NOT IN ('enable_new_user_registration') THEN
    RETURN false; -- default to false if key isn't allowed
  END IF;

  SELECT setting_value INTO result
  FROM public.system_settings
  WHERE setting_key = _key
  LIMIT 1;

  RETURN COALESCE(result, false);
END;
$$;
