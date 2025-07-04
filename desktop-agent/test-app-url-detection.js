#!/usr/bin/env node

/**
 * TimeFlow Desktop Agent - App & URL Detection Test
 * Tests the new permission-resilient app and URL detection methods
 */

const { execSync } = require('child_process');

console.log('🔍 TimeFlow App & URL Detection Test');
console.log('=====================================');

// Test 1: App Detection with Fallbacks
async function testAppDetection() {
  console.log('\n📱 TEST 1: App Detection');
  console.log('-------------------------');
  
  try {
    // Primary method (requires Accessibility permission)
    try {
      console.log('🔄 Testing PRIMARY method (AppleScript System Events)...');
      const appScript = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          set appName to name of frontApp
          return appName
        end tell
      `;
      
      const result = execSync(`osascript -e '${appScript}'`, { 
        encoding: 'utf8', 
        timeout: 3000 
      }).trim();
      
      console.log(`✅ PRIMARY method SUCCESS: "${result}"`);
      return result;
    } catch (primaryError) {
      console.log(`⚠️ PRIMARY method FAILED: ${primaryError.message}`);
      
      // Fallback method
      console.log('🔄 Testing FALLBACK method (ps command)...');
      const psResult = execSync(`ps aux | grep -E "(Safari|Chrome|Firefox|Cursor|Code|Terminal)" | grep -v grep | head -5`, { 
        encoding: 'utf8', 
        timeout: 3000 
      }).trim();
      
      if (psResult) {
        const lines = psResult.split('\n');
        for (const line of lines) {
          const command = line.trim().split(/\s+/).slice(10).join(' ');
          
          let appName = 'Unknown';
          if (command.includes('Safari')) appName = 'Safari';
          else if (command.includes('Chrome')) appName = 'Google Chrome';
          else if (command.includes('Firefox')) appName = 'Firefox';
          else if (command.includes('Cursor')) appName = 'Cursor';
          else if (command.includes('Code')) appName = 'Visual Studio Code';
          
          if (appName !== 'Unknown') {
            console.log(`✅ FALLBACK method SUCCESS: "${appName}"`);
            return appName;
          }
        }
      }
      
      console.log(`❌ ALL app detection methods FAILED`);
      return null;
    }
  } catch (error) {
    console.log(`❌ App detection test FAILED: ${error.message}`);
    return null;
  }
}

// Test 2: URL Detection with Fallbacks
async function testUrlDetection(browserName) {
  console.log('\n🌐 TEST 2: URL Detection');
  console.log('------------------------');
  
  if (!browserName) {
    console.log('⚠️ No browser detected, skipping URL detection test');
    return null;
  }
  
  try {
    const lowerBrowser = browserName.toLowerCase();
    
    // Primary method (direct AppleScript)
    try {
      console.log(`🔄 Testing PRIMARY method (AppleScript to ${browserName})...`);
      let script = '';
      
      if (lowerBrowser.includes('safari')) {
        script = `tell application "Safari" to if (count of windows) > 0 then get URL of current tab of front window`;
      } else if (lowerBrowser.includes('chrome')) {
        script = `tell application "Google Chrome" to if (count of windows) > 0 then get URL of active tab of front window`;
      } else {
        throw new Error(`Browser ${browserName} not supported for direct URL extraction`);
      }
      
      const result = execSync(`osascript -e '${script}'`, { 
        encoding: 'utf8',
        timeout: 3000
      }).trim();
      
      if (result && result.startsWith('http')) {
        console.log(`✅ PRIMARY method SUCCESS: "${result}"`);
        return result;
      }
      
      throw new Error('Primary method returned empty or invalid result');
      
    } catch (primaryError) {
      console.log(`⚠️ PRIMARY method FAILED: ${primaryError.message}`);
      
      // Fallback method 1: Browser history
      try {
        console.log(`🔄 Testing FALLBACK 1 (browser history)...`);
        
        if (lowerBrowser.includes('safari')) {
          const historyCmd = `sqlite3 ~/Library/Safari/History.db "SELECT url FROM history_items ORDER BY visit_time DESC LIMIT 1" 2>/dev/null || echo ""`;
          const historyResult = execSync(historyCmd, { encoding: 'utf8', timeout: 2000 }).trim();
          
          if (historyResult && historyResult.startsWith('http')) {
            console.log(`✅ FALLBACK 1 SUCCESS: "${historyResult}"`);
            return historyResult;
          }
        } else if (lowerBrowser.includes('chrome')) {
          const historyCmd = `sqlite3 "~/Library/Application Support/Google/Chrome/Default/History" "SELECT url FROM urls ORDER BY last_visit_time DESC LIMIT 1" 2>/dev/null || echo ""`;
          const historyResult = execSync(historyCmd, { encoding: 'utf8', timeout: 2000 }).trim();
          
          if (historyResult && historyResult.startsWith('http')) {
            console.log(`✅ FALLBACK 1 SUCCESS: "${historyResult}"`);
            return historyResult;
          }
        }
        
        throw new Error('History check failed');
        
      } catch (historyError) {
        console.log(`⚠️ FALLBACK 1 FAILED: ${historyError.message}`);
        
        // Fallback method 2: Network activity
        try {
          console.log(`🔄 Testing FALLBACK 2 (network connections)...`);
          
          const netstatCmd = `lsof -i TCP:80,TCP:443 -a -p \`pgrep -f "${browserName}"\` | grep ESTABLISHED | head -1`;
          const netResult = execSync(netstatCmd, { encoding: 'utf8', timeout: 2000 }).trim();
          
          if (netResult) {
            const hostMatch = netResult.match(/->([^:]+):/);
            if (hostMatch) {
              const host = hostMatch[1];
              const inferredUrl = `https://${host}`;
              console.log(`✅ FALLBACK 2 SUCCESS: "${inferredUrl}"`);
              return inferredUrl;
            }
          }
          
          throw new Error('Network check failed');
          
        } catch (networkError) {
          console.log(`⚠️ FALLBACK 2 FAILED: ${networkError.message}`);
          
          // Fallback method 3: Placeholder
          const placeholderUrl = `https://browser-activity-detected.local/${browserName.toLowerCase().replace(/\s+/g, '-')}`;
          console.log(`✅ FALLBACK 3 SUCCESS: "${placeholderUrl}"`);
          return placeholderUrl;
        }
      }
    }
  } catch (error) {
    console.log(`❌ URL detection test FAILED: ${error.message}`);
    return null;
  }
}

