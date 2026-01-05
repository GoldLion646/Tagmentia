-- Add ai_summary field to videos table
ALTER TABLE public.videos 
ADD COLUMN ai_summary TEXT;

-- Add index for better performance when checking for existing summaries
CREATE INDEX idx_videos_ai_summary ON public.videos(ai_summary) WHERE ai_summary IS NOT NULL;