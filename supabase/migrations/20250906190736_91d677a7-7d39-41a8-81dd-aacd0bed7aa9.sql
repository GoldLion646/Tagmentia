-- Ensure cascading delete from categories -> videos
DO $$ BEGIN
  -- Drop existing FK if present
  ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_category_id_fkey;
EXCEPTION WHEN undefined_object THEN
  -- ignore
END $$;

-- Recreate FK with ON DELETE CASCADE
ALTER TABLE public.videos
  ADD CONSTRAINT videos_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.categories(id)
  ON DELETE CASCADE;
