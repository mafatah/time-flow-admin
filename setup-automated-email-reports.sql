
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs for email reports
SELECT cron.unschedule('daily-email-reports');
SELECT cron.unschedule('weekly-email-reports');

-- Create daily email reports cron job (runs at 7 PM every day)
SELECT cron.schedule(
  'daily-email-reports',
  '0 19 * * *', -- Every day at 7 PM (19:00)
  $$
  SELECT
    net.http_post(
        url := '[SET_SUPABASE_URL]/functions/v1/email-reports/send-daily-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SET_SERVICE_ROLE_KEY]"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create weekly email reports cron job (runs every Monday at 9 AM)
SELECT cron.schedule(
  'weekly-email-reports',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT
    net.http_post(
        url := '[SET_SUPABASE_URL]/functions/v1/email-reports/send-weekly-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SET_SERVICE_ROLE_KEY]"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Insert default report types if they don't exist
INSERT INTO report_types (name, description, template_type, is_active) 
VALUES 
  ('Daily Work Summary', 'Comprehensive daily team performance report', 'daily', true),
  ('Weekly Performance Report', 'Weekly achievements, badges, and productivity analysis', 'weekly', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default report configurations if they don't exist
INSERT INTO report_configurations (name, subject_template, schedule_cron, schedule_description, include_summary, include_employee_details, include_alerts, include_projects, is_active)
VALUES 
  ('Daily Work Summary for Ebdaadt', 'Daily Work Summary for Ebdaadt - {date}', '0 19 * * *', 'Daily at 7 PM', true, true, true, true, true),
  ('Weekly Performance Report for Ebdaadt', 'Weekly Performance Report for Ebdaadt - {start_date} to {end_date}', '0 9 * * 1', 'Weekly on Monday at 9 AM', true, true, false, true, true)
ON CONFLICT (name) DO NOTHING;

-- Insert admin users as report recipients (assuming admin users exist)
INSERT INTO report_recipients (report_config_id, email, user_id, is_active)
SELECT 
  rc.id as report_config_id,
  u.email,
  u.id as user_id,
  true as is_active
FROM report_configurations rc
CROSS JOIN users u
WHERE u.role = 'admin' 
  AND NOT EXISTS (
    SELECT 1 FROM report_recipients rr 
    WHERE rr.report_config_id = rc.id 
    AND rr.user_id = u.id
  );

-- Check existing cron jobs
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%email%';

-- Verify the setup
SELECT 'Automated email reports have been configured!' as status,
       'Daily reports will be sent at 7 PM every day' as daily_schedule,
       'Weekly reports will be sent every Monday at 9 AM' as weekly_schedule;
