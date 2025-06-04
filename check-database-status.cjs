const { createClient } = require('@supabase/supabase-js');

// Database configuration
const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabaseStatus() {
  console.log('🔍 Checking database status...');
  
  try {
    // Check users table
    console.log('\n📊 USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.full_name}) - Role: ${user.role} - ID: ${user.id}`);
      });
    }

    // Check time_logs table
    console.log('\n⏰ TIME_LOGS TABLE:');
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('id, user_id, start_time, end_time, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (timeLogsError) {
      console.error('❌ Error fetching time logs:', timeLogsError);
    } else {
      console.log(`Found ${timeLogs.length} recent time logs:`);
      timeLogs.forEach(log => {
        console.log(`  - User: ${log.user_id} - Status: ${log.status} - Start: ${log.start_time} - End: ${log.end_time}`);
      });
    }

    // Check screenshots table
    console.log('\n📸 SCREENSHOTS TABLE:');
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('id, user_id, captured_at, activity_percent')
      .order('captured_at', { ascending: false })
      .limit(5);
    
    if (screenshotsError) {
      console.error('❌ Error fetching screenshots:', screenshotsError);
    } else {
      console.log(`Found ${screenshots.length} recent screenshots:`);
      screenshots.forEach(screenshot => {
        console.log(`  - User: ${screenshot.user_id} - Captured: ${screenshot.captured_at} - Activity: ${screenshot.activity_percent}%`);
      });
    }

    // Check projects table
    console.log('\n📋 PROJECTS TABLE:');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, description, created_at')
      .order('created_at', { ascending: false });
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
    } else {
      console.log(`Found ${projects.length} projects:`);
      projects.forEach(project => {
        console.log(`  - ${project.name} - ID: ${project.id}`);
      });
    }

    // Check for mabdulfattah user specifically
    console.log('\n🔍 SEARCHING FOR MABDULFATTAH USER:');
    const { data: mabdulfattahUser, error: mabdulfattahError } = await supabase
      .from('users')
      .select('*')
      .or('email.ilike.%mabdulfattah%,full_name.ilike.%mabdulfattah%')
      .single();
    
    if (mabdulfattahError) {
      console.log('❌ mabdulfattah user not found:', mabdulfattahError.message);
    } else {
      console.log('✅ Found mabdulfattah user:', mabdulfattahUser);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

async function cleanupDatabase() {
  console.log('\n🧹 CLEANUP OPTIONS:');
  console.log('To keep only mabdulfattah user, you would need to:');
  console.log('1. Delete all time_logs for other users');
  console.log('2. Delete all screenshots for other users');
  console.log('3. Delete all other users except mabdulfattah');
  console.log('\n⚠️ This script only checks data - manual cleanup required');
}

// Run the checks
checkDatabaseStatus().then(() => {
  cleanupDatabase();
  process.exit(0);
}); 