-- Add last_login_at column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance when filtering by last login
CREATE INDEX idx_profiles_last_login_at ON public.profiles(last_login_at);

-- Create function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET last_login_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update last login on auth events
-- Note: This would ideally be on auth.sessions, but we'll need to handle it in the application