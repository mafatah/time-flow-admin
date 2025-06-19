
-- Update the weekly report configuration to end on Thursday instead of Monday
UPDATE report_configurations 
SET 
  schedule_cron = '0 19 * * 4',  -- Thursday at 7 PM (day 4 of week)
  schedule_description = 'Weekly on Thursday at 7 PM'
WHERE name = 'Weekly Performance Report for Ebdaadt';

-- Update the cron job to match the new schedule
SELECT cron.unschedule('weekly-email-reports');

SELECT cron.schedule(
  'weekly-email-reports',
  '0 19 * * 4', -- Every Thursday at 7 PM
  $$
  SELECT
    net.http_post(
        url := 'https://fkpiqcxkmrtaetvfgcli.supabase.co/functions/v1/email-reports/send-weekly-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTgxNzU3NSwiZXhwIjoyMDQ1MzkzNTc1fQ.vgzKVWKfxYlDfHhSV9Fn8DMQXW3BXD6UZR-4A3pJ5DQ"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Verify the updated configuration
SELECT 
  name,
  schedule_cron,
  schedule_description
FROM report_configurations 
WHERE name LIKE '%Weekly%';

-- Check the updated cron jobs
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%email%';
