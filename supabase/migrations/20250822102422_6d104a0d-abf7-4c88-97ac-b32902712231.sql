-- Update the handle_new_user function to include mobile data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, mobile)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'mobile', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    first_name = COALESCE(NEW.raw_user_meta_data ->> 'first_name', profiles.first_name),
    last_name = COALESCE(NEW.raw_user_meta_data ->> 'last_name', profiles.last_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', profiles.avatar_url),
    mobile = COALESCE(NEW.raw_user_meta_data ->> 'mobile', profiles.mobile);
  RETURN NEW;
END;
$$;