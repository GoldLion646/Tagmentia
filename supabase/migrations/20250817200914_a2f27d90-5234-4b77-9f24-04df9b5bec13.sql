-- Create demo user and sample data
-- First create demo user in auth.users (this will be handled by Supabase Auth)
-- But let's create the profile and sample data

-- Insert demo user profile (we'll use a fixed UUID for demo user)
INSERT INTO public.profiles (user_id, display_name, avatar_url) 
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Demo User', null)
ON CONFLICT (user_id) DO NOTHING;

-- Create demo categories
INSERT INTO public.categories (id, user_id, name, description, color) VALUES
('11111111-1111-1111-1111-111111111111'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Learning', 'Educational videos and tutorials', '#10B981'),
('22222222-2222-2222-2222-222222222222'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Entertainment', 'Fun and entertaining content', '#F59E0B'),
('33333333-3333-3333-3333-333333333333'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Fitness', 'Workout and health related videos', '#EF4444')
ON CONFLICT (id) DO NOTHING;

-- Create demo videos
INSERT INTO public.videos (user_id, category_id, title, url, thumbnail_url, platform, duration, notes, tags, is_watched) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'React Hooks Explained', 'https://www.youtube.com/watch?v=O6P86uwfdR0', 'https://img.youtube.com/vi/O6P86uwfdR0/mqdefault.jpg', 'youtube', 1200, 'Great explanation of useState and useEffect hooks', ARRAY['react', 'hooks', 'javascript'], false),
('00000000-0000-0000-0000-000000000001'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'Funny Cat Compilation', 'https://www.youtube.com/watch?v=hFZFjoX2cGg', 'https://img.youtube.com/vi/hFZFjoX2cGg/mqdefault.jpg', 'youtube', 300, 'Hilarious cats doing silly things', ARRAY['cats', 'funny', 'pets'], true),
('00000000-0000-0000-0000-000000000001'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, '10 Minute Morning Workout', 'https://www.youtube.com/watch?v=UBMk30rjy0o', 'https://img.youtube.com/vi/UBMk30rjy0o/mqdefault.jpg', 'youtube', 600, 'Perfect morning routine to start the day', ARRAY['workout', 'morning', 'fitness'], false);

-- Create demo notes
INSERT INTO public.notes (user_id, category_id, title, content, tags) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'JavaScript Best Practices', 'Key takeaways:\n- Always use const/let instead of var\n- Use arrow functions for cleaner syntax\n- Implement error handling with try/catch', ARRAY['javascript', 'best-practices', 'coding']),
('00000000-0000-0000-0000-000000000001'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'Workout Schedule', 'Weekly plan:\n- Monday: Upper body\n- Tuesday: Cardio\n- Wednesday: Lower body\n- Thursday: Rest\n- Friday: Full body\n- Weekend: Light activities', ARRAY['fitness', 'schedule', 'workout-plan']);