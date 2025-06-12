const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingTimeLogs() {
  console.log('🔧 FIXING MISSING TIME LOGS ISSUE');
  console.log('=================================');
  console.log('🎯 Target: Users with app activity but no time logs (like Ahmed Ehab)');

  try {
    // 1. Identify users with app activity but missing time logs
    await identifyAffectedUsers();
    
    // 2. Create time logs from app activity data
    await createTimeLogsFromAppActivity();
    
    // 3. Verify the fix
    await verifyTimeLogs();

  } catch (error) {
    console.error('❌ Failed to fix time logs:', error);
  }
}

async function identifyAffectedUsers() {
  console.log('\n1️⃣ Identifying users with missing time logs...');
  
  try {
    // Get users with recent app activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, role');

    if (usersError) {
      console.error('   ❌ Failed to fetch users:', usersError);
      return;
    }

    console.log(`   👤 Checking ${users.length} users for missing time logs`);

    const affectedUsers = [];

    for (const user of users) {
      // Check app logs
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('id, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', sevenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      // Check time logs  
      const { data: timeLogs, error: timeError } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time')
        .eq('user_id', user.id)
        .gte('start_time', sevenDaysAgo.toISOString());

      const appCount = appLogs?.length || 0;
      const timeCount = timeLogs?.length || 0;

      console.log(`   📊 ${user.full_name}: ${appCount} app logs, ${timeCount} time logs`);

      // Users with app activity but no/few time logs need fixing
      if (appCount > 10 && timeCount === 0) {
        affectedUsers.push({
          user,
          appLogs,
          appCount,
          timeCount
        });
        console.log(`     ⚠️  NEEDS FIX: ${appCount} app activities but ${timeCount} time sessions`);
      }
    }

    console.log(`\n   🎯 Found ${affectedUsers.length} users needing time log fixes`);
    
    // Store for next step
    this.affectedUsers = affectedUsers;

  } catch (error) {
    console.error('   ❌ Failed to identify affected users:', error);
  }
}

async function createTimeLogsFromAppActivity() {
  console.log('\n2️⃣ Creating time logs from app activity...');
  
  try {
    if (!this.affectedUsers || this.affectedUsers.length === 0) {
      console.log('   ℹ️  No affected users found, re-checking...');
      
      // Re-run identification if needed
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data: users } = await supabase
        .from('users')
        .select('id, email, full_name, role');

      const affectedUsers = [];

      for (const user of users) {
        const { data: appLogs } = await supabase
          .from('app_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('timestamp', sevenDaysAgo.toISOString())
          .order('timestamp', { ascending: true });

        const { data: timeLogs } = await supabase
          .from('time_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('start_time', sevenDaysAgo.toISOString());

        const appCount = appLogs?.length || 0;
        const timeCount = timeLogs?.length || 0;

        if (appCount > 10 && timeCount === 0) {
          affectedUsers.push({ user, appLogs, appCount, timeCount });
        }
      }

      this.affectedUsers = affectedUsers;
    }

    console.log(`   🔨 Processing ${this.affectedUsers.length} users...`);

    for (const { user, appLogs } of this.affectedUsers) {
      console.log(`\n   👤 Creating time logs for ${user.full_name}...`);
      
      if (!appLogs || appLogs.length === 0) continue;

      // Group app logs by day to create daily time sessions
      const dailyActivity = groupAppLogsByDay(appLogs);
      
      console.log(`     📅 Found activity on ${Object.keys(dailyActivity).length} days`);

      for (const [date, dayLogs] of Object.entries(dailyActivity)) {
        // Create a time log session for this day
        const startTime = new Date(dayLogs[0].timestamp);
        const endTime = new Date(dayLogs[dayLogs.length - 1].timestamp);
        
        // Add some buffer to the end time (last activity + 30 minutes)
        endTime.setMinutes(endTime.getMinutes() + 30);

        // Calculate activity metrics
        const totalMouseClicks = dayLogs.reduce((sum, log) => sum + (log.mouse_clicks || 0), 0);
        const totalKeystrokes = dayLogs.reduce((sum, log) => sum + (log.keystrokes || 0), 0);
        const totalMouseMovements = dayLogs.reduce((sum, log) => sum + (log.mouse_movements || 0), 0);

        const sessionDuration = Math.floor((endTime - startTime) / 1000);
        const productivityScore = calculateProductivityScore(totalMouseClicks, totalKeystrokes, sessionDuration);

        const timeLogData = {
          user_id: user.id,
          project_id: '00000000-0000-0000-0000-000000000001', // Default project
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_seconds: sessionDuration,
          total_mouse_clicks: totalMouseClicks,
          total_keystrokes: totalKeystrokes,
          total_mouse_movements: totalMouseMovements,
          productivity_score: productivityScore,
          idle_seconds: 0,
          status: 'completed',
          created_at: new Date().toISOString()
        };

        // Insert time log
        const { data: insertedLog, error: insertError } = await supabase
          .from('time_logs')
          .insert(timeLogData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`     ❌ Failed to create time log for ${date}:`, insertError);
        } else {
          const hours = Math.floor(sessionDuration / 3600);
          const minutes = Math.floor((sessionDuration % 3600) / 60);
          console.log(`     ✅ Created time log for ${date}: ${hours}h ${minutes}m (${productivityScore}% productive)`);
          
          // Update app logs to reference this time log
          const { error: updateError } = await supabase
            .from('app_logs')
            .update({ time_log_id: insertedLog.id })
            .in('id', dayLogs.map(log => log.id));

          if (updateError) {
            console.log(`     ⚠️  Failed to link app logs to time log: ${updateError.message}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('   ❌ Failed to create time logs:', error);
  }
}

function groupAppLogsByDay(appLogs) {
  const dailyActivity = {};
  
  appLogs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    if (!dailyActivity[date]) {
      dailyActivity[date] = [];
    }
    dailyActivity[date].push(log);
  });

  return dailyActivity;
}

function calculateProductivityScore(mouseClicks, keystrokes, durationSeconds) {
  if (durationSeconds === 0) return 0;
  
  const totalActivity = mouseClicks + keystrokes;
  const hoursWorked = durationSeconds / 3600;
  const activityPerHour = totalActivity / hoursWorked;
  
  // Normalize to 0-100% based on reasonable activity levels
  // 200 actions per hour = 100% productivity
  const productivity = Math.min(100, Math.round((activityPerHour / 200) * 100));
  return Math.max(0, productivity);
}

async function verifyTimeLogs() {
  console.log('\n3️⃣ Verifying time logs fix...');
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Check time logs for all users
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name');

    console.log('\n   📊 Updated user time log status:');
    
    let totalActiveUsers = 0;
    
    for (const user of users) {
      const { data: timeLogs } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time, total_seconds')
        .eq('user_id', user.id)
        .gte('start_time', sevenDaysAgo.toISOString());

      const timeCount = timeLogs?.length || 0;
      
      if (timeCount > 0) {
        totalActiveUsers++;
        const totalHours = timeLogs.reduce((sum, log) => sum + (log.total_seconds || 0), 0) / 3600;
        console.log(`     ✅ ${user.full_name}: ${timeCount} sessions, ${totalHours.toFixed(1)}h total`);
      } else {
        console.log(`     ⚪ ${user.full_name}: No time logs`);
      }
    }

    console.log(`\n   🎉 RESULT: ${totalActiveUsers} users now have time logs`);
    console.log('   📈 Employee Report should now show all active users');
    console.log('   🔄 Refresh the admin panel to see updated data');

  } catch (error) {
    console.error('   ❌ Failed to verify time logs:', error);
  }
}

// Initialize storage for affected users
this.affectedUsers = [];

// Run the fix
fixMissingTimeLogs(); 