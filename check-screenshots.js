import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking database for screenshots...\n');
  
  try {
    // Check total screenshots count
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select('*')
      .order('captured_at', { ascending: false });
    
    if (screenshotsError) {
      console.error('❌ Error fetching screenshots:', screenshotsError);
      return;
    }
    
    console.log(`📸 Total screenshots in database: ${screenshots?.length || 0}`);
    
    if (screenshots && screenshots.length > 0) {
      console.log('\n📅 Recent screenshots:');
      screenshots.slice(0, 5).forEach((screenshot, index) => {
        console.log(`${index + 1}. User: ${screenshot.user_id}, Task: ${screenshot.task_id}, Time: ${screenshot.captured_at}`);
      });
    }
    
    // Check time logs to see if tracking is active
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('*')
      .filter('end_time', 'is', null)
      .order('start_time', { ascending: false });
    
    if (timeLogsError) {
      console.error('❌ Error fetching time logs:', timeLogsError);
      return;
    }
    
    console.log(`\n⏱️  Active time tracking sessions: ${timeLogs?.length || 0}`);
    
    if (timeLogs && timeLogs.length > 0) {
      console.log('\n🎯 Current active sessions:');
      timeLogs.forEach((log, index) => {
        console.log(`${index + 1}. User: ${log.user_id}, Task: ${log.task_id}, Started: ${log.start_time}`);
      });
    } else {
      console.log('\n⚠️  No active time tracking sessions found!');
      console.log('   Screenshots are only captured when time tracking is active.');
      console.log('   Please start time tracking in the app first.');
    }
    
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`\n👥 Users in database: ${users?.length || 0}`);
    if (users && users.length > 0) {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.full_name} (${user.email}) - ID: ${user.id}`);
      });
    }
    
    // Check tasks table
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, name, user_id')
      .limit(5);
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
      return;
    }
    
    console.log(`\n📋 Tasks in database: ${tasks?.length || 0}`);
    if (tasks && tasks.length > 0) {
      tasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.name} - User: ${task.user_id} - ID: ${task.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

console.log('🔍 Database Check Script');
console.log('========================\n');

checkDatabase().then(() => {
  console.log('\n✅ Database check completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure you have started time tracking in the app');
  console.log('2. On Mac, ensure Screen Recording permission is granted');
  console.log('3. Check Console.app for any Electron error messages');
  console.log('4. Screenshots should appear after 20 seconds of active tracking');
}).catch(console.error); 