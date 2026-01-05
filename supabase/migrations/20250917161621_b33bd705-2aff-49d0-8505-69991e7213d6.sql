-- Remove admin overrides for viewing data - ensure all users only see their own categories and videos

-- Drop existing admin policies that allow viewing/accessing other users' data
DROP POLICY IF EXISTS "Admins can view all videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can delete any video" ON public.videos;
DROP POLICY IF EXISTS "Admins can delete any category" ON public.categories;

-- Keep only user-specific policies for strict data isolation
-- Categories: Users can only access their own categories
-- Videos: Users can only access their own videos

-- Note: This ensures complete data isolation where each user can only see/manage their own data
-- regardless of their role or authority level