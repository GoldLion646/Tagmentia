-- Remove the old cron job first
SELECT cron.unschedule('check-video-reminders');

-- Create the new cron job with direct project URLs
SELECT cron.schedule(
  'check-video-reminders-v2',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://vgsavnlyathtlvrevtjb.supabase.co/functions/v1/check-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnc2F2bmx5YXRodGx2cmV2dGpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ2MjUzMywiZXhwIjoyMDcxMDM4NTMzfQ.V5t8VJpgZbKvE0MEu6oF-miKgEwgEeex_bCRHaUGF9Q"}',
    body := '{}'::jsonb
  );
  $$
);