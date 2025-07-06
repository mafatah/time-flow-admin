-- ============================================================================
-- EMAIL REPORTS SYSTEM COMPREHENSIVE FIX
-- ============================================================================
-- This script will fix all common issues with the email reports system
-- Run this in your Supabase SQL Editor

-- Step 1: Enable required extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create all required tables
-- ============================================================================

-- Table to store different report types
CREATE TABLE IF NOT EXISTS public.report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store report configurations 
CREATE TABLE IF NOT EXISTS public.report_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type_id UUID REFERENCES report_types(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  schedule_cron VARCHAR(100), -- Cron expression for scheduling
  schedule_description VARCHAR(200), -- Human readable schedule
  is_active BOOLEAN DEFAULT true,
  
  -- Email settings
  subject_template TEXT NOT NULL,
  include_summary BOOLEAN DEFAULT true,
  include_employee_details BOOLEAN DEFAULT true,
  include_alerts BOOLEAN DEFAULT true,
  include_projects BOOLEAN DEFAULT true,
  
  -- Alert thresholds (JSON)
  alert_settings JSONB DEFAULT '{}',
  
  -- Filters (JSON) - which employees, projects, etc.
  filters JSONB DEFAULT '{}',
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store admin users who should receive reports
CREATE TABLE IF NOT EXISTS public.report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configurations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_config_id, user_id)
);

-- Table to track sent reports
CREATE TABLE IF NOT EXISTS public.report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configurations(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'sent', -- 'sent', 'failed', 'test'
  error_message TEXT,
  email_service_id VARCHAR(100), -- ID from email service (like Resend)
  
  -- Store the actual data that was sent (for debugging)
  report_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_report_configurations_active ON report_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_report_recipients_active ON report_recipients(is_active);
CREATE INDEX IF NOT EXISTS idx_report_history_sent_at ON report_history(sent_at);

-- Step 4: Insert default report types
-- ============================================================================
INSERT INTO public.report_types (name, description, template_type, is_active) 
VALUES 
  ('Daily Performance', 'Daily team performance summary with hours, activity, and alerts', 'daily', true),
  ('Weekly Summary', 'Weekly team performance overview with patterns and trends', 'weekly', true),
  ('Monthly Review', 'Monthly comprehensive team analysis', 'monthly', true),
  ('Alert Report', 'Immediate alerts for critical issues', 'custom', true)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  template_type = EXCLUDED.template_type,
  is_active = EXCLUDED.is_active;

-- Step 5: Create default report configurations
-- ============================================================================
DO $$
DECLARE
    daily_type_id UUID;
    weekly_type_id UUID;
    daily_config_id UUID;
    weekly_config_id UUID;
BEGIN
    -- Get report type IDs
    SELECT id INTO daily_type_id FROM public.report_types WHERE name = 'Daily Performance';
    SELECT id INTO weekly_type_id FROM public.report_types WHERE name = 'Weekly Summary';
    
    -- Insert or update daily report config
    INSERT INTO public.report_configurations (
        report_type_id, 
        name, 
        description, 
        schedule_cron, 
        schedule_description,
        subject_template,
        include_summary,
        include_employee_details,
        include_alerts,
        include_projects,
        is_active,
        alert_settings
    ) VALUES (
        daily_type_id,
        'Daily Team Performance Report',
        'Automated daily report sent to all admins at 7 PM',
        '0 19 * * *',
        'Every day at 7:00 PM',
        '📅 Daily Team Performance Summary – {date}',
        true,
        true,
        true,
        true,
        true,
        '{"idle_threshold": 15, "late_start_threshold": 180, "toggle_threshold": 10}'
    ) ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        schedule_cron = EXCLUDED.schedule_cron,
        schedule_description = EXCLUDED.schedule_description,
        subject_template = EXCLUDED.subject_template,
        is_active = EXCLUDED.is_active,
        alert_settings = EXCLUDED.alert_settings
    RETURNING id INTO daily_config_id;
    
    -- Insert or update weekly report config
    INSERT INTO public.report_configurations (
        report_type_id, 
        name, 
        description, 
        schedule_cron, 
        schedule_description,
        subject_template,
        include_summary,
        include_employee_details,
        include_alerts,
        include_projects,
        is_active,
        alert_settings
    ) VALUES (
        weekly_type_id,
        'Weekly Team Summary Report', 
        'Automated weekly report sent to all admins on Sunday at 9 AM',
        '0 9 * * 0',
        'Every Sunday at 9:00 AM',
        '📊 Weekly Performance Summary – {start_date} to {end_date}',
        true,
        true,
        false,
        true,
        true,
        '{"low_productivity_days": 3, "low_productivity_threshold": 30}'
    ) ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        schedule_cron = EXCLUDED.schedule_cron,
        schedule_description = EXCLUDED.schedule_description,
        subject_template = EXCLUDED.subject_template,
        is_active = EXCLUDED.is_active,
        alert_settings = EXCLUDED.alert_settings
    RETURNING id INTO weekly_config_id;
    
    RAISE NOTICE 'Report configurations created/updated successfully';
END $$;

-- Step 6: Set up admin users as recipients
-- ============================================================================
INSERT INTO public.report_recipients (report_config_id, email, user_id, is_active)
SELECT DISTINCT
    rc.id as report_config_id,
    u.email,
    u.id as user_id,
    true as is_active
FROM public.report_configurations rc
CROSS JOIN public.users u
WHERE u.role IN ('admin', 'manager') 
  AND u.email IS NOT NULL 
  AND u.email != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.report_recipients rr 
    WHERE rr.report_config_id = rc.id 
    AND rr.user_id = u.id
  );

