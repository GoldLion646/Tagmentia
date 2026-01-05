-- Add transcript field to video_summaries table
ALTER TABLE public.video_summaries 
ADD COLUMN transcript TEXT;