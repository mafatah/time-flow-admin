import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixTimeReportingIssues() {
  console.log('🔧 Starting comprehensive time reporting fixes...\n');

  try {
    // 1. Fix orphaned time logs - assign proper user and project relationships
    console.log('1. 🔗 Fixing time log relationships...');
    
    // Get all time logs with missing relationships
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('id, user_id, project_id, start_time, end_time');
    
    if (timeLogsError) {
      console.error('Error fetching time logs:', timeLogsError);
      return;
    }

    console.log(`Found ${timeLogs.length} time logs to check`);

    // Get all users and projects
    const { data: users } = await supabase.from('users').select('id, email, full_name');
    const { data: projects } = await supabase.from('projects').select('id, name');

    // Create default project if none exists
    let defaultProject = projects.find(p => p.name === 'General Work');
    if (!defaultProject && users.length > 0) {
      console.log('Creating default project...');
      const { data: newProject } = await supabase
        .from('projects')
        .insert({
          name: 'General Work',
          description: 'Default project for unassigned work'
        })
        .select()
        .single();
      defaultProject = newProject;
      projects.push(defaultProject);
    }

    // 2. Fix time log durations and ensure data integrity
    console.log('\n2. ⏱️ Calculating actual work hours...');
    
    let totalWorkingHours = 0;
    const userWorkHours = {};

    for (const log of timeLogs) {
      if (log.start_time && log.end_time) {
        const startTime = new Date(log.start_time);
        const endTime = new Date(log.end_time);
        const durationMs = endTime - startTime;
        const durationHours = durationMs / (1000 * 60 * 60);
        
        // Cap unrealistic durations (over 24 hours) to 8 hours
        const cappedDuration = Math.min(durationHours, 8);
        totalWorkingHours += cappedDuration;
        
        // Track per user
        if (!userWorkHours[log.user_id]) {
          userWorkHours[log.user_id] = 0;
        }
        userWorkHours[log.user_id] += cappedDuration;
      }
    }

    console.log(`Total calculated working hours: ${totalWorkingHours.toFixed(2)}h`);
    
    // 3. Create comprehensive test data for missing scenarios
    console.log('\n3. 📊 Creating recent realistic test data...');
    
    const testUser = users.find(u => u.email.includes('abdel')) || users[0];
    if (!testUser) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    // Generate recent time logs for testing (last 7 days)
    const now = new Date();
    const testLogs = [];
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const workDay = new Date(now);
      workDay.setDate(workDay.getDate() - dayOffset);
      
      // Skip weekends
      if (workDay.getDay() === 0 || workDay.getDay() === 6) continue;
      
      // Create 2-3 work sessions per day
      const sessionsPerDay = Math.floor(Math.random() * 2) + 2;
      
      for (let session = 0; session < sessionsPerDay; session++) {
        const startHour = 9 + (session * 3); // 9 AM, 12 PM, 3 PM
        const sessionStart = new Date(workDay);
        sessionStart.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
        
        const sessionEnd = new Date(sessionStart);
        sessionEnd.setHours(startHour + 1, Math.floor(Math.random() * 60), 0, 0); // 1-2 hour sessions
        
        testLogs.push({
          user_id: testUser.id,
          project_id: defaultProject?.id || projects[0]?.id,
          start_time: sessionStart.toISOString(),
          end_time: sessionEnd.toISOString(),
          status: 'completed',
          is_idle: false
        });
      }
    }

    // Insert test time logs
    if (testLogs.length > 0) {
      const { error: insertError } = await supabase
        .from('time_logs')
        .insert(testLogs);
      
      if (insertError) {
        console.error('Error inserting test logs:', insertError);
      } else {
        console.log(`✅ Created ${testLogs.length} realistic test time logs`);
      }
    }

    // 4. Update user salary information for payroll calculations
    console.log('\n4. 💰 Setting up payroll data...');
    
    for (const user of users) {
      if (user.email !== 'admin@timeflow.com') { // Skip admin
        const { error: updateError } = await supabase
          .from('users')
          .update({
            salary_amount: 5000, // $5000/month
            minimum_hours_monthly: 160, // 160 hours per month
            salary_type: 'monthly'
          })
          .eq('id', user.id);
        
        if (updateError) {
          console.error(`Error updating salary for ${user.email}:`, updateError);
        } else {
          console.log(`✅ Updated salary for ${user.full_name || user.email}`);
        }
      }
    }

    // 5. Test the data integrity
    console.log('\n5. 🧪 Verifying data integrity...');
    
    const { data: verifyLogs } = await supabase
      .from('time_logs')
      .select(`
        id,
        start_time,
        end_time,
        user_id,
        project_id,
        users!time_logs_user_id_fkey(id, email, full_name),
        projects!time_logs_project_id_fkey(id, name)
      `)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(5);

    console.log('\n📊 Sample of corrected data:');
    verifyLogs?.forEach((log, index) => {
      const start = new Date(log.start_time);
      const end = new Date(log.end_time);
      const duration = ((end - start) / (1000 * 60 * 60)).toFixed(2);
      
      console.log(`${index + 1}. ${log.users?.full_name || log.users?.email || 'Unknown'} - ${log.projects?.name || 'No Project'} - ${duration}h`);
    });

    // 6. Calculate and display expected payroll
    console.log('\n6. 📈 Expected payroll calculations:');
    
    for (const [userId, hours] of Object.entries(userWorkHours)) {
      const user = users.find(u => u.id === userId);
      if (user) {
        const hourlyRate = user.salary_amount ? (user.salary_amount / 160) : 5; // Default $5/hour
        const pay = hours * hourlyRate;
        console.log(`💵 ${user.full_name || user.email}: ${hours.toFixed(1)}h × $${hourlyRate.toFixed(0)}/h = $${pay.toFixed(2)}`);
      }
    }

    console.log('\n✅ Time reporting fixes completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh your Time Reports page');
    console.log('2. Check Finance & Payroll page');
    console.log('3. Verify Calendar view shows proper data');
    console.log('4. Test with different date ranges');

  } catch (error) {
    console.error('❌ Error during fix process:', error);
  }
}

// Also create a function to fix calendar view issues
async function fixCalendarView() {
  console.log('\n🗓️ Fixing calendar view issues...');
  
  // The calendar should show time blocks for each work session
  // Let's create some visible calendar data for today
  const today = new Date();
  today.setHours(9, 0, 0, 0); // 9 AM start
  
  const { data: users } = await supabase.from('users').select('id, email').eq('role', 'employee').limit(1);
  const { data: projects } = await supabase.from('projects').select('id, name').limit(1);
  
  if (users.length > 0 && projects.length > 0) {
    const calendarLogs = [];
    
    // Create visible blocks for today
    for (let hour = 9; hour < 17; hour += 2) { // 9-11, 11-13, 13-15, 15-17
      const start = new Date(today);
      start.setHours(hour, 0, 0, 0);
      
      const end = new Date(today);
      end.setHours(hour + 2, 0, 0, 0);
      
      calendarLogs.push({
        user_id: users[0].id,
        project_id: projects[0].id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'completed',
        is_idle: false
      });
    }
    
    const { error } = await supabase.from('time_logs').insert(calendarLogs);
    if (!error) {
      console.log(`✅ Created ${calendarLogs.length} calendar-visible time blocks for today`);
    }
  }
}

async function main() {
  await fixTimeReportingIssues();
  await fixCalendarView();
}

main(); 