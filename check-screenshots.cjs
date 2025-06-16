require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'process.env.VITE_SUPABASE_URL';
const supabaseKey = 'process.env.VITE_SUPABASE_ANON_KEY';


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScreenshots() {
  console.log('🔍 Checking for screenshots...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  
  try {
    // Check recent screenshots
    const { data: screenshots, error } = await supabase
      .from('screenshots')
      .select('*')
      .eq('user_id', employeeUserId)
      .order('captured_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching screenshots:', error);
      return;
    }
    
    console.log(`📸 Found ${screenshots.length} screenshots for employee:`);
    screenshots.forEach((screenshot, index) => {
      const capturedTime = new Date(screenshot.captured_at).toLocaleString();
      console.log(`   ${index + 1}. Captured at ${capturedTime}`);
      console.log(`      Image URL: ${screenshot.image_url}`);
      console.log(`      Activity: ${screenshot.activity_percent || 'N/A'}%`);
    });
    
    if (screenshots.length === 0) {
      console.log('⚠️ No screenshots found. Desktop agent may not be running or capturing screenshots.');
      console.log('💡 Make sure:');
      console.log('   1. Desktop agent is running');
      console.log('   2. Employee is logged in and tracking time');
      console.log('   3. Screenshot permissions are granted');
    } else {
      console.log('✅ Screenshots are being captured successfully!');
    }
    
  } catch (error) {
    console.error('❌ Failed to check screenshots:', error);
  }
}

async function checkTimeLogs() {
  console.log('\n🔍 Checking for time logs...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  
  try {
    const { data: timeLogs, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', employeeUserId)
      .order('start_time', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching time logs:', error);
      return;
    }
    
    console.log(`⏰ Found ${timeLogs.length} time logs for employee:`);
    timeLogs.forEach((log, index) => {
      const startTime = new Date(log.start_time).toLocaleString();
      const endTime = log.end_time ? new Date(log.end_time).toLocaleString() : 'Still active';
      const isIdle = log.is_idle ? '💤 Idle' : '✅ Active';
      console.log(`   ${index + 1}. ${startTime} - ${endTime} (${isIdle})`);
      console.log(`      Project ID: ${log.project_id}`);
    });
    
    if (timeLogs.length === 0) {
      console.log('⚠️ No time logs found. Employee may not have started tracking time.');
    }
    
  } catch (error) {
    console.error('❌ Failed to check time logs:', error);
  }
}

async function checkAppLogs() {
  console.log('\n🔍 Checking for app logs...');
  
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
  
  try {
    const { data: appLogs, error } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', employeeUserId)
      .order('started_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching app logs:', error);
      return;
    }
    
    console.log(`📱 Found ${appLogs.length} app logs for employee:`);
    appLogs.forEach((log, index) => {
      const startTime = new Date(log.started_at).toLocaleString();
      console.log(`   ${index + 1}. ${log.app_name} at ${startTime}`);
      if (log.window_title) {
        console.log(`      Window: ${log.window_title}`);
      }
    });
    
    if (appLogs.length === 0) {
      console.log('⚠️ No app logs found. Desktop agent may not be tracking app usage.');
    }
    
  } catch (error) {
    console.error('❌ Failed to check app logs:', error);
  }
}

async function main() {
  console.log('🚀 Checking desktop agent activity...');
  console.log('👤 Employee User ID:', '189a8371-8aaf-4551-9b33-8fed7f4cee5d');
  
  await checkTimeLogs();
  await checkScreenshots();
  await checkAppLogs();
  
  console.log('\n✅ Desktop agent activity check completed!');
  console.log('\n💡 If no data is found:');
  console.log('   1. Make sure the desktop agent is running');
  console.log('   2. Employee should log in and start time tracking');
  console.log('   3. Wait 60 seconds for first screenshot');
  console.log('   4. Check macOS permissions for screen recording');
}

main().catch(console.error); 