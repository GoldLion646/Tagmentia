-- Add unique constraint on video_id for video_summaries table
-- This is needed for the upsert operations in the AI summarize function
ALTER TABLE public.video_summaries 
ADD CONSTRAINT unique_video_summaries_video_id UNIQUE (video_id);