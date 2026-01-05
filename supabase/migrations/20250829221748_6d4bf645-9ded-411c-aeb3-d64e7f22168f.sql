-- Add admin policy to view all videos for dashboard statistics
CREATE POLICY "Admins can view all videos" 
ON public.videos 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));