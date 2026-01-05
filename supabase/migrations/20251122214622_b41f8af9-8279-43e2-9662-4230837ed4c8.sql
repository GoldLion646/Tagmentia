-- Add platform column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add an index for platform queries
CREATE INDEX IF NOT EXISTS idx_videos_platform ON videos(platform);

-- Add a comment
COMMENT ON COLUMN videos.platform IS 'Video platform (youtube, tiktok, instagram, snapchat, etc.)';