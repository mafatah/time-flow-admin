const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAhmedFinal() {
  console.log('🎯 FINAL RESTORATION OF AHMED EHAB\'S TIME LOGS');
  console.log('===============================================');

  try {
    // 1. Find Ahmed Ehab
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

    // 2. Get his app activity by day
    const { data: appLogs, error: appsError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', ahmed.id)
      .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (appsError || !appLogs || appLogs.length === 0) {
      console.log('❌ No app logs found');
      return;
    }

    console.log(`📊 Found ${appLogs.length} app activities in last 7 days`);

    // 3. Group by day
    const dayGroups = {};
    appLogs.forEach(log => {
      const day = log.timestamp.split('T')[0];
      if (!dayGroups[day]) {
        dayGroups[day] = [];
      }
      dayGroups[day].push(log);
    });

    console.log(`📅 Found activity on ${Object.keys(dayGroups).length} days`);

    // 4. Create time logs using ONLY the actual columns
    for (const [day, logs] of Object.entries(dayGroups)) {
      if (logs.length === 0) continue;

      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const firstLog = logs[0];
      const lastLog = logs[logs.length - 1];

      // Use ONLY the columns that actually exist in time_logs table
      const timeLog = {
        user_id: ahmed.id,
        project_id: '00000000-0000-0000-0000-000000000001',
        start_time: firstLog.timestamp,
        end_time: new Date(new Date(lastLog.timestamp).getTime() + 5 * 60 * 1000).toISOString(),
        is_idle: false,
        status: 'completed',
        description: `Work session - ${logs.length} app activities`,
        is_manual: false
      };

      console.log(`   Creating time log for ${day}...`);

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
        console.log(`   ✅ Created time log for ${day}: ${duration} minutes (${logs.length} activities)`);
      }
    }

    // 5. Verify the results
    const { data: newTimeLogs, error: verifyError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', ahmed.id)
      .order('start_time', { ascending: false });

    if (!verifyError && newTimeLogs) {
      console.log(`\n✅ SUCCESS! Ahmed now has ${newTimeLogs.length} time logs`);
      
      if (newTimeLogs.length > 0) {
        console.log('\n📈 Ahmed\'s restored time sessions:');
        newTimeLogs.forEach(log => {
          const duration = log.end_time ? 
            Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60) :
            'Ongoing';
          const day = log.start_time.split('T')[0];
          console.log(`  - ${day}: ${duration} minutes (${log.status})`);
        });

        // Calculate weekly total
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weekLogs = newTimeLogs.filter(log => new Date(log.start_time) > weekAgo);
        const totalMinutes = weekLogs.reduce((sum, log) => {
          if (!log.end_time) return sum;
          return sum + Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60);
        }, 0);
        const totalHours = Math.round(totalMinutes / 60 * 100) / 100;

        console.log(`\n📊 Ahmed's weekly summary:`);
        console.log(`  ⏰ Total hours this week: ${totalHours}h`);
        console.log(`  📅 Active days: ${weekLogs.length}`);
        console.log(`  📝 Total sessions: ${weekLogs.length}`);
        
        console.log(`\n🎉 AHMED IS RESTORED!`);
        console.log(`   ✅ Time logs recreated from app activity`);
        console.log(`   ✅ Should now appear in Employee Report`);
        console.log(`   🔄 Please refresh the admin panel to see updated data`);
      }
    }

    // 6. Also check other users who might need time logs
    console.log(`\n🔍 Checking other users who might need time log restoration...`);
    
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name');

    if (!usersError && allUsers) {
      for (const user of allUsers) {
        if (user.id === ahmed.id) continue; // Skip Ahmed, we already fixed him

        const { data: userTimeLogs } = await supabase
          .from('time_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const { data: userAppLogs } = await supabase
          .from('app_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const timeLogCount = userTimeLogs?.length || 0;
        const appLogCount = userAppLogs?.length || 0;

        if (appLogCount > 10 && timeLogCount === 0) {
          console.log(`   ⚠️  ${user.full_name || user.email}: ${appLogCount} app logs but ${timeLogCount} time logs`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Failed to restore Ahmed\'s time logs:', error);
  }
}

// Run the final restoration
restoreAhmedFinal(); 