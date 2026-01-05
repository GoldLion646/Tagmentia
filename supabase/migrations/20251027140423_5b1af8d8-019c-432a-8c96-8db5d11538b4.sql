-- Create waitlist table for Gold plan email collection
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_email_key UNIQUE (email)
);

-- Enable Row Level Security
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (public signup)
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Create policy for admins to view all waitlist entries
CREATE POLICY "Admins can view waitlist"
ON public.waitlist
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Create index for plan filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_plan ON public.waitlist(plan);