-- Add screenshot limits to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_screenshots_per_user integer DEFAULT 0;

-- Update existing plans with screenshot limits
UPDATE public.plans 
SET max_screenshots_per_user = CASE 
  WHEN name = 'Free Plan' THEN 5
  WHEN name = 'Premium Plan' THEN 100
  WHEN name = 'Gold Plan' THEN -1  -- -1 represents unlimited
  ELSE 0
END;

-- Create screenshots table
CREATE TABLE IF NOT EXISTS public.screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  image_1600_url text,
  thumb_320_url text,
  size_bytes integer NOT NULL,
  format text NOT NULL,
  note text,
  -- Future AI fields (nullable, not implemented yet)
  ocr_text text,
  labels jsonb,
  ai_status text DEFAULT 'none',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenshots_user_created ON public.screenshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_video_created ON public.screenshots(video_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_category_created ON public.screenshots(category_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screenshots
CREATE POLICY "Users can view their own screenshots"
  ON public.screenshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own screenshots"
  ON public.screenshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screenshots"
  ON public.screenshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshots"
  ON public.screenshots FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false,  -- Private bucket, use signed URLs
  5242880,  -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for screenshots bucket
CREATE POLICY "Users can upload their own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'screenshots' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to get user screenshot limits
CREATE OR REPLACE FUNCTION public.get_user_screenshot_limits(user_uuid uuid)
RETURNS TABLE(
  max_screenshots integer,
  current_screenshots integer,
  can_upload boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_limits RECORD;
  current_count integer;
BEGIN
  -- Get user plan limits
  SELECT * INTO user_plan_limits FROM public.get_user_plan_limits(user_uuid);
  
  -- Get current screenshot count
  SELECT COUNT(*)::integer INTO current_count
  FROM public.screenshots
  WHERE user_id = user_uuid;
  
  -- Check if user is admin (unlimited)
  IF public.has_role(user_uuid, 'admin'::app_role) THEN
    RETURN QUERY SELECT -1, current_count, true;
    RETURN;
  END IF;
  
  -- Get max screenshots from plan
  SELECT p.max_screenshots_per_user INTO user_plan_limits
  FROM public.user_subscriptions us
  JOIN public.plans p ON us.plan_id = p.id
  WHERE us.user_id = user_uuid 
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no active subscription, use Free Plan
  IF user_plan_limits.max_screenshots_per_user IS NULL THEN
    SELECT p.max_screenshots_per_user INTO user_plan_limits
    FROM public.plans p
    WHERE p.name = 'Free Plan'
    LIMIT 1;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    COALESCE(user_plan_limits.max_screenshots_per_user, 5),
    current_count,
    CASE 
      WHEN COALESCE(user_plan_limits.max_screenshots_per_user, 5) = -1 THEN true
      ELSE current_count < COALESCE(user_plan_limits.max_screenshots_per_user, 5)
    END;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_screenshots_updated_at
  BEFORE UPDATE ON public.screenshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();