import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTimeReports() {
  console.log('🕐 Testing time reports functionality...');
  
  try {
    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    const projectId = 'proj-001';
    
    // Check if we can read time_logs
    console.log('📋 Checking time_logs table...');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    
    if (timeLogsError) {
      console.log('❌ Error reading time_logs:', timeLogsError.message);
    } else {
      console.log('✅ Time logs found:', timeLogs?.length || 0);
      if (timeLogs && timeLogs.length > 0) {
        console.log('📄 Sample time log:', timeLogs[0]);
      }
    }
    
    // Try to create a test time log entry
    console.log('🧪 Creating test time log entry...');
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
    
    const { data: newTimeLog, error: insertError } = await supabase
      .from('time_logs')
      .insert({
        user_id: userId,
        project_id: projectId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_idle: false
      })
      .select();
    
    if (insertError) {
      console.log('❌ Error creating time log:', insertError.message);
    } else {
      console.log('✅ Test time log created:', newTimeLog);
    }
    
    // Check projects table
    console.log('📋 Checking projects table...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);
    
    if (projectsError) {
      console.log('❌ Error reading projects:', projectsError.message);
    } else {
      console.log('✅ Projects found:', projects?.length || 0);
      if (projects && projects.length > 0) {
        console.log('📄 Sample project:', projects[0]);
      }
    }
    
    // Test app_logs with minimal schema
    console.log('🧪 Testing app_logs insert...');
    const { data: appLog, error: appLogError } = await supabase
      .from('app_logs')
      .insert({
        user_id: userId,
        project_id: projectId,
        app_name: 'Test App',
        window_title: 'Test Window'
      })
      .select();
    
    if (appLogError) {
      console.log('❌ Error creating app log:', appLogError.message);
    } else {
      console.log('✅ Test app log created:', appLog);
    }
    
  } catch (error) {
    console.error('❌ Error testing time reports:', error);
  }
}

testTimeReports(); 