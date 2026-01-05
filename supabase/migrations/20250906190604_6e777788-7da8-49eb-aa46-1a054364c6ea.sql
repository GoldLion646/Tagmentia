-- Add foreign key constraint with cascade delete for videos -> categories
ALTER TABLE public.videos 
ADD CONSTRAINT videos_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE CASCADE;