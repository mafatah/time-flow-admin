import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🧪 Testing Complete Idle System...\n');

async function testIdleLogsTable() {
  console.log('📊 Test 1: Idle Logs Table');
  
  try {
    // Test table access
    const { data, error } = await supabase
      .from('idle_logs')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Table access failed:', error.message);
      return false;
    }
    
    console.log('✅ Table accessible');
    console.log(`📈 Found ${data.length} existing idle logs`);
    
    if (data.length > 0) {
      console.log('📋 Sample entries:');
      data.forEach((entry, i) => {
        const start = new Date(entry.idle_start).toLocaleString();
        const duration = entry.duration_minutes || 'N/A';
        console.log(`   ${i + 1}. ${start} - ${duration} minutes`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Test failed:', error);
    return false;
  }
}

async function testIdleLogInsertion() {
  console.log('\n📝 Test 2: Idle Log Insertion');
  
  try {
    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    const projectId = '00000000-0000-0000-0000-000000000001';
    
    const now = new Date();
    const idleStart = new Date(now.getTime() - 3 * 60 * 1000); // 3 minutes ago
    
    const testIdleLog = {
      user_id: userId,
      project_id: projectId,
      idle_start: idleStart.toISOString(),
      idle_end: now.toISOString(),
      duration_minutes: 3
    };
    
    const { data, error } = await supabase
      .from('idle_logs')
      .insert(testIdleLog)
      .select();
    
    if (error) {
      console.log('❌ Insert failed:', error.message);
      return false;
    }
    
    console.log('✅ Test idle log inserted successfully');
    console.log('📊 Inserted data:', {
      id: data[0].id,
      duration_minutes: data[0].duration_minutes,
      idle_start: new Date(data[0].idle_start).toLocaleString()
    });
    
    return data[0].id;
  } catch (error) {
    console.log('❌ Test failed:', error);
    return false;
  }
}

async function testDesktopAgentStatus() {
  console.log('\n🖥️  Test 3: Desktop Agent Status');
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Check for electron processes
    const { stdout } = await execAsync('ps aux | grep -i electron | grep time-flow | grep -v grep');
    const electronRunning = stdout.trim().length > 0;
    
    console.log(`${electronRunning ? '✅' : '❌'} Desktop agent: ${electronRunning ? 'Running' : 'Not running'}`);
    
    if (electronRunning) {
      const processes = stdout.trim().split('\n').length;
      console.log(`📊 Found ${processes} Electron processes`);
      console.log('🔧 Agent should be monitoring idle time with 60-second threshold');
    } else {
      console.log('💡 Start desktop agent with: npm run electron');
    }
    
    return electronRunning;
  } catch (error) {
    console.log('❌ Could not check desktop agent status');
    return false;
  }
}

async function testWebInterface() {
  console.log('\n🌐 Test 4: Web Interface');
  
  try {
    const response = await fetch('http://localhost:8080');
    const webRunning = response.ok;
    
    console.log(`${webRunning ? '✅' : '❌'} Web interface: ${webRunning ? 'Running' : 'Not running'}`);
    
    if (webRunning) {
      console.log('🔗 Idle time page: http://localhost:8080/employee/idle-time');
      console.log('🧪 Manual test buttons available in the UI');
    } else {
      console.log('💡 Start web interface with: npm run dev');
    }
    
    return webRunning;
  } catch (error) {
    console.log('❌ Web interface not accessible');
    return false;
  }
}

async function testRecentActivity() {
  console.log('\n📈 Test 5: Recent Activity Data');
  
  try {
    const userId = '189a8371-8aaf-4551-9b33-8fed7f4cee5d';
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check recent screenshots
    const { data: screenshots, error: screenshotError } = await supabase
      .from('screenshots')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', oneHourAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (!screenshotError && screenshots) {
      console.log(`📸 Recent screenshots: ${screenshots.length}`);
      screenshots.forEach((s, i) => {
        const time = new Date(s.timestamp).toLocaleTimeString();
        const activity = s.activity_percent || 'N/A';
        console.log(`   ${i + 1}. ${time} - Activity: ${activity}%`);
      });
    }
    
    // Check recent app logs
    const { data: appLogs, error: appError } = await supabase
      .from('app_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', oneHourAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (!appError && appLogs) {
      console.log(`📱 Recent app logs: ${appLogs.length}`);
      appLogs.forEach((a, i) => {
        const time = new Date(a.timestamp).toLocaleTimeString();
        console.log(`   ${i + 1}. ${time} - ${a.app_name}`);
      });
    }
    
    // Check recent idle logs
    const { data: idleLogs, error: idleError } = await supabase
      .from('idle_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('idle_start', oneHourAgo.toISOString())
      .order('idle_start', { ascending: false })
      .limit(5);
    
    if (!idleError && idleLogs) {
      console.log(`😴 Recent idle logs: ${idleLogs.length}`);
      idleLogs.forEach((i, idx) => {
        const time = new Date(i.idle_start).toLocaleTimeString();
        const duration = i.duration_minutes || 'N/A';
        console.log(`   ${idx + 1}. ${time} - ${duration} minutes`);
      });
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error checking recent activity:', error);
    return false;
  }
}

async function cleanupTestData(testIdleLogId) {
  if (testIdleLogId) {
    console.log('\n🧹 Cleaning up test data...');
    try {
      const { error } = await supabase
        .from('idle_logs')
        .delete()
        .eq('id', testIdleLogId);
      
      if (!error) {
        console.log('✅ Test idle log cleaned up');
      }
    } catch (error) {
      console.log('⚠️ Could not clean up test data');
    }
  }
}

// Main test execution
async function runCompleteTest() {
  console.log('🎯 Starting complete idle system test...\n');
  
  const results = {
    tableAccess: false,
    dataInsertion: false,
    desktopAgent: false,
    webInterface: false,
    recentActivity: false
  };
  
  // Run all tests
  results.tableAccess = await testIdleLogsTable();
  const testIdleLogId = await testIdleLogInsertion();
  results.dataInsertion = !!testIdleLogId;
  results.desktopAgent = await testDesktopAgentStatus();
  results.webInterface = await testWebInterface();
  results.recentActivity = await testRecentActivity();
  
  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('=' .repeat(50));
  console.log(`📊 Idle Logs Table: ${results.tableAccess ? '✅ Working' : '❌ Failed'}`);
  console.log(`📝 Data Insertion: ${results.dataInsertion ? '✅ Working' : '❌ Failed'}`);
  console.log(`🖥️  Desktop Agent: ${results.desktopAgent ? '✅ Running' : '❌ Not Running'}`);
  console.log(`🌐 Web Interface: ${results.webInterface ? '✅ Running' : '❌ Not Running'}`);
  console.log(`📈 Recent Activity: ${results.recentActivity ? '✅ Data Found' : '❌ No Data'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All systems operational! Idle tracking is fully functional.');
  } else if (passedTests >= 3) {
    console.log('⚠️ Core functionality working, some components need attention.');
  } else {
    console.log('❌ Multiple issues detected, system needs setup.');
  }
  
  console.log('\n📋 Next Steps:');
  if (!results.desktopAgent) {
    console.log('1. 🖥️  Start desktop agent: npm run electron');
  }
  if (!results.webInterface) {
    console.log('2. 🌐 Start web interface: npm run dev');
  }
  if (results.tableAccess && results.dataInsertion) {
    console.log('3. ✅ Idle logging is ready - test with manual buttons in UI');
  }
  
  console.log('\n🔗 Access Points:');
  console.log('   Web UI: http://localhost:8080/employee/idle-time');
  console.log('   Supabase: https://supabase.com/dashboard/project/fkpiqcxkmrtaetvfgcli');
  
  // Cleanup
  await cleanupTestData(testIdleLogId);
  
  console.log('\n✅ Test complete!');
}

runCompleteTest().catch(console.error); 