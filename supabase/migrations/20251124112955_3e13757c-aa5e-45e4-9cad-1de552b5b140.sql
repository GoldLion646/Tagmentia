-- Add metadata status tracking and thumbnail fields to videos table
ALTER TABLE public.videos
ADD COLUMN IF NOT EXISTS meta_status text DEFAULT 'pending_meta' CHECK (meta_status IN ('pending_meta', 'ready', 'failed_meta')),
ADD COLUMN IF NOT EXISTS meta_error text,
ADD COLUMN IF NOT EXISTS thumbnail_160_url text,
ADD COLUMN IF NOT EXISTS thumbnail_320_url text,
ADD COLUMN IF NOT EXISTS thumbnail_640_url text,
ADD COLUMN IF NOT EXISTS thumbnail_source text CHECK (thumbnail_source IN ('direct', 'oembed', 'og', 'none')),
ADD COLUMN IF NOT EXISTS thumbnail_last_checked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS creator text,
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Create index for meta_status to optimize queries
CREATE INDEX IF NOT EXISTS idx_videos_meta_status ON public.videos(meta_status);

-- Update existing videos to have 'ready' status if they have thumbnails
UPDATE public.videos 
SET meta_status = 'ready'
WHERE thumbnail_url IS NOT NULL AND meta_status = 'pending_meta';