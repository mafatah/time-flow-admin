-- ============================================================================
-- RESEND API KEY CONFIGURATION
-- ============================================================================
-- This script will help you configure the Resend API key for email reports
-- Your API key: [GET FROM RESEND DASHBOARD - https://resend.com/api-keys]

-- Step 1: First, make sure you have the fix script applied
-- If you haven't run fix-email-reports-system.sql yet, do that first!

-- Step 2: Update the cron jobs with your actual Supabase URL and service key
-- Replace these values with your actual Supabase project details:
-- 
-- SUPABASE_URL: Find this in Supabase Dashboard → Settings → API → Project URL
-- SERVICE_KEY: Find this in Supabase Dashboard → Settings → API → Service Role Key

-- Remove existing cron jobs first
SELECT cron.unschedule('daily-email-reports');
SELECT cron.unschedule('weekly-email-reports');

-- Create new cron jobs with your actual Supabase URLs
-- ⚠️ IMPORTANT: Replace the URLs below with your actual Supabase project details
DO $$
DECLARE
    -- 🔧 REPLACE THESE VALUES WITH YOUR ACTUAL SUPABASE DETAILS:
    supabase_url TEXT := 'https://your-project-id.supabase.co'; -- 👈 REPLACE THIS
    service_key TEXT := 'your-service-role-key'; -- 👈 REPLACE THIS
BEGIN
    -- Daily email reports cron job (7 PM every day)
    PERFORM cron.schedule(
        'daily-email-reports',
        '0 19 * * *', 
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

    -- Weekly email reports cron job (Sunday 9 AM)
    PERFORM cron.schedule(
        'weekly-email-reports',
        '0 9 * * 0',
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
    
    RAISE NOTICE 'Cron jobs updated successfully!';
END $$;

-- Step 3: Verify admin users exist
-- Check if you have admin users configured
SELECT 
    'Admin Users Check' as check_type,
    COUNT(*) as admin_count,
    STRING_AGG(email, ', ') as admin_emails
FROM users 
WHERE role IN ('admin', 'manager') 
  AND email IS NOT NULL 
  AND email != '';

-- If no admin users, create one (replace with your actual admin email)
-- Uncomment and modify this line:
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@domain.com';

-- Step 4: Verify report recipients are configured
SELECT 
    'Report Recipients Check' as check_type,
    COUNT(*) as recipient_count,
    STRING_AGG(DISTINCT email, ', ') as recipient_emails
FROM report_recipients rr
WHERE is_active = true;

-- Step 5: Show current configuration status
SELECT 
    'Email Reports Configuration Status' as status,
    'Review the information below' as instruction
UNION ALL
SELECT 
    'Tables Created:', 
    CASE WHEN (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('report_types', 'report_configurations', 'report_recipients')
    ) = 3 THEN '✅ All tables exist' ELSE '❌ Tables missing' END
UNION ALL
SELECT 
    'Report Configurations:', 
    CONCAT((SELECT COUNT(*) FROM report_configurations WHERE is_active = true)::text, ' active configs')
UNION ALL
SELECT 
    'Admin Recipients:', 
    CONCAT((SELECT COUNT(*) FROM report_recipients WHERE is_active = true)::text, ' recipients')
UNION ALL
SELECT 
    'Cron Jobs:', 
    CONCAT((SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%email%')::text, ' scheduled jobs');

-- Step 6: Show the cron jobs that were created
SELECT 
    'Current Cron Jobs' as info,
    '' as details
UNION ALL
SELECT 
    jobname,
    schedule
FROM cron.job 
WHERE jobname LIKE '%email%'
ORDER BY jobname;

-- Final instructions
SELECT 
    'NEXT STEPS' as section,
    'Complete these steps to finish setup:' as instructions
UNION ALL
SELECT 
    'Step 1:', 
    'Configure RESEND_API_KEY in Supabase Edge Functions'
UNION ALL
SELECT 
    'Step 2:', 
    'Go to Supabase Dashboard → Edge Functions → email-reports'
UNION ALL
SELECT 
    'Step 3:', 
    'Add environment variable: RESEND_API_KEY = [YOUR_ACTUAL_RESEND_API_KEY]'
UNION ALL
SELECT 
    'Step 4:', 
    'Test the email system in TimeFlow Admin → Email Reports'
UNION ALL
SELECT 
    'Step 5:', 
    'Click "Test Email Setup" to verify configuration'; 