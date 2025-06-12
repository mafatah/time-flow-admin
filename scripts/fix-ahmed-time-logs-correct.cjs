const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAhmedTimeLogs() {
  console.log('🔧 FIXING AHMED EHAB\'S TIME LOGS WITH CORRECT SCHEMA');
  console.log('===================================================');

  try {
    // 1. First check the actual time_logs table schema
    const { data: sampleTimeLogs, error: schemaError } = await supabase
      .from('time_logs')
      .select('*')
      .limit(1);

    if (!schemaError && sampleTimeLogs && sampleTimeLogs.length > 0) {
      console.log('📋 Actual time_logs columns:', Object.keys(sampleTimeLogs[0]));
    }

    // 2. Find Ahmed Ehab
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

    // 3. Get his app activity by day
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

    console.log(`📊 Found ${appLogs.length} app activities to process`);

    // 4. Group by day and create time logs
    const dayGroups = {};
    appLogs.forEach(log => {
      const day = log.timestamp.split('T')[0];
      if (!dayGroups[day]) {
        dayGroups[day] = [];
      }
      dayGroups[day].push(log);
    });

    console.log(`📅 Found activity on ${Object.keys(dayGroups).length} days`);

    // 5. Create time logs with correct schema
    for (const [day, logs] of Object.entries(dayGroups)) {
      if (logs.length === 0) continue;

      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const firstLog = logs[0];
      const lastLog = logs[logs.length - 1];

      // Calculate metrics
      const totalMouseClicks = logs.reduce((sum, log) => sum + (log.mouse_clicks || 0), 0);
      const totalKeystrokes = logs.reduce((sum, log) => sum + (log.keystrokes || 0), 0);
      const totalMouseMovements = logs.reduce((sum, log) => sum + (log.mouse_movements || 0), 0);

      // Create time log with only existing columns
      const timeLog = {
        user_id: ahmed.id,
        project_id: '00000000-0000-0000-0000-000000000001',
        start_time: firstLog.timestamp,
        end_time: new Date(new Date(lastLog.timestamp).getTime() + 5 * 60 * 1000).toISOString(),
        total_mouse_clicks: totalMouseClicks,
        total_keystrokes: totalKeystrokes,
        total_mouse_movements: totalMouseMovements,
        productivity_score: Math.min(100, Math.round((totalMouseClicks + totalKeystrokes) / 10))
      };

      // Insert the time log
      const { data: insertedLog, error: insertError } = await supabase
        .from('time_logs')
        .insert(timeLog)
        .select()
        .single();

      if (insertError) {
        console.log(`❌ Failed to create time log for ${day}:`, insertError.message);
      } else {
        const duration = Math.round((new Date(timeLog.end_time) - new Date(timeLog.start_time)) / 1000 / 60);
        console.log(`✅ Created time log for ${day}: ${duration} minutes (${logs.length} activities)`);
      }
    }

    // 6. Verify and show results
    const { data: newTimeLogs, error: verifyError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', ahmed.id)
      .order('start_time', { ascending: false });

    if (!verifyError && newTimeLogs) {
      console.log(`\n✅ Ahmed now has ${newTimeLogs.length} time logs`);
      
      if (newTimeLogs.length > 0) {
        console.log('📈 Recent time sessions:');
        newTimeLogs.slice(0, 5).forEach(log => {
          const duration = log.end_time ? 
            Math.round((new Date(log.end_time) - new Date(log.start_time)) / 1000 / 60) :
            'Ongoing';
          const day = log.start_time.split('T')[0];
          console.log(`  - ${day}: ${duration} minutes (${log.productivity_score || 0}% productivity)`);
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
        console.log(`  - Total hours this week: ${totalHours}h`);
        console.log(`  - Active days: ${weekLogs.length}`);
        console.log(`  - Total sessions: ${weekLogs.length}`);
        
        console.log(`\n🎉 Ahmed should now appear in the Employee Report!`);
        console.log(`   Please refresh the admin panel to see the updated data.`);
      }
    }

  } catch (error) {
    console.error('❌ Failed to fix Ahmed\'s time logs:', error);
  }
}

// Run the fix
fixAhmedTimeLogs(); 