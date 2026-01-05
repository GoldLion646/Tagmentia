-- Fix security definer view issue by recreating the public_branding view
-- to directly query the table instead of using a function
DROP VIEW IF EXISTS public.public_branding;

-- Create a simple view that directly queries the table instead of using a function
CREATE VIEW public.public_branding AS
SELECT logo_url, favicon_url
FROM public.branding_settings
ORDER BY created_at DESC
LIMIT 1;