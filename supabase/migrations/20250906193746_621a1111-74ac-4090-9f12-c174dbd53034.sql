-- Final cleanup to remove all views and ensure secure access

-- 1. Drop all public views that might be causing security definer warnings
DROP VIEW IF EXISTS public.public_plans CASCADE;
DROP VIEW IF EXISTS public.public_branding CASCADE;

-- 2. Ensure we don't have any other problematic views
DROP VIEW IF EXISTS public.public_plans_safe CASCADE;
DROP VIEW IF EXISTS public.public_branding_safe CASCADE;

-- 3. Verify our RPC functions are working correctly and grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_safe_branding() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_safe_plans() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_branding() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_plans() TO anon, authenticated;

-- 4. Create a function to test security event logging
CREATE OR REPLACE FUNCTION public.test_security_logging()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Test that our security logging works
  PERFORM public.log_security_event(
    'system_test',
    auth.uid(),
    jsonb_build_object(
      'test_type', 'security_function_test',
      'timestamp', extract(epoch from now())
    ),
    'low'
  );
  
  RETURN 'Security logging test completed successfully';
END;
$$;

-- Grant execution to authenticated users only (not anon)
GRANT EXECUTE ON FUNCTION public.test_security_logging() TO authenticated;