-- Add mobile column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile text;