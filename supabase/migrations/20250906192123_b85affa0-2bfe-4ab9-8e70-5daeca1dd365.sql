-- Backfill and enforce that all videos belong to a category

-- 1) Create an "Ungrouped" category per user that has uncategorized videos (if not already present)
WITH users_to_create AS (
  SELECT DISTINCT v.user_id
  FROM public.videos v
  WHERE v.category_id IS NULL
)
INSERT INTO public.categories (user_id, name, description, color)
SELECT u.user_id, 'Ungrouped', 'Auto-created for uncategorized videos', '#3B82F6'
FROM users_to_create u
LEFT JOIN public.categories c ON c.user_id = u.user_id AND c.name = 'Ungrouped'
WHERE c.id IS NULL;

-- 2) Assign uncategorized videos to the auto-created category
UPDATE public.videos v
SET category_id = c.id
FROM public.categories c
WHERE v.category_id IS NULL AND c.user_id = v.user_id AND c.name = 'Ungrouped';

-- 3) Enforce NOT NULL at the database level
ALTER TABLE public.videos 
ALTER COLUMN category_id SET NOT NULL;