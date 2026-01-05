-- Drop the unsafe public_branding view that bypasses RLS policies
DROP VIEW IF EXISTS public.public_branding;

-- The get_public_branding() function already exists and provides safe access to branding data
-- This function has proper security controls and doesn't bypass RLS policies

-- Create a comment to document why the view was removed
COMMENT ON FUNCTION public.get_public_branding() IS 'Safe access to public branding data. Replaces the removed public_branding view which had security definer issues.';