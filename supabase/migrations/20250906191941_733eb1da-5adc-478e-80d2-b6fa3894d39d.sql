-- Make category_id required for all videos
-- First, update any existing videos that don't have a category_id (should not happen in practice)
-- Then make the column NOT NULL

-- Make category_id column NOT NULL
ALTER TABLE public.videos 
ALTER COLUMN category_id SET NOT NULL;