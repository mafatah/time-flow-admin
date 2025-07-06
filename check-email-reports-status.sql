-- Email Reports System Diagnostic Script
-- Run this in Supabase SQL Editor to check current status

-- Check if required tables exist
SELECT 
  'report_types' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'report_types'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 
  'report_configurations' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'report_configurations'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 
  'report_recipients' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'report_recipients'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check report types
SELECT 
  '=== REPORT TYPES ===' as section,
  '' as details;

SELECT 
  name,
  template_type,
  is_active,
  created_at
FROM public.report_types
ORDER BY template_type, name;

-- Check report configurations
SELECT 
  '=== REPORT CONFIGURATIONS ===' as section,
  '' as details;

SELECT 
  rc.name,
  rt.template_type,
  rc.schedule_cron,
  rc.schedule_description,
  rc.is_active,
  rc.subject_template
FROM public.report_configurations rc
JOIN public.report_types rt ON rt.id = rc.report_type_id
ORDER BY rt.template_type, rc.name;

-- Check admin users
SELECT 
  '=== ADMIN USERS ===' as section,
  '' as details;

SELECT 
  full_name,
  email,
  role,
  is_active,
  created_at
FROM public.users
WHERE role IN ('admin', 'manager')
ORDER BY full_name;

-- Check report recipients
SELECT 
  '=== REPORT RECIPIENTS ===' as section,
  '' as details;

SELECT 
  rc.name as report_name,
  u.full_name as recipient_name,
  rr.email as recipient_email,
  rr.is_active as recipient_active
FROM public.report_recipients rr
JOIN public.report_configurations rc ON rc.id = rr.report_config_id
LEFT JOIN public.users u ON u.id = rr.user_id
ORDER BY rc.name, u.full_name;

-- Check cron jobs
SELECT 
  '=== CRON JOBS ===' as section,
  '' as details;

SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname LIKE '%email%' OR jobname LIKE '%report%'
ORDER BY jobname;

-- Check recent report history
SELECT 
  '=== RECENT REPORT HISTORY ===' as section,
  '' as details;

SELECT 
  rc.name as report_name,
  rh.sent_at,
  rh.status,
  rh.recipient_count,
  rh.error_message,
  rh.email_service_id
FROM public.report_history rh
JOIN public.report_configurations rc ON rc.id = rh.report_config_id
ORDER BY rh.sent_at DESC
LIMIT 10;

-- Check if extensions are enabled
SELECT 
  '=== EXTENSIONS ===' as section,
  '' as details;

SELECT 
  extname as extension_name,
  CASE WHEN extname IS NOT NULL THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pg_net')
UNION ALL
SELECT 
  'pg_cron' as extension_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
    THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
UNION ALL
SELECT 
  'pg_net' as extension_name,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') 
    THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net');

-- Summary and recommendations
SELECT 
  '=== DIAGNOSTIC SUMMARY ===' as section,
  '' as details;

SELECT 
  'Tables Created' as check_item,
  CASE WHEN (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('report_types', 'report_configurations', 'report_recipients', 'report_history')
  ) = 4 THEN '✅ ALL TABLES EXIST' ELSE '❌ MISSING TABLES' END as status;

SELECT 
  'Report Configurations' as check_item,
  CASE WHEN (SELECT COUNT(*) FROM public.report_configurations WHERE is_active = true) > 0 
    THEN '✅ ACTIVE CONFIGS FOUND' ELSE '❌ NO ACTIVE CONFIGS' END as status;

SELECT 
  'Admin Users' as check_item,
  CASE WHEN (SELECT COUNT(*) FROM public.users WHERE role IN ('admin', 'manager') AND email IS NOT NULL) > 0 
    THEN '✅ ADMIN USERS FOUND' ELSE '❌ NO ADMIN USERS' END as status;

SELECT 
  'Report Recipients' as check_item,
  CASE WHEN (SELECT COUNT(*) FROM public.report_recipients WHERE is_active = true) > 0 
    THEN '✅ RECIPIENTS CONFIGURED' ELSE '❌ NO RECIPIENTS' END as status;

SELECT 
  'Cron Jobs' as check_item,
  CASE WHEN (SELECT COUNT(*) FROM cron.job WHERE jobname LIKE '%email%') > 0 
    THEN '✅ CRON JOBS EXIST' ELSE '❌ NO CRON JOBS' END as status;

-- Next steps recommendations
SELECT 
  '=== NEXT STEPS ===' as section,
  'Based on the results above, you may need to:' as details
UNION ALL
SELECT 
  '1.' as section,
  'If tables are missing: Run the email reports migration' as details
UNION ALL
SELECT 
  '2.' as section,
  'If no admin users: Create admin users in the users table' as details
UNION ALL
SELECT 
  '3.' as section,
  'If no recipients: Run the recipient setup script' as details
UNION ALL
SELECT 
  '4.' as section,
  'If no cron jobs: Set up the automated cron jobs with proper URLs' as details
UNION ALL
SELECT 
  '5.' as section,
  'Configure RESEND_API_KEY in Supabase edge function environment' as details; 