-- Assign admin role to bnohra@disinnova.com and revoke from Carole Nohra
-- Idempotent operations: safe to run multiple times

-- 1) Grant admin to bnohra@disinnova.com
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::public.app_role
FROM public.profiles p
WHERE p.email = 'bnohra@disinnova.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) Revoke admin from Carole Nohra (identified by email)
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role = 'admin'::public.app_role
  AND p.email = 'khoury_coco@hotmail.com';