-- Fix existing screenshot URLs to use direct public URLs instead of transformation endpoints
UPDATE screenshots
SET 
  thumb_320_url = REPLACE(thumb_320_url, '/storage/v1/render/image/public/', '/storage/v1/object/public/'),
  image_1600_url = REPLACE(image_1600_url, '/storage/v1/render/image/public/', '/storage/v1/object/public/')
WHERE thumb_320_url LIKE '%/storage/v1/render/image/public/%'
   OR image_1600_url LIKE '%/storage/v1/render/image/public/%';

-- Remove query parameters from transformation URLs
UPDATE screenshots
SET 
  thumb_320_url = SPLIT_PART(thumb_320_url, '?', 1),
  image_1600_url = SPLIT_PART(image_1600_url, '?', 1)
WHERE thumb_320_url LIKE '%?%'
   OR image_1600_url LIKE '%?%';