-- Step 7: Clean up old cron jobs and create new ones
-- ============================================================================
-- Remove any existing email report cron jobs
SELECT cron.unschedule('daily-email-reports');
SELECT cron.unschedule('weekly-email-reports');
SELECT cron.unschedule('send-daily-report');
SELECT cron.unschedule('send-weekly-report');

-- Get the current Supabase URL (you'll need to replace this with your actual URL)
-- You can find this in your Supabase dashboard under Settings > API
DO $$
DECLARE
    supabase_url TEXT := 'https://your-project-id.supabase.co'; -- ⚠️ REPLACE WITH YOUR ACTUAL SUPABASE URL
    service_key TEXT := 'your-service-role-key'; -- ⚠️ REPLACE WITH YOUR ACTUAL SERVICE ROLE KEY
BEGIN
    -- Create daily email reports cron job (runs at 7 PM every day)
    PERFORM cron.schedule(
        'daily-email-reports',
        '0 19 * * *', -- Every day at 7 PM (19:00)
        format('
        SELECT
            net.http_post(
                url := %L,
                headers := %L::jsonb,
                body := %L::jsonb
            ) as request_id;
        ', 
        supabase_url || '/functions/v1/email-reports/send-daily-report',
        '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_key || '"}',
        '{"automated": true}'
        )
    );

    -- Create weekly email reports cron job (runs every Sunday at 9 AM)
    PERFORM cron.schedule(
        'weekly-email-reports',
        '0 9 * * 0', -- Every Sunday at 9 AM
        format('
        SELECT
            net.http_post(
                url := %L,
                headers := %L::jsonb,
                body := %L::jsonb
            ) as request_id;
        ', 
        supabase_url || '/functions/v1/email-reports/send-weekly-report',
        '{"Content-Type": "application/json", "Authorization": "Bearer ' || service_key || '"}',
        '{"automated": true}'
        )
    );
    
    RAISE NOTICE 'Cron jobs created successfully';
    RAISE NOTICE 'Daily reports will be sent at 7 PM every day';
    RAISE NOTICE 'Weekly reports will be sent every Sunday at 9 AM';
END $$;

-- Step 8: Create RLS policies for security
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE public.report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

-- Create policies for admins to manage everything
DO $$
BEGIN
    -- Policy for report_types
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'report_types' 
        AND policyname = 'Admin can manage report types'
    ) THEN
        CREATE POLICY "Admin can manage report types" ON public.report_types
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;

    -- Policy for report_configurations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'report_configurations' 
        AND policyname = 'Admin can manage report configurations'
    ) THEN
        CREATE POLICY "Admin can manage report configurations" ON public.report_configurations
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;

    -- Policy for report_recipients
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'report_recipients' 
        AND policyname = 'Admin can manage report recipients'
    ) THEN
        CREATE POLICY "Admin can manage report recipients" ON public.report_recipients
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;

    -- Policy for report_history
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'report_history' 
        AND policyname = 'Admin can view report history'
    ) THEN
        CREATE POLICY "Admin can view report history" ON public.report_history
        FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        );
    END IF;
END $$;

-- Step 9: Final verification and summary
-- ============================================================================
SELECT 
    '✅ EMAIL REPORTS SYSTEM SETUP COMPLETE' as status,
    'The following has been configured:' as details
UNION ALL
SELECT 
    '📋 Tables Created:', 
    CONCAT(
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('report_types', 'report_configurations', 'report_recipients', 'report_history'))::text,
        ' of 4 tables'
    )
UNION ALL
SELECT 
    '🎯 Report Types:', 
    CONCAT((SELECT COUNT(*) FROM public.report_types)::text, ' types available')
UNION ALL
SELECT 
    '⚙️ Configurations:', 
    CONCAT((SELECT COUNT(*) FROM public.report_configurations WHERE is_active = true)::text, ' active configurations')
UNION ALL
SELECT 
    '👥 Admin Recipients:', 
    CONCAT((SELECT COUNT(*) FROM public.report_recipients WHERE is_active = true)::text, ' recipients configured')
UNION ALL
SELECT 
    '⏰ Cron Jobs:', 
    CONCAT((SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%email%')::text, ' scheduled jobs')
UNION ALL
SELECT 
    '🔒 Security:', 
    'RLS policies enabled for all tables'
UNION ALL
SELECT 
    '',
    '⚠️ IMPORTANT: You still need to:'
UNION ALL
SELECT 
    '1.', 
    'Replace the Supabase URL and service key in the cron jobs above'
UNION ALL
SELECT 
    '2.', 
    'Configure RESEND_API_KEY in Supabase Edge Functions environment'
UNION ALL
SELECT 
    '3.', 
    'Test the email system using the admin interface'
UNION ALL
SELECT 
    '4.', 
    'Verify that admin users exist and have valid email addresses';

-- Show current cron jobs
SELECT 
    '=== CURRENT CRON JOBS ===' as section,
    '' as details
UNION ALL
SELECT 
    jobname,
    schedule
FROM cron.job 
WHERE jobname LIKE '%email%'
ORDER BY jobname; 