require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'process.env.VITE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'process.env.VITE_SUPABASE_ANON_KEY';


// Environment variable validation
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmployeeFunctionality() {
  console.log('🧪 Testing Employee View Functionality\n');

  let allTestsPassed = true;
  const employeeUserId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d'; // employee@timeflow.com

  // Test 1: Employee Dashboard Data Fetching
  try {
    console.log('1️⃣ Testing Employee Dashboard Data...');
    
    // Test time logs fetch (main dashboard query)
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', employeeUserId)
      .limit(5);

    if (timeLogsError) throw timeLogsError;
    
    console.log(`   ✅ PASS: Employee can fetch time logs (${timeLogs.length} records)`);
  } catch (error) {
    console.log(`   ❌ FAIL: Employee dashboard data error - ${error.message}`);
    allTestsPassed = false;
  }

  // Test 2: Employee Idle Logs Fetching
  try {
    console.log('\n2️⃣ Testing Employee Idle Logs...');
    
    const { data: idleLogs, error: idleLogsError } = await supabase
      .from('idle_logs')
      .select(`
        id,
        idle_start,
        idle_end,
        duration_seconds,
        users!inner(email)
      `)
      .eq('user_id', employeeUserId)
      .limit(3);

    if (idleLogsError) throw idleLogsError;
    
    console.log(`   ✅ PASS: Employee can fetch idle logs with relationships (${idleLogs.length} records)`);
  } catch (error) {
    console.log(`   ❌ FAIL: Employee idle logs error - ${error.message}`);
    allTestsPassed = false;
  }

  // Test 3: Employee Projects Access
  try {
    console.log('\n3️⃣ Testing Employee Projects Access...');
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (projectsError) throw projectsError;
    
    console.log(`   ✅ PASS: Employee can access projects (${projects.length} projects)`);
  } catch (error) {
    console.log(`   ❌ FAIL: Employee projects access error - ${error.message}`);
    allTestsPassed = false;
  }

  // Test 4: Employee Time Tracking Operations
  try {
    console.log('\n4️⃣ Testing Employee Time Tracking Operations...');
    
    // Test creating a time log
    const { data: newTimeLog, error: createError } = await supabase
      .from('time_logs')
      .insert({
        user_id: employeeUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        start_time: new Date().toISOString(),
        status: 'active',
        is_idle: false
      })
      .select()
      .single();

    if (createError) throw createError;
    
    // Test updating the time log
    const { error: updateError } = await supabase
      .from('time_logs')
      .update({
        end_time: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', newTimeLog.id);

    if (updateError) throw updateError;
    
    console.log('   ✅ PASS: Employee can start and stop time tracking');
  } catch (error) {
    console.log(`   ❌ FAIL: Employee time tracking error - ${error.message}`);
    allTestsPassed = false;
  }

  // Test 5: Employee Active Session Detection
  try {
    console.log('\n5️⃣ Testing Employee Active Session Detection...');
    
    const { data: activeSessions, error: activeSessionError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', employeeUserId)
      .is('end_time', null);

    if (activeSessionError) throw activeSessionError;
    
    console.log(`   ✅ PASS: Employee can check active sessions (${activeSessions.length} active)`);
  } catch (error) {
    console.log(`   ❌ FAIL: Employee active session detection error - ${error.message}`);
    allTestsPassed = false;
  }

  // Test 6: Employee Screenshots Relationship
  try {
    console.log('\n6️⃣ Testing Employee Screenshots Access...');
    
    const { data: screenshots, error: screenshotsError } = await supabase
      .from('screenshots')
      .select(`
        id,
        captured_at,
        activity_percent,
        users!inner(email)
      `)
      .eq('user_id', employeeUserId)
      .limit(3);

    if (screenshotsError) throw screenshotsError;
    
    console.log(`   ✅ PASS: Employee can access screenshots with relationships (${screenshots.length} screenshots)`);
  } catch (error) {
    console.log(`   ❌ FAIL: Employee screenshots access error - ${error.message}`);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 EMPLOYEE FUNCTIONALITY TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (allTestsPassed) {
    console.log('🎉 ALL EMPLOYEE TESTS PASSED!');
    console.log('\n✅ Employee view functionality working correctly:');
    console.log('   • Dashboard data loading: ✅ Working');
    console.log('   • Idle logs display: ✅ Working');
    console.log('   • Projects access: ✅ Working');
    console.log('   • Time tracking start/stop: ✅ Working');
    console.log('   • Active session detection: ✅ Working');
    console.log('   • Screenshots relationship: ✅ Working');
    console.log('\n🚀 Employee users should be able to:');
    console.log('   • Log in and view their dashboard');
    console.log('   • Start and stop time tracking');
    console.log('   • View their time reports');
    console.log('   • See idle time analysis');
    console.log('   • Access all features without database errors');
  } else {
    console.log('❌ SOME EMPLOYEE TESTS FAILED!');
    console.log('⚠️  There may still be issues with employee functionality.');
  }
  console.log('='.repeat(60));

  return allTestsPassed;
}

// Run the test
testEmployeeFunctionality()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }); 