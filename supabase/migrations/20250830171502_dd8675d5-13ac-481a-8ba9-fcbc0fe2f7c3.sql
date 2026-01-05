-- Create broadcasts table for admin messaging system
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')) DEFAULT 'info',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Create policies for broadcasts
CREATE POLICY "Anyone can view active broadcasts" 
ON public.broadcasts 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage all broadcasts" 
ON public.broadcasts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_broadcasts_updated_at
BEFORE UPDATE ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();