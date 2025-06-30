#!/usr/bin/env node

/**
 * Comprehensive TimeFlow Functionality Test
 * Tests: Timer Popup, Smart Detection, Database Saving
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
const TEST_USER_ID = '0c3d3092-913e-436f-a352-3378e558c34f'; // m_afatah@me.com

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 COMPREHENSIVE TIMEFLOW FUNCTIONALITY TEST');
console.log('='.repeat(50));

async function testDatabaseConnectivity() {
  console.log('\n📊 Testing Database Connectivity...');
  
  try {
    const { data, error, count } = await supabase
      .from('screenshots')
      .select('id', { count: 'exact' })
      .eq('user_id', TEST_USER_ID)
      .gte('captured_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connected successfully');
    console.log(`📸 Recent screenshots: ${count || 0}`);
    return true;
  } catch (error) {
    console.log('❌ Database test failed:', error.message);
    return false;
  }
}

async function testCurrentActivity() {
  console.log('\n🔍 Testing Current Activity Detection...');
  
  const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
  
  // Test screenshots
  const { data: screenshots } = await supabase
    .from('screenshots')
    .select('captured_at, app_name, url, activity_percent')
    .eq('user_id', TEST_USER_ID)
    .gte('captured_at', fiveMinutesAgo)
    .order('captured_at', { ascending: false })
    .limit(5);
  
  console.log(`📸 Recent Screenshots (${screenshots?.length || 0}):`);
  screenshots?.forEach((s, i) => {
    console.log(`  ${i + 1}. ${new Date(s.captured_at).toLocaleTimeString()}`);
    console.log(`     App: ${s.app_name || 'NULL'}`);
    console.log(`     URL: ${s.url || 'NULL'}`);
    console.log(`     Activity: ${s.activity_percent || 0}%`);
  });
  
  // Test app logs
  const { data: appLogs } = await supabase
    .from('app_logs')
    .select('timestamp, app_name, window_title')
    .eq('user_id', TEST_USER_ID)
    .gte('timestamp', fiveMinutesAgo)
    .order('timestamp', { ascending: false })
    .limit(5);
  
  console.log(`\n🖥️ Recent App Activity (${appLogs?.length || 0}):`);
  appLogs?.forEach((a, i) => {
    console.log(`  ${i + 1}. ${new Date(a.timestamp).toLocaleTimeString()}: ${a.app_name}`);
    console.log(`     Window: ${a.window_title?.substring(0, 50) || 'Unknown'}`);
  });
  
  // Test URL logs
  const { data: urlLogs } = await supabase
    .from('url_logs')
    .select('timestamp, url, browser')
    .eq('user_id', TEST_USER_ID)
    .gte('timestamp', fiveMinutesAgo)
    .order('timestamp', { ascending: false })
    .limit(5);
  
  console.log(`\n🌐 Recent URL Activity (${urlLogs?.length || 0}):`);
  urlLogs?.forEach((u, i) => {
    console.log(`  ${i + 1}. ${new Date(u.timestamp).toLocaleTimeString()}: ${u.url?.substring(0, 50) || 'Unknown'}`);
    console.log(`     Browser: ${u.browser || 'Unknown'}`);
  });
  
  return {
    screenshotsWithApps: screenshots?.filter(s => s.app_name && s.app_name !== 'Activity Monitor').length || 0,
    screenshotsWithUrls: screenshots?.filter(s => s.url).length || 0,
    appLogs: appLogs?.length || 0,
    urlLogs: urlLogs?.length || 0
  };
}

async function testTimerSystem() {
  console.log('\n⏰ Testing Timer System...');
  
  // Check for active sessions
  const { data: sessions } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1);
  
  if (sessions && sessions.length > 0) {
    const session = sessions[0];
    const startTime = new Date(session.start_time);
    const duration = Math.floor((Date.now() - startTime.getTime()) / 1000 / 60); // minutes
    
    console.log('✅ Active timer session found:');
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Started: ${startTime.toLocaleTimeString()}`);
    console.log(`   Duration: ${duration} minutes`);
    console.log(`   Project: ${session.project_id || 'Default'}`);
    
    return { hasActiveTimer: true, duration, sessionId: session.id };
  } else {
    console.log('⚠️ No active timer session found');
    console.log('💡 Start timer in TimeFlow app to test popup functionality');
    return { hasActiveTimer: false };
  }
}

async function testSmartDetectionFeatures() {
  console.log('\n🧠 Testing Smart Detection Features...');
  
  const results = await testCurrentActivity();
  
  const checks = [
    {
      name: 'Screenshots with Real Apps',
      current: results.screenshotsWithApps,
      expected: '>0',
      status: results.screenshotsWithApps > 0 ? '✅' : '❌'
    },
    {
      name: 'Screenshots with URLs',
      current: results.screenshotsWithUrls,
      expected: '>0 (if browsing)',
      status: results.screenshotsWithUrls > 0 ? '✅' : '⚠️'
    },
    {
      name: 'App Activity Logs',
      current: results.appLogs,
      expected: '>0',
      status: results.appLogs > 0 ? '✅' : '❌'
    },
    {
      name: 'URL Activity Logs',
      current: results.urlLogs,
      expected: '>0 (if browsing)',
      status: results.urlLogs > 0 ? '✅' : '⚠️'
    }
  ];
  
  console.log('\n📋 Smart Detection Status:');
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}: ${check.current} (expected: ${check.expected})`);
  });
  
  return checks;
}

async function generateTestRecommendations(checks, timerResult) {
  console.log('\n💡 TEST RECOMMENDATIONS:');
  
  // Timer recommendations
  if (!timerResult.hasActiveTimer) {
    console.log('\n⏰ TIMER TESTING:');
    console.log('   1. Open TimeFlow app');
    console.log('   2. Login with m_afatah@me.com');
    console.log('   3. Click "Start Tracking" button');
    console.log('   4. Verify popup appears with timer');
    console.log('   5. Check system tray for timer display');
  }
  
  // Smart detection recommendations
  const failedChecks = checks.filter(c => c.status === '❌');
  if (failedChecks.length > 0) {
    console.log('\n🧠 SMART DETECTION FIXES:');
    console.log('   1. Restart TimeFlow completely:');
    console.log('      pkill -f "TimeFlow" && npm run electron');
    console.log('   2. Check Accessibility permissions:');
    console.log('      System Settings → Privacy & Security → Accessibility');
    console.log('   3. Test with real activity:');
    console.log('      - Open Chrome/Safari and browse websites');
    console.log('      - Open VS Code or other apps');
    console.log('      - Switch between apps frequently');
  }
  
  // Activity recommendations
  console.log('\n🎯 ACTIVITY TESTING:');
  console.log('   1. Open different applications (Chrome, Safari, VS Code)');
  console.log('   2. Browse websites in multiple tabs');
  console.log('   3. Switch between apps every 30 seconds');
  console.log('   4. Wait 1-2 minutes and run this test again');
  
  console.log('\n🔄 To re-run this test:');
  console.log('   node comprehensive-functionality-test.js');
}

async function runComprehensiveTest() {
  try {
    // Test 1: Database connectivity
    const dbConnected = await testDatabaseConnectivity();
    if (!dbConnected) {
      console.log('\n❌ Critical: Database connection failed');
      process.exit(1);
    }
    
    // Test 2: Timer system
    const timerResult = await testTimerSystem();
    
    // Test 3: Smart detection
    const detectionChecks = await testSmartDetectionFeatures();
    
    // Test 4: Generate recommendations
    await generateTestRecommendations(detectionChecks, timerResult);
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Database: ${'✅ Connected'}`);
    console.log(`   Timer: ${timerResult.hasActiveTimer ? '✅ Active' : '⚠️ Inactive'}`);
    
    const passedChecks = detectionChecks.filter(c => c.status === '✅').length;
    const totalChecks = detectionChecks.length;
    console.log(`   Smart Detection: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks && timerResult.hasActiveTimer) {
      console.log('\n🎉 ALL SYSTEMS WORKING PERFECTLY!');
    } else {
      console.log('\n🔧 Some issues found - follow recommendations above');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the comprehensive test
runComprehensiveTest(); 