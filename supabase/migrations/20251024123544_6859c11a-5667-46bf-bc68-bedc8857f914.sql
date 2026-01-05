-- Clean up old branding entries, keep only the most recent one
DO $$
DECLARE
  latest_id UUID;
BEGIN
  -- Get the ID of the most recent branding entry
  SELECT id INTO latest_id
  FROM public.branding_settings
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Delete all entries except the most recent
  DELETE FROM public.branding_settings
  WHERE id != latest_id;
END $$;