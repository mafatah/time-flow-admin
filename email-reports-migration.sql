-- Email Reports System Migration
-- Run this SQL script in your Supabase SQL Editor

-- Email Reports Configuration System
-- This allows admins to dynamically configure what reports to send and when

-- Table to store different report types
CREATE TABLE IF NOT EXISTS report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  template_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store report configurations 
CREATE TABLE IF NOT EXISTS report_configurations (
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
CREATE TABLE IF NOT EXISTS report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_config_id UUID REFERENCES report_configurations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_config_id, user_id)
);

-- Table to track sent reports
CREATE TABLE IF NOT EXISTS report_history (
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

-- Insert default report types (only if they don't exist)
INSERT INTO report_types (name, description, template_type) 
SELECT 'Daily Performance', 'Daily team performance summary with hours, activity, and alerts', 'daily'
WHERE NOT EXISTS (SELECT 1 FROM report_types WHERE name = 'Daily Performance');

INSERT INTO report_types (name, description, template_type) 
SELECT 'Weekly Summary', 'Weekly team performance overview with patterns and trends', 'weekly'
WHERE NOT EXISTS (SELECT 1 FROM report_types WHERE name = 'Weekly Summary');

INSERT INTO report_types (name, description, template_type) 
SELECT 'Monthly Review', 'Monthly comprehensive team analysis', 'monthly'
WHERE NOT EXISTS (SELECT 1 FROM report_types WHERE name = 'Monthly Review');

INSERT INTO report_types (name, description, template_type) 
SELECT 'Alert Report', 'Immediate alerts for critical issues', 'custom'
WHERE NOT EXISTS (SELECT 1 FROM report_types WHERE name = 'Alert Report');

-- Insert default configurations (only if daily report doesn't exist)
DO $$
DECLARE
    daily_type_id UUID;
    weekly_type_id UUID;
BEGIN
    -- Get report type IDs
    SELECT id INTO daily_type_id FROM report_types WHERE name = 'Daily Performance';
    SELECT id INTO weekly_type_id FROM report_types WHERE name = 'Weekly Summary';
    
    -- Insert daily report config if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM report_configurations WHERE name = 'Daily Team Performance Report') THEN
        INSERT INTO report_configurations (
            report_type_id, 
            name, 
            description, 
            schedule_cron, 
            schedule_description,
            subject_template,
            alert_settings
        ) VALUES (
            daily_type_id,
            'Daily Team Performance Report',
            'Automated daily report sent to all admins at 7 PM',
            '0 19 * * *',
            'Every day at 7:00 PM',
            '📅 Daily Team Performance Summary – {date}',
            '{"idle_threshold": 15, "late_start_threshold": 180, "toggle_threshold": 10}'
        );
    END IF;
    
    -- Insert weekly report config if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM report_configurations WHERE name = 'Weekly Team Summary Report') THEN
        INSERT INTO report_configurations (
            report_type_id, 
            name, 
            description, 
            schedule_cron, 
            schedule_description,
            subject_template,
            alert_settings
        ) VALUES (
            weekly_type_id,
            'Weekly Team Summary Report', 
            'Automated weekly report sent to all admins on Monday at 9 AM',
            '0 9 * * 1',
            'Every Monday at 9:00 AM',
            '📊 Weekly Performance Summary – {start_date} to {end_date}',
            '{"low_productivity_days": 3, "low_productivity_threshold": 30}'
        );
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_configurations_active ON report_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_report_recipients_config ON report_recipients(report_config_id);
CREATE INDEX IF NOT EXISTS idx_report_history_config_date ON report_history(report_config_id, sent_at);

-- Add updated_at trigger function (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS '
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        ' language 'plpgsql';
    END IF;
END $$;

-- Add triggers (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_types_updated_at') THEN
        CREATE TRIGGER update_report_types_updated_at 
        BEFORE UPDATE ON report_types 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_configurations_updated_at') THEN
        CREATE TRIGGER update_report_configurations_updated_at 
        BEFORE UPDATE ON report_configurations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Grant permissions to authenticated users (admin role)
GRANT SELECT, INSERT, UPDATE, DELETE ON report_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_recipients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON report_history TO authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE report_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
DO $$
BEGIN
    -- Report Types policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_types' AND policyname = 'Admin users can manage report types') THEN
        CREATE POLICY "Admin users can manage report types" ON report_types
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    
    -- Report Configurations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_configurations' AND policyname = 'Admin users can manage report configurations') THEN
        CREATE POLICY "Admin users can manage report configurations" ON report_configurations
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    
    -- Report Recipients policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_recipients' AND policyname = 'Admin users can manage report recipients') THEN
        CREATE POLICY "Admin users can manage report recipients" ON report_recipients
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
    
    -- Report History policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'report_history' AND policyname = 'Admin users can view report history') THEN
        CREATE POLICY "Admin users can view report history" ON report_history
        FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

-- Display success message
SELECT 'Email Reports System migration completed successfully! 🎉' as message;

-- Show created tables
SELECT 'Created tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('report_types', 'report_configurations', 'report_recipients', 'report_history')
ORDER BY table_name; 