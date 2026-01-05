-- Fix policy conflicts and remove problematic views

-- Remove the views entirely since they're causing security definer issues
DROP VIEW IF EXISTS public.public_plans CASCADE;
DROP VIEW IF EXISTS public.public_branding CASCADE;

-- Remove existing policies first, then create new ones
DROP POLICY IF EXISTS "Authenticated users can view enabled plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view basic plan info" ON public.plans;
DROP POLICY IF EXISTS "Anyone can view enabled plans" ON public.plans;

-- Create new policy for plans with unique name
CREATE POLICY "Enable public read access for plans" 
ON public.plans 
FOR SELECT 
USING (enabled = true);

-- Remove existing policies for branding first, then create new ones  
DROP POLICY IF EXISTS "Authenticated users can view branding settings" ON public.branding_settings;
DROP POLICY IF EXISTS "Public can view branding assets" ON public.branding_settings;
DROP POLICY IF EXISTS "Anyone can view branding settings" ON public.branding_settings;

-- Create new policy for branding with unique name
CREATE POLICY "Enable public read access for branding" 
ON public.branding_settings 
FOR SELECT 
USING (true);