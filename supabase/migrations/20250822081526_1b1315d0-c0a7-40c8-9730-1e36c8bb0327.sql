-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';

-- Create enum for app roles (for better type safety)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Update the role column to use the enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE app_role USING role::app_role;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(role, 'user'::app_role)
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Update RLS policies for profiles table
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new RLS policies with role-based access
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin'::app_role);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'admin'::app_role);

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.get_current_user_role() = 'admin'::app_role);

-- Assign admin role to the first user (you can change this later)
UPDATE public.profiles 
SET role = 'admin'::app_role 
WHERE id = (
  SELECT id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);