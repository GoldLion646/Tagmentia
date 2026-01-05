-- Create system settings table
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - only admins can manage system settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('enable_new_user_registration', true, 'Allow new users to create accounts on the platform'),
('activate_maintenance_mode', false, 'Temporarily disable public access for system updates'),
('receive_system_notifications', true, 'Get email alerts for critical system events'),
('public_analytics_dashboard', false, 'Make key performance indicators publicly accessible'),
('require_strong_passwords', true, 'Enforce complex password policies for all user accounts'),
('automated_security_audits', true, 'Schedule regular security scans and vulnerability checks');

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();