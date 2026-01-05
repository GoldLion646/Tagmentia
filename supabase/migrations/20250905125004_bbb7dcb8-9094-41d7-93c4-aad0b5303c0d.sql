-- Create branding_settings table for proper logo configuration storage
CREATE TABLE IF NOT EXISTS public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  favicon_url text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on branding_settings
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read branding settings (public logo)
CREATE POLICY "Anyone can view branding settings"
  ON public.branding_settings
  FOR SELECT
  USING (true);

-- Only admins can modify branding settings
CREATE POLICY "Admins can manage branding settings"
  ON public.branding_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial branding configuration if it doesn't exist
INSERT INTO public.branding_settings (logo_url, favicon_url)
SELECT 
  'https://vgsavnlyathtlvrevtjb.supabase.co/storage/v1/object/public/branding/global/branding/logo-1757073702696.png',
  'https://vgsavnlyathtlvrevtjb.supabase.co/storage/v1/object/public/branding/global/branding/favicon-1757073713450.png'
WHERE NOT EXISTS (SELECT 1 FROM public.branding_settings);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();