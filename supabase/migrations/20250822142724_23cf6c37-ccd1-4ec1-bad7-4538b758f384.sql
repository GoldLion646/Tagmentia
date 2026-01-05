-- Delete all profiles except admins (based on roles in public.user_roles)
-- Safe: keeps any user with role 'admin'
DELETE FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'admin'::app_role
);
