-- Add is_archived field to videos table
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for is_archived to optimize queries
CREATE INDEX IF NOT EXISTS idx_videos_is_archived ON public.videos(is_archived);

-- Create index for category_id and is_archived for efficient category queries
CREATE INDEX IF NOT EXISTS idx_videos_category_archived ON public.videos(category_id, is_archived);

