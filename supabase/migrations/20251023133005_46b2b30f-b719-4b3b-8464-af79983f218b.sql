-- Make screenshots bucket public so users can access their uploaded images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'screenshots';