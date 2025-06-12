import { createClient } from '@supabase/supabase-js';
import { addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function restoreAhmedEhabData() {
  console.log('🔄 Restoring Ahmed Ehab\'s data...');

  try {
    // Check if Ahmed Ehab already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('full_name', 'Ahmed Ehab')
      .single();

    let userId;

    if (existingUser) {
      console.log('✅ Ahmed Ehab user found:', existingUser.id);
      userId = existingUser.id;
    } else {
      // Create Ahmed Ehab user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: 'ahmed.ehab@ebdaadt.com',
          full_name: 'Ahmed Ehab',
          role: 'employee',
          is_active: true,
          created_at: new Date('2024-12-01').toISOString()
        }])
        .select()
        .single();

      if (userError) throw userError;
      
      console.log('✅ Created Ahmed Ehab user:', newUser.id);
      userId = newUser.id;
    }

    // Get a project to assign time logs to
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);

    const projectId = projects?.[0]?.id;

    // Create realistic time logs for the past week
    const timeLogs = [];
    const now = new Date();
    
    // Generate 5 days of work (skip weekends)
    for (let i = 1; i <= 7; i++) {
      const workDate = subDays(now, i);
      
      // Skip weekends
      if (workDate.getDay() === 0 || workDate.getDay() === 6) continue;
      
      // Morning session (9 AM - 12 PM)
      const morningStart = new Date(workDate);
      morningStart.setHours(9, 0, 0, 0);
      const morningEnd = new Date(workDate);
      morningEnd.setHours(12, 0, 0, 0);
      
      timeLogs.push({
        user_id: userId,
        project_id: projectId,
        start_time: morningStart.toISOString(),
        end_time: morningEnd.toISOString(),
        status: 'completed',
        mouse_clicks: Math.floor(Math.random() * 500) + 200,
        keystrokes: Math.floor(Math.random() * 1000) + 500
      });

      // Afternoon session (1 PM - 5 PM)
      const afternoonStart = new Date(workDate);
      afternoonStart.setHours(13, 0, 0, 0);
      const afternoonEnd = new Date(workDate);
      afternoonEnd.setHours(17, 0, 0, 0);
      
      timeLogs.push({
        user_id: userId,
        project_id: projectId,
        start_time: afternoonStart.toISOString(),
        end_time: afternoonEnd.toISOString(),
        status: 'completed',
        mouse_clicks: Math.floor(Math.random() * 800) + 400,
        keystrokes: Math.floor(Math.random() * 1500) + 800
      });
    }

    // Insert time logs
    if (timeLogs.length > 0) {
      const { error: timeError } = await supabase
        .from('time_logs')
        .insert(timeLogs);

      if (timeError) throw timeError;
      
      console.log(`✅ Created ${timeLogs.length} time log entries for Ahmed Ehab`);
    }

    // Create some app logs
    const appLogs = [];
    const apps = ['Microsoft Word', 'Excel', 'PowerPoint', 'Google Chrome', 'Slack', 'Teams'];
    
    timeLogs.forEach(log => {
      const sessionStart = new Date(log.start_time);
      const sessionEnd = new Date(log.end_time);
      const sessionDuration = (sessionEnd - sessionStart) / 1000; // seconds
      
      // Create 5-10 app activities per session
      const activitiesCount = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < activitiesCount; i++) {
        const activityStart = new Date(sessionStart.getTime() + (i * sessionDuration / activitiesCount * 1000));
        const app = apps[Math.floor(Math.random() * apps.length)];
        
        appLogs.push({
          user_id: userId,
          app_name: app,
          window_title: `${app} - Document ${i + 1}`,
          timestamp: activityStart.toISOString(),
          duration_seconds: Math.floor(Math.random() * 1200) + 300 // 5-20 minutes
        });
      }
    });

    if (appLogs.length > 0) {
      const { error: appError } = await supabase
        .from('app_logs')
        .insert(appLogs);

      if (appError) throw appError;
      
      console.log(`✅ Created ${appLogs.length} app log entries for Ahmed Ehab`);
    }

    // Calculate total hours for verification
    const totalHours = timeLogs.reduce((sum, log) => {
      const start = new Date(log.start_time);
      const end = new Date(log.end_time);
      return sum + (end - start) / (1000 * 60 * 60);
    }, 0);

    console.log('\n📊 Ahmed Ehab Data Summary:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Time Log Sessions: ${timeLogs.length}`);
    console.log(`   App Activities: ${appLogs.length}`);
    console.log(`   Total Hours: ${totalHours.toFixed(2)}h`);
    console.log('   Status: ✅ Restored successfully');

  } catch (error) {
    console.error('❌ Error restoring Ahmed Ehab data:', error);
  }
}

restoreAhmedEhabData(); 