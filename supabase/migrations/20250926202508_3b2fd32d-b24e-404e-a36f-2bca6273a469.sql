-- Allow public read access to branding settings so all users can see uploaded logos
-- while keeping admin-only write access for security

-- Create a policy that allows anyone (including unauthenticated users) to read branding settings
CREATE POLICY "Anyone can view branding settings"
ON public.branding_settings
FOR SELECT
USING (true);

-- Update the get_public_branding function to be SECURITY DEFINER for better performance
CREATE OR REPLACE FUNCTION public.get_public_branding()
RETURNS TABLE(logo_url text, favicon_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT b.logo_url, b.favicon_url
  FROM public.branding_settings b
  ORDER BY b.created_at DESC
  LIMIT 1;
END;
$$;