-- Fixed Automated Email Reports Setup
-- This file sets up daily and weekly email reports using Supabase cron jobs

-- First, let's check if we have the necessary environment variables
-- You need to replace these with your actual values:
-- SUPABASE_URL: Your Supabase project URL (e.g., https://your-project.supabase.co)
-- SUPABASE_SERVICE_ROLE_KEY: Your service role key from Supabase Dashboard

-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs for email reports
SELECT cron.unschedule('daily-email-reports');
SELECT cron.unschedule('weekly-email-reports');

-- Create the report-related tables if they don't exist
CREATE TABLE IF NOT EXISTS report_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_configurations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    subject_template VARCHAR(500) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL,
    schedule_description VARCHAR(255),
    include_summary BOOLEAN DEFAULT true,
    include_employee_details BOOLEAN DEFAULT true,
    include_alerts BOOLEAN DEFAULT true,
    include_projects BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_recipients (
    id SERIAL PRIMARY KEY,
    report_config_id INTEGER REFERENCES report_configurations(id),
    email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- ⚠️ IMPORTANT: Replace the following placeholders with your actual values:
-- Replace YOUR_SUPABASE_URL with your actual Supabase URL
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key

-- Create daily email reports cron job (runs at 7 PM every day)
-- BEFORE RUNNING: Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with actual values
SELECT cron.schedule(
  'daily-email-reports',
  '0 19 * * *', -- Every day at 7 PM (19:00)
  $$
  SELECT
    net.http_post(
        url := 'YOUR_SUPABASE_URL/functions/v1/email-reports/send-daily-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create weekly email reports cron job (runs every Monday at 9 AM)
-- BEFORE RUNNING: Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with actual values
SELECT cron.schedule(
  'weekly-email-reports',
  '0 9 * * 1', -- Every Monday at 9 AM
  $$
  SELECT
    net.http_post(
        url := 'YOUR_SUPABASE_URL/functions/v1/email-reports/send-weekly-report',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body := '{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Check existing cron jobs
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE '%email%';

-- Verify admin users exist
SELECT 
  COUNT(*) as admin_count,
  STRING_AGG(email, ', ') as admin_emails
FROM users 
WHERE role = 'admin';

-- Verify the setup
SELECT 
  'Email reports setup completed!' as status,
  'Remember to replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with actual values' as warning,
  'Daily reports will be sent at 7 PM every day' as daily_schedule,
  'Weekly reports will be sent every Monday at 9 AM' as weekly_schedule;