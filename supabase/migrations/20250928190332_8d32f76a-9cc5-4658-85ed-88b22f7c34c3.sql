-- Add transcript field to videos table
ALTER TABLE public.videos 
ADD COLUMN transcript TEXT;