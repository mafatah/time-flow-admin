import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActualSchema() {
  console.log('🔍 Checking actual database schema...');
  
  try {
    // Get existing app_logs data to see actual columns
    console.log('📋 Getting app_logs sample...');
    const { data: appLogs, error: appLogsError } = await supabase
      .from('app_logs')
      .select('*')
      .limit(1);
    
    if (appLogsError) {
      console.log('❌ Error:', appLogsError.message);
    } else {
      if (appLogs && appLogs.length > 0) {
        console.log('📊 Actual app_logs columns:', Object.keys(appLogs[0]));
        console.log('📄 Sample data:', appLogs[0]);
      } else {
        console.log('📊 No data in app_logs, trying to insert minimal record...');
        
        // Try minimal insert
        const { data: insertTest, error: insertError } = await supabase
          .from('app_logs')
          .insert({
            user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
            app_name: 'Test App',
            window_title: 'Test Window'
          })
          .select();
        
        if (insertError) {
          console.log('❌ Minimal insert failed:', insertError.message);
        } else {
          console.log('✅ Minimal insert successful:', insertTest);
        }
      }
    }
    
    // Check time_logs for time reports
    console.log('📋 Getting time_logs sample...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('*')
      .limit(1);
    
    if (timeLogsError) {
      console.log('❌ Time logs error:', timeLogsError.message);
    } else {
      if (timeLogs && timeLogs.length > 0) {
        console.log('📊 Actual time_logs columns:', Object.keys(timeLogs[0]));
        console.log('📄 Sample time log:', timeLogs[0]);
      } else {
        console.log('📊 No data in time_logs table');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkActualSchema(); 