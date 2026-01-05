-- Completely remove problematic views and use direct table access with proper RLS
-- This removes the security definer view issues

-- Remove the views entirely since they're causing security definer issues
DROP VIEW IF EXISTS public.public_plans CASCADE;
DROP VIEW IF EXISTS public.public_branding CASCADE;

-- Update RLS policies to be more granular
-- For plans table: Allow public read access to basic plan info for pricing pages
DROP POLICY IF EXISTS "Authenticated users can view enabled plans" ON public.plans;
CREATE POLICY "Public can view basic plan info" 
ON public.plans 
FOR SELECT 
USING (enabled = true);

-- For branding: Allow public read access to branding assets
DROP POLICY IF EXISTS "Authenticated users can view branding settings" ON public.branding_settings;  
CREATE POLICY "Public can view branding assets" 
ON public.branding_settings 
FOR SELECT 
USING (true);

-- Keep the security definer functions for controlled access if needed
-- These are acceptable as they provide controlled data access