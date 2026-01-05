-- Add missing columns to video_summaries table to match specification
ALTER TABLE public.video_summaries 
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'youtube',
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Create enum for status
DO $$ BEGIN
    CREATE TYPE video_summary_status AS ENUM ('queued', 'processing', 'ready', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Handle status column conversion properly
-- First update any existing statuses to valid enum values
UPDATE public.video_summaries 
SET status = 'ready' 
WHERE status = 'completed';

-- Create a new column with enum type
ALTER TABLE public.video_summaries 
ADD COLUMN status_new video_summary_status DEFAULT 'queued';

-- Copy existing status values to new column
UPDATE public.video_summaries 
SET status_new = CASE 
    WHEN status = 'queued' THEN 'queued'::video_summary_status
    WHEN status = 'processing' THEN 'processing'::video_summary_status
    WHEN status = 'ready' THEN 'ready'::video_summary_status
    WHEN status = 'completed' THEN 'ready'::video_summary_status
    WHEN status = 'failed' THEN 'failed'::video_summary_status
    ELSE 'queued'::video_summary_status
END;

-- Drop old column and rename new one
ALTER TABLE public.video_summaries DROP COLUMN status;
ALTER TABLE public.video_summaries RENAME COLUMN status_new TO status;

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
    ALTER TABLE public.video_summaries 
    ADD CONSTRAINT fk_video_summaries_video_id 
    FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_summaries_user_id ON public.video_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_video_summaries_video_id ON public.video_summaries(video_id);
CREATE INDEX IF NOT EXISTS idx_video_summaries_status ON public.video_summaries(status);
CREATE INDEX IF NOT EXISTS idx_video_summaries_platform ON public.video_summaries(platform);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_video_summaries_updated_at ON public.video_summaries;
CREATE TRIGGER update_video_summaries_updated_at
    BEFORE UPDATE ON public.video_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();