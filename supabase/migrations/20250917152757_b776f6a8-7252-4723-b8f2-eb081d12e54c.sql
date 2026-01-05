-- Create a cron job to check for due reminders every 5 minutes
SELECT cron.schedule(
  'check-video-reminders',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.base_url') || '/functions/v1/check-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{}'::jsonb
  );
  $$
);

-- Set the configuration for the cron job (these need to be set by admin)
-- Note: The actual values will need to be configured in your Supabase project settings
-- ALTER DATABASE postgres SET app.base_url = 'https://your-project-ref.supabase.co';
-- ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';