-- Create video_summaries table for AI-generated video summaries
CREATE TABLE public.video_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  tldr TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  timestamps JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  suggested_tags JSONB DEFAULT '[]'::jsonb,
  transcript_source TEXT CHECK (transcript_source IN ('youtube_api', 'user_provided', 'unavailable')),
  transcript_hash TEXT,
  model_name TEXT,
  prompt_version TEXT,
  cost_cents INTEGER DEFAULT 0,
  runtime_ms INTEGER,
  error_message TEXT,
  regeneration_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Enable RLS
ALTER TABLE public.video_summaries ENABLE ROW LEVEL SECURITY;

-- Users can view their own summaries
CREATE POLICY "Users can view own summaries" ON public.video_summaries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create summaries for their own videos
CREATE POLICY "Users can create summaries for own videos" ON public.video_summaries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.videos WHERE id = video_id AND user_id = auth.uid())
  );

-- Users can update their own summaries
CREATE POLICY "Users can update own summaries" ON public.video_summaries
  FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all summaries
CREATE POLICY "Admins can view all summaries" ON public.video_summaries
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_video_summaries_video_user ON public.video_summaries(video_id, user_id);
CREATE INDEX idx_video_summaries_status ON public.video_summaries(status);

-- Create trigger for updated_at
CREATE TRIGGER update_video_summaries_updated_at
  BEFORE UPDATE ON public.video_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();