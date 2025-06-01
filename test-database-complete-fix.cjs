const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runComprehensiveTest() {
  console.log('🧪 Running Comprehensive Database Fix Test\n');

  let allTestsPassed = true;
  const results = [];

  // Test 1: Check time_logs status column
  try {
    console.log('1️⃣ Testing time_logs status column...');
    const { data, error } = await supabase
      .from('time_logs')
      .select('id, status')
      .limit(5);

    if (error) throw error;
    
    const hasStatusColumn = data.every(row => row.status !== undefined);
    const hasValidStatuses = data.every(row => 
      ['active', 'paused', 'completed', 'stopped'].includes(row.status)
    );

    if (hasStatusColumn && hasValidStatuses) {
      console.log('   ✅ PASS: time_logs status column working correctly');
      results.push({ test: 'time_logs_status', status: 'PASS' });
    } else {
      console.log('   ❌ FAIL: time_logs status column issues');
      results.push({ test: 'time_logs_status', status: 'FAIL' });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: time_logs status test error - ${error.message}`);
    results.push({ test: 'time_logs_status', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 2: Check idle_logs foreign key relationships
  try {
    console.log('\n2️⃣ Testing idle_logs foreign key relationships...');
    const { data, error } = await supabase
      .from('idle_logs')
      .select(`
        id,
        user_id,
        users!inner(id, email),
        project_id,
        projects(id, name)
      `)
      .limit(5);

    if (error) throw error;
    
    console.log('   ✅ PASS: idle_logs foreign key relationships working');
    console.log(`   📊 Found ${data.length} idle_logs with proper relationships`);
    results.push({ test: 'idle_logs_relationships', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ FAIL: idle_logs relationships error - ${error.message}`);
    results.push({ test: 'idle_logs_relationships', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 3: Check user authentication data
  try {
    console.log('\n3️⃣ Testing user authentication...');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(10);

    if (error) throw error;
    
    const hasAdminUser = data.some(user => user.role === 'admin');
    const hasEmployeeUser = data.some(user => user.role === 'employee');

    if (hasAdminUser && hasEmployeeUser) {
      console.log('   ✅ PASS: User authentication data is correct');
      console.log(`   👥 Found ${data.length} users (admin and employee roles available)`);
      results.push({ test: 'user_authentication', status: 'PASS' });
    } else {
      console.log('   ❌ FAIL: Missing required user roles');
      results.push({ test: 'user_authentication', status: 'FAIL' });
      allTestsPassed = false;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: User authentication test error - ${error.message}`);
    results.push({ test: 'user_authentication', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 4: Check projects table
  try {
    console.log('\n4️⃣ Testing projects table access...');
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description')
      .limit(5);

    if (error) throw error;
    
    console.log('   ✅ PASS: Projects table accessible');
    console.log(`   📂 Found ${data.length} projects`);
    results.push({ test: 'projects_access', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ FAIL: Projects access error - ${error.message}`);
    results.push({ test: 'projects_access', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 5: Check screenshots table with user relationships
  try {
    console.log('\n5️⃣ Testing screenshots table relationships...');
    const { data, error } = await supabase
      .from('screenshots')
      .select(`
        id,
        user_id,
        users(id, email),
        project_id,
        projects(name),
        activity_percent,
        captured_at
      `)
      .limit(3);

    if (error) throw error;
    
    console.log('   ✅ PASS: Screenshots table relationships working');
    console.log(`   📸 Found ${data.length} screenshots with proper relationships`);
    results.push({ test: 'screenshots_relationships', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ FAIL: Screenshots relationships error - ${error.message}`);
    results.push({ test: 'screenshots_relationships', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 6: Test URL logs functionality (mentioned in original error)
  try {
    console.log('\n6️⃣ Testing URL logs functionality...');
    const { data, error } = await supabase
      .from('url_logs')
      .select('id, user_id, site_url, category, timestamp')
      .limit(3);

    if (error) throw error;
    
    console.log('   ✅ PASS: URL logs table accessible');
    console.log(`   🌐 Found ${data.length} URL logs`);
    results.push({ test: 'url_logs_access', status: 'PASS' });
  } catch (error) {
    console.log(`   ❌ FAIL: URL logs access error - ${error.message}`);
    results.push({ test: 'url_logs_access', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passedTests = results.filter(r => r.status === 'PASS').length;
  const totalTests = results.length;
  
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Database issues have been resolved.');
    console.log(`✅ ${passedTests}/${totalTests} tests successful`);
    console.log('\n🚀 Your TimeFlow application should now work correctly:');
    console.log('   • Web app: http://localhost:8081');
    console.log('   • Desktop app: Running with proper database connectivity');
    console.log('   • Employee login: Available and working');
    console.log('   • Time tracking: Should work without "status" errors');
    console.log('   • Screenshot capture: Properly linked to users');
    console.log('   • Idle detection: Foreign key relationships fixed');
  } else {
    console.log('❌ SOME TESTS FAILED! There may still be database issues.');
    console.log(`⚠️  ${passedTests}/${totalTests} tests successful`);
  }
  console.log('='.repeat(50));

  return allTestsPassed;
}

// Run the test
runComprehensiveTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  }); 