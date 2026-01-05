-- Update existing screenshot videos that don't have a thumbnail_url
-- Use the first screenshot's thumb_320_url or original_url as the video thumbnail
UPDATE videos v
SET thumbnail_url = (
  SELECT COALESCE(s.thumb_320_url, s.original_url)
  FROM screenshots s
  WHERE s.video_id = v.id
  ORDER BY s.created_at ASC
  LIMIT 1
)
WHERE v.thumbnail_url IS NULL
  AND v.title LIKE 'Screenshots -%'
  AND EXISTS (
    SELECT 1 FROM screenshots s WHERE s.video_id = v.id
  );