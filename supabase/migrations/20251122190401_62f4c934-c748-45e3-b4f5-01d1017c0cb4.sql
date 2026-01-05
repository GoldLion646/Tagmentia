-- Create video-thumbnails storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-thumbnails',
  'video-thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Allow authenticated users to upload thumbnails (admin only through edge functions)
CREATE POLICY "Service role can upload video thumbnails"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'video-thumbnails');

-- Storage policy: Allow public read access to thumbnails
CREATE POLICY "Public can view video thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-thumbnails');

-- Storage policy: Service role can update thumbnails
CREATE POLICY "Service role can update video thumbnails"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'video-thumbnails');

-- Storage policy: Service role can delete thumbnails
CREATE POLICY "Service role can delete video thumbnails"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'video-thumbnails');