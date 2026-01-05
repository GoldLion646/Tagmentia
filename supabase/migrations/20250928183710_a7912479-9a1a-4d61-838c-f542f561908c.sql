-- Create function to get total videos count for admin dashboard
CREATE OR REPLACE FUNCTION public.get_total_videos_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  video_count bigint;
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Count all videos across all users
  SELECT COUNT(*) INTO video_count
  FROM public.videos;
  
  RETURN video_count;
END;
$function$;