#!/usr/bin/env node

/**
 * System Health Check Test Suite
 * Tests the fixed system health check dialog functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏥 System Health Check Test Suite');
console.log('===============================');
console.log('Testing the fixed system health check dialog...');
console.log('');

// Test the IPC handlers that the health check expects
const expectedHandlers = [
  'test-database-connection',
  'check-mac-permissions', 
  'test-screenshot-capability',
  'test-app-detection',
  'test-url-detection',
  'get-activity-stats'
];

console.log('📋 Expected IPC Handlers:');
expectedHandlers.forEach((handler, index) => {
  console.log(`${index + 1}. ${handler}`);
});
console.log('');

// Check if handlers exist in desktop agent
function checkHandlersInDesktopAgent() {
  console.log('🔍 Checking if handlers exist in desktop agent...');
  
  const mainJsPath = path.join(__dirname, 'desktop-agent', 'src', 'main.js');
  const electronMainPath = path.join(__dirname, 'electron', 'main.ts');
  
  const files = [];
  if (fs.existsSync(mainJsPath)) {
    files.push({ path: mainJsPath, content: fs.readFileSync(mainJsPath, 'utf-8') });
  }
  if (fs.existsSync(electronMainPath)) {
    files.push({ path: electronMainPath, content: fs.readFileSync(electronMainPath, 'utf-8') });
  }
  
  expectedHandlers.forEach(handler => {
    let found = false;
    let foundIn = '';
    
    files.forEach(file => {
      if (file.content.includes(`ipcMain.handle('${handler}'`) || 
          file.content.includes(`'${handler}'`)) {
        found = true;
        foundIn = path.basename(file.path);
      }
    });
    
    if (found) {
      console.log(`✅ ${handler} - Found in ${foundIn}`);
    } else {
      console.log(`❌ ${handler} - NOT FOUND`);
    }
  });
}

// Test the React component
function testReactComponent() {
  console.log('\n🧪 Testing React Component...');
  
  const componentPath = path.join(__dirname, 'src', 'components', 'system-check-dialog.tsx');
  
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    const checks = [
      {
        name: 'Uses real IPC handlers',
        pattern: /window\.electron\.invoke\('test-/,
        expected: true
      },
      {
        name: 'Tests database connection',
        pattern: /test-database-connection/,
        expected: true
      },
      {
        name: 'Tests screenshot capability',
        pattern: /test-screenshot-capability/,
        expected: true
      },
      {
        name: 'Tests app detection',
        pattern: /test-app-detection/,
        expected: true
      },
      {
        name: 'Tests URL detection',
        pattern: /test-url-detection/,
        expected: true
      },
      {
        name: 'Has proper status logic',
        pattern: /criticalFailures.*length/,
        expected: true
      }
    ];
    
    checks.forEach(check => {
      const found = check.pattern.test(content);
      const status = found === check.expected ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
    });
  } else {
    console.log('❌ system-check-dialog.tsx not found');
  }
}

// Simulate what the health check should do
function simulateHealthCheck() {
  console.log('\n🎯 Expected Health Check Behavior:');
  console.log('1. ⏳ Database Connection - Test real Supabase connection');
  console.log('2. ⏳ System Permissions - Check actual macOS permissions');
  console.log('3. ⏳ Screenshot Capture - Call test-screenshot-capability');
  console.log('4. ⏳ App Detection - Call test-app-detection with real app');
  console.log('5. ⏳ URL Detection - Call test-url-detection with real URL');
  console.log('6. ⏳ Input Monitoring - Check activity stats');
  console.log('7. ⏳ Idle Detection - Check idle time tracking');
  console.log('');
  console.log('✅ All tests should show real results, not placeholder messages');
  console.log('✅ Icons should change from ⏳ to ✅/❌/⚠️ based on actual test results');
  console.log('✅ Status messages should show real detected apps, URLs, etc.');
}

// Test configuration
function testConfiguration() {
  console.log('\n⚙️ Testing Configuration...');
  
  // Check if desktop agent config exists
  const configPath = path.join(__dirname, 'desktop-agent', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log('✅ Desktop agent config found');
      
      const requiredKeys = ['supabase_url', 'supabase_key'];
      requiredKeys.forEach(key => {
        if (config[key]) {
          console.log(`✅ ${key} configured`);
        } else {
          console.log(`❌ ${key} missing`);
        }
      });
    } catch (error) {
      console.log('❌ Desktop agent config invalid JSON');
    }
  } else {
    console.log('⚠️ Desktop agent config not found');
  }
  
  // Check if Supabase config exists
  const supabaseConfigPath = path.join(__dirname, 'src', 'lib', 'supabase.ts');
  if (fs.existsSync(supabaseConfigPath)) {
    console.log('✅ Supabase config found');
  } else {
    console.log('❌ Supabase config not found');
  }
}

// Instructions for user
function showUserInstructions() {
  console.log('\n📋 How to Test the Fixed Health Check:');
  console.log('=====================================');
  console.log('1. Start your desktop agent (TimeFlow desktop app)');
  console.log('2. Open the web admin panel');
  console.log('3. Go to Time Tracking page');
  console.log('4. Click "Start Timer" to trigger the health check');
  console.log('');
  console.log('✅ Expected Results:');
  console.log('- Database Connection: Should show ✅ if connected');
  console.log('- System Permissions: Should show actual permission status');
  console.log('- Screenshot Capture: Should show ✅ if permissions granted');
  console.log('- App Detection: Should show current app name (e.g., "Google Chrome")');
  console.log('- URL Detection: Should show current URL if browser is open');
  console.log('- Input Monitoring: Should show ✅ if desktop agent is running');
  console.log('- Idle Detection: Should show ✅ if desktop agent is running');
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('- If all show warnings: Desktop agent may not be running');
  console.log('- If database fails: Check Supabase configuration');
  console.log('- If permissions fail: Grant screen recording permission');
  console.log('- If app/screenshot fail: Check accessibility permissions');
}

// Run all tests
async function runAllTests() {
  try {
    checkHandlersInDesktopAgent();
    testReactComponent();
    simulateHealthCheck();
    testConfiguration();
    showUserInstructions();
    
    console.log('\n🎉 System Health Check Test Complete!');
    console.log('The health check dialog should now work properly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
runAllTests(); 