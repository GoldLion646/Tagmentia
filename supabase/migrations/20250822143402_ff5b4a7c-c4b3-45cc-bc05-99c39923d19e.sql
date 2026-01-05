-- 1) Backfill any missing profiles for existing auth users
INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, mobile)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data ->> 'first_name', NULL),
       COALESCE(u.raw_user_meta_data ->> 'last_name', NULL),
       COALESCE(u.raw_user_meta_data ->> 'avatar_url', NULL),
       COALESCE(u.raw_user_meta_data ->> 'mobile', NULL)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2) Create a delete handler to keep profiles in sync when an auth user is removed
CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- 3) Ensure signup trigger exists to auto-insert/merge profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Ensure deletion trigger exists to remove profile on account deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
AFTER DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
