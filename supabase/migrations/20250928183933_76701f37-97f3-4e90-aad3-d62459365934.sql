-- Create function to get total categories count for admin dashboard
CREATE OR REPLACE FUNCTION public.get_total_categories_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  categories_count bigint;
BEGIN
  -- Only allow admin access
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Count all categories across all users
  SELECT COUNT(*) INTO categories_count
  FROM public.categories;
  
  RETURN categories_count;
END;
$function$;