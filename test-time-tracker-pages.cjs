require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { startOfDay, endOfDay, subDays } = require('date-fns');


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient('process.env.VITE_SUPABASE_URL', 'process.env.VITE_SUPABASE_ANON_KEY');

const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';

async function testTimeTrackerPages() {
  console.log('🧪 Testing Employee Time Tracker & Idle Time Pages');
  console.log('===================================================');

  console.log('\n1️⃣ Testing Time Tracker - Active Sessions Query...');
  try {
    const { data: activeSessions, error: activeError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .is('end_time', null);

    if (activeError) throw activeError;
    console.log(`   ✅ Active sessions: ${activeSessions.length} records`);
    if (activeSessions.length > 0) {
      console.log(`      Latest: Started ${activeSessions[0].start_time}, Status: ${activeSessions[0].status}`);
    }
  } catch (error) {
    console.log(`   ❌ Active sessions error: ${error.message}`);
  }

  console.log('\n2️⃣ Testing Time Tracker - Recent Sessions Query...');
  try {
    const { data: recentSessions, error: recentError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', userId)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;
    console.log(`   ✅ Recent sessions: ${recentSessions.length} records`);
    recentSessions.forEach((session, i) => {
      const duration = session.end_time ? 
        Math.floor((new Date(session.end_time) - new Date(session.start_time)) / (1000 * 60)) : 0;
      console.log(`      ${i+1}. Duration: ${duration}min, Status: ${session.status}`);
    });
  } catch (error) {
    console.log(`   ❌ Recent sessions error: ${error.message}`);
  }

  console.log('\n3️⃣ Testing Idle Time Page Query...');
  try {
    const today = new Date();
    const startDate = subDays(today, 7); // Last 7 days
    const endDate = today;
    
    const startDateObj = startOfDay(startDate);
    const endDateObj = endOfDay(endDate);

    const { data: idleLogs, error: idleError } = await supabase
      .from('idle_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('idle_start', startDateObj.toISOString())
      .lte('idle_start', endDateObj.toISOString())
      .order('idle_start', { ascending: false });

    if (idleError) throw idleError;
    console.log(`   ✅ Idle logs (last 7 days): ${idleLogs.length} records`);
    idleLogs.slice(0, 3).forEach((log, i) => {
      const duration = log.duration_seconds ? Math.floor(log.duration_seconds / 60) : log.duration_minutes || 0;
      console.log(`      ${i+1}. Start: ${log.idle_start}, Duration: ${duration}min`);
    });
  } catch (error) {
    console.log(`   ❌ Idle logs error: ${error.message}`);
  }

  console.log('\n4️⃣ Testing Projects Query...');
  try {
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (projectsError) throw projectsError;
    console.log(`   ✅ Projects available: ${projects.length} projects`);
    projects.slice(0, 3).forEach((project, i) => {
      console.log(`      ${i+1}. ${project.name} (${project.id})`);
    });
  } catch (error) {
    console.log(`   ❌ Projects error: ${error.message}`);
  }

  console.log('\n📋 SUMMARY');
  console.log('===========');
  console.log('If Employee Time Tracker shows empty:');
  console.log('  • Check if there are recent completed sessions');
  console.log('  • Verify active sessions show properly');
  console.log('  • Ensure projects load for selection');
  console.log('');
  console.log('If Employee Idle Time shows empty:');
  console.log('  • Check if idle_logs table has data in date range');
  console.log('  • Verify date range picker is working');
  console.log('  • Check if duration calculations are correct');
}

testTimeTrackerPages().catch(console.error); 