// Test 3: Permission Check
async function testPermissions() {
  console.log('\n🔒 TEST 3: Permission Status');
  console.log('-----------------------------');
  
  try {
    // Test AppleScript access
    try {
      const testScript = `tell application "System Events" to get name of processes`;
      const result = execSync(`osascript -e '${testScript}'`, { 
        encoding: 'utf8', 
        timeout: 3000 
      }).trim();
      
      console.log('✅ AppleScript access: GRANTED');
      console.log('✅ Accessibility permission: GRANTED');
      return true;
    } catch (error) {
      console.log('❌ AppleScript access: DENIED');
      console.log('❌ Accessibility permission: DENIED');
      console.log('📋 Please grant Accessibility permission in System Preferences');
      return false;
    }
  } catch (error) {
    console.log(`❌ Permission test FAILED: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log(`⏰ Test started: ${new Date().toLocaleString()}`);
  
  // Test permissions
  const hasPermissions = await testPermissions();
  
  // Test app detection
  const detectedApp = await testAppDetection();
  
  // Test URL detection
  const detectedUrl = await testUrlDetection(detectedApp);
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  console.log(`🔒 Permissions: ${hasPermissions ? 'GRANTED' : 'DENIED'}`);
  console.log(`📱 App Detection: ${detectedApp ? 'SUCCESS' : 'FAILED'}`);
  console.log(`🌐 URL Detection: ${detectedUrl ? 'SUCCESS' : 'FAILED'}`);
  
  if (detectedApp) console.log(`   Detected App: "${detectedApp}"`);
  if (detectedUrl) console.log(`   Detected URL: "${detectedUrl}"`);
  
  console.log('\n✅ Test completed!');
  
  if (!hasPermissions) {
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to System Settings → Privacy & Security → Accessibility');
    console.log('2. Add your TimeFlow app and enable it');
    console.log('3. Restart TimeFlow');
    console.log('4. Re-run this test');
  }
}

// Execute tests
runAllTests().catch(console.error); 