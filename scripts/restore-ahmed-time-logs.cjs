const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAhmedTimeLogs() {
  console.log('🔍 INVESTIGATING AHMED EHAB\'S MISSING TIME LOGS');
  console.log('===============================================');

  try {
    // 1. Find Ahmed Ehab's user record
    const { data: ahmed, error: ahmedError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', '%ahmed.ehab%')
      .single();

    if (ahmedError || !ahmed) {
      console.error('❌ Could not find Ahmed Ehab user');
      return;
    }

    console.log(`👤 Found Ahmed Ehab: ${ahmed.full_name} (${ahmed.email})`);
    console.log(`📧 User ID: ${ahmed.id}`);

    // 2. Check his app logs to confirm he has activity
    const { data: ahmedApps, error: appsError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', ahmed.id)
      .order('timestamp', { ascending: false })
      .limit(20);

    console.log(`\n📱 Ahmed's recent app logs: ${ahmedApps?.length || 0}`);
    
    if (ahmedApps && ahmedApps.length > 0) {
      console.log('   Recent activity:');
      ahmedApps.slice(0, 5).forEach(log => {
        console.log(`   - ${log.app_name} at ${log.timestamp}`);
      });
    }

    // 3. Check his time logs (should be empty now)
    const { data: ahmedTime, error: timeError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', ahmed.id)
      .order('start_time', { ascending: false });

    console.log(`\n⏰ Ahmed's time logs: ${ahmedTime?.length || 0}`);
    
    if (ahmedTime && ahmedTime.length > 0) {
      console.log('   Existing time logs:');
      ahmedTime.forEach(log => {
        const duration = log.end_time ? 
          Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60) :
          'Ongoing';
        console.log(`   - ${log.start_time}: ${duration} minutes`);
      });
    } else {
      console.log('   ❌ No time logs found - they were likely deleted during cleanup');
    }

    // 4. Create time logs based on his app activity
    await createTimeLogsFromAppActivity(ahmed);

    // 5. Verify the fix
    await verifyTimeLogsCreated(ahmed);

  } catch (error) {
    console.error('❌ Failed to restore Ahmed\'s time logs:', error);
  }
}

async function createTimeLogsFromAppActivity(user) {
  console.log('\n🔧 Creating time logs from app activity...');

  try {
    // Get Ahmed's app logs grouped by day
    const { data: appLogs, error: appsError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (appsError || !appLogs || appLogs.length === 0) {
      console.log('   ❌ No app logs found to create time logs from');
      return;
    }

    console.log(`   📊 Found ${appLogs.length} app logs to process`);

    // Group app logs by day
    const dayGroups = {};
    appLogs.forEach(log => {
      const day = log.timestamp.split('T')[0]; // Get YYYY-MM-DD
      if (!dayGroups[day]) {
        dayGroups[day] = [];
      }
      dayGroups[day].push(log);
    });

    console.log(`   📅 Found activity on ${Object.keys(dayGroups).length} days`);

    // Create time logs for each day
    for (const [day, logs] of Object.entries(dayGroups)) {
      if (logs.length === 0) continue;

      // Sort logs by timestamp
      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const firstLog = logs[0];
      const lastLog = logs[logs.length - 1];

      // Calculate total activity metrics
      const totalMouseClicks = logs.reduce((sum, log) => sum + (log.mouse_clicks || 0), 0);
      const totalKeystrokes = logs.reduce((sum, log) => sum + (log.keystrokes || 0), 0);
      const totalMouseMovements = logs.reduce((sum, log) => sum + (log.mouse_movements || 0), 0);

      // Create time log for this day
      const timeLog = {
        user_id: user.id,
        project_id: '00000000-0000-0000-0000-000000000001', // Default project
        start_time: firstLog.timestamp,
        end_time: new Date(new Date(lastLog.timestamp).getTime() + 5 * 60 * 1000).toISOString(), // Add 5 minutes to last activity
        total_mouse_clicks: totalMouseClicks,
        total_keystrokes: totalKeystrokes,
        total_mouse_movements: totalMouseMovements,
        productivity_score: Math.min(100, Math.round((totalMouseClicks + totalKeystrokes) / 10)),
        activity_level: totalMouseClicks + totalKeystrokes > 100 ? 'high' : 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert the time log
      const { data: insertedLog, error: insertError } = await supabase
        .from('time_logs')
        .insert(timeLog)
        .select()
        .single();

      if (insertError) {
        console.log(`   ❌ Failed to create time log for ${day}:`, insertError.message);
      } else {
        const duration = Math.round((new Date(timeLog.end_time) - new Date(timeLog.start_time)) / 1000 / 60);
        console.log(`   ✅ Created time log for ${day}: ${duration} minutes (${logs.length} app activities)`);
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to create time logs:', error);
  }
}

async function verifyTimeLogsCreated(user) {
  console.log('\n🔍 Verifying time logs were created...');

  try {
    const { data: timeLogs, error: timeError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (timeError) {
      console.error('   ❌ Failed to verify time logs:', timeError);
      return;
    }

    console.log(`   📊 Ahmed now has ${timeLogs?.length || 0} time logs`);

    if (timeLogs && timeLogs.length > 0) {
      console.log('   ✅ Recent time logs:');
      timeLogs.slice(0, 5).forEach(log => {
        const duration = log.end_time ? 
          Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60) :
          'Ongoing';
        const day = log.start_time.split('T')[0];
        console.log(`     - ${day}: ${duration} minutes (${log.productivity_score}% productivity)`);
      });

      // Calculate total hours this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weekLogs = timeLogs.filter(log => new Date(log.start_time) > weekAgo);
      const totalMinutes = weekLogs.reduce((sum, log) => {
        if (!log.end_time) return sum;
        return sum + Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60);
      }, 0);
      const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

      console.log(`\n   📈 Ahmed's weekly summary:`);
      console.log(`     - Total hours this week: ${totalHours}h`);
      console.log(`     - Active days: ${weekLogs.length}`);
      console.log(`     - Should now appear in Employee Report`);
    }

  } catch (error) {
    console.error('   ❌ Failed to verify time logs:', error);
  }
}

// Run the restoration
restoreAhmedTimeLogs(); 