-- Function to clear rate limits for a specific identifier (email)
CREATE OR REPLACE FUNCTION public.clear_rate_limits(p_identifier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Delete rate limit records for the identifier
  DELETE FROM public.security_audit_log
  WHERE event_type = 'rate_limit_exceeded'
    AND details->>'identifier' = p_identifier;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the admin action
  PERFORM public.log_security_event(
    'admin_action',
    auth.uid(),
    jsonb_build_object(
      'action', 'clear_rate_limits',
      'identifier', p_identifier,
      'records_cleared', deleted_count,
      'timestamp', extract(epoch from now())
    ),
    'medium'
  );
  
  RETURN deleted_count;
END;
$$;