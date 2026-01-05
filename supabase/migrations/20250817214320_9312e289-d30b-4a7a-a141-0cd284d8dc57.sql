-- Add reminder_date column to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMP WITH TIME ZONE;