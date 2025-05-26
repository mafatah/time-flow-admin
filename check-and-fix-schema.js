import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking current database schema...');
  
  try {
    // Check app_logs table structure
    console.log('📋 Checking app_logs table...');
    const { data: appLogs, error: appLogsError } = await supabase
      .from('app_logs')
      .select('*')
      .limit(1);
    
    if (appLogsError) {
      console.log('❌ Error checking app_logs:', appLogsError.message);
    } else {
      console.log('✅ App_logs table exists');
      if (appLogs && appLogs.length > 0) {
        console.log('📊 Sample app_logs columns:', Object.keys(appLogs[0]));
      }
    }
    
    // Check screenshots table structure
    console.log('📋 Checking screenshots table...');
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('*')
      .limit(1);
    
    if (screenshotsError) {
      console.log('❌ Error checking screenshots:', screenshotsError.message);
    } else {
      console.log('✅ Screenshots table exists');
      if (screenshots && screenshots.length > 0) {
        console.log('📊 Sample screenshots columns:', Object.keys(screenshots[0]));
      }
    }
    
    // Check time_logs table for time reports
    console.log('📋 Checking time_logs table...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('*')
      .limit(1);
    
    if (timeLogsError) {
      console.log('❌ Error checking time_logs:', timeLogsError.message);
    } else {
      console.log('✅ Time_logs table exists');
      if (timeLogs && timeLogs.length > 0) {
        console.log('📊 Sample time_logs columns:', Object.keys(timeLogs[0]));
      }
    }
    
    // Test inserting a simple app_log without the problematic columns
    console.log('🧪 Testing app_logs insert...');
    const { data: insertTest, error: insertError } = await supabase
      .from('app_logs')
      .insert({
        user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
        project_id: 'proj-001',
        app_name: 'Test App',
        window_title: 'Test Window',
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: 60,
        category: 'productivity',
        productivity_score: 80
      })
      .select();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test successful:', insertTest);
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema(); 