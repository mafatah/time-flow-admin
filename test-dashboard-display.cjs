const { createClient } = require('@supabase/supabase-js');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, differenceInMinutes, format } = require('date-fns');

const supabase = createClient('https://fkpiqcxkmrtaetvfgcli.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4');

const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';

async function testDashboardDisplay() {
  console.log('🧪 Testing Employee Dashboard Display Logic');
  console.log('===============================================');

  const today = new Date();
  const startOfToday = startOfDay(today);
  const endOfToday = endOfDay(today);
  const startOfThisWeek = startOfWeek(today);

  // Test today's time logs
  const { data: todayTimeLogs, error: todayError } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', startOfToday.toISOString())
    .lte('start_time', endOfToday.toISOString());

  if (todayError) {
    console.log('❌ Error fetching today logs:', todayError.message);
    return;
  }

  // Test today's idle logs
  const { data: idleLogs, error: idleError } = await supabase
    .from('idle_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('idle_start', startOfToday.toISOString())
    .lte('idle_start', endOfToday.toISOString());

  if (idleError) {
    console.log('❌ Error fetching idle logs:', idleError.message);
    return;
  }

  let todayHours = 0;
  let todayIdleTime = 0;

  console.log(`📊 Today's Time Logs (${todayTimeLogs.length} records):`);
  
  todayTimeLogs.forEach((log, i) => {
    const startTime = new Date(log.start_time);
    const endTime = log.end_time ? new Date(log.end_time) : new Date();
    const durationMinutes = differenceInMinutes(endTime, startTime);
    const hours = durationMinutes / 60;

    todayHours += hours;
    if (log.is_idle) {
      todayIdleTime += hours;
    }

    console.log(`  ${i+1}. Start: ${format(startTime, 'HH:mm')}, Duration: ${hours.toFixed(2)}h, Idle: ${log.is_idle}, Status: ${log.status}`);
  });

  console.log(`\n📊 Today's Idle Logs (${idleLogs.length} records):`);
  idleLogs.forEach((log, i) => {
    const durationSeconds = log.duration_seconds || 0;
    const durationMinutes = durationSeconds / 60;
    console.log(`  ${i+1}. Start: ${format(new Date(log.idle_start), 'HH:mm')}, Duration: ${durationMinutes.toFixed(1)}min`);
  });

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  console.log('\n📈 Employee Dashboard Should Display:');
  console.log(`  • Today's Work: ${formatTime(todayHours)}`);
  console.log(`  • Today's Active: ${formatTime(todayHours - todayIdleTime)}`);
  console.log(`  • Today's Idle Time: ${formatTime(todayIdleTime)}`);
  console.log(`  • Idle Periods: ${idleLogs.length} periods`);
  
  if (todayHours === 0 && idleLogs.length === 0) {
    console.log('\n⚠️  WARNING: No activity tracked today - dashboard will show empty');
    console.log('   Employee needs to start tracking time manually');
  } else {
    console.log('\n✅ Data available - dashboard should display properly');
  }

  // Test active session
  const { data: activeLog, error: activeError } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', userId)
    .is('end_time', null)
    .limit(1);

  if (!activeError && activeLog && activeLog.length > 0) {
    console.log('🟢 Active session detected - "Tracking" badge should show');
  } else {
    console.log('🔴 No active session - "Not Tracking" badge should show');
  }
}

testDashboardDisplay().catch(console.error); 