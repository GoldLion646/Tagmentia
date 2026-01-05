-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- duration in seconds
  category_id UUID,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample videos for demo
INSERT INTO public.videos (user_id, title, description, url, thumbnail_url, duration, tags) VALUES
-- For demo user (this will be populated later when user is created)
('00000000-0000-0000-0000-000000000000', 'Getting Started with AI Tools', 'A comprehensive guide to using AI tools effectively in your workflow', 'https://example.com/video1', 'https://picsum.photos/300/200?random=1', 1200, ARRAY['AI', 'Tutorial', 'Productivity']),
('00000000-0000-0000-0000-000000000000', 'Advanced Fitness Techniques', 'Learn advanced workout techniques for better results', 'https://example.com/video2', 'https://picsum.photos/300/200?random=2', 1800, ARRAY['Fitness', 'Health', 'Exercise']),
('00000000-0000-0000-0000-000000000000', 'Cooking Masterclass: Italian Cuisine', 'Master the art of Italian cooking with professional techniques', 'https://example.com/video3', 'https://picsum.photos/300/200?random=3', 2400, ARRAY['Cooking', 'Italian', 'Recipe']);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Users can view their own categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" 
ON public.categories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" 
ON public.categories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for categories timestamps
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraint for videos.category_id
ALTER TABLE public.videos 
ADD CONSTRAINT videos_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;