#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Testing URL Detection and Tab Change Detection...\n');

// Test AppleScript access for different browsers
async function testBrowserUrlExtraction() {
  console.log('1. Testing browser URL extraction capabilities...');
  
  const browsers = ['Safari', 'Google Chrome', 'Firefox', 'Microsoft Edge'];
  
  for (const browser of browsers) {
    try {
      console.log(`\n   Testing ${browser}...`);
      
      let script = '';
      if (browser === 'Safari') {
        script = `
          tell application "Safari"
            if (count of windows) > 0 then
              get URL of current tab of front window
            end if
          end tell
        `;
      } else if (browser === 'Google Chrome') {
        script = `
          tell application "Google Chrome"
            if (count of windows) > 0 then
              get URL of active tab of front window
            end if
          end tell
        `;
      } else if (browser === 'Firefox') {
        script = `
          tell application "System Events"
            tell process "Firefox"
              try
                set windowTitle to name of front window
                return windowTitle
              end try
            end tell
          end tell
        `;
      } else if (browser === 'Microsoft Edge') {
        script = `
          tell application "Microsoft Edge"
            if (count of windows) > 0 then
              get URL of active tab of front window
            end if
          end tell
        `;
      }
      
      const result = execSync(`osascript -e '${script}'`, { 
        encoding: 'utf8',
        timeout: 3000
      }).trim();
      
      if (result && result !== '') {
        if (result.startsWith('http')) {
          console.log(`   ✅ ${browser}: ${result}`);
        } else {
          console.log(`   🔍 ${browser}: ${result} (not a URL)`);
        }
      } else {
        console.log(`   ⚠️  ${browser}: No result (browser might not be open)`);
      }
    } catch (error) {
      console.log(`   ❌ ${browser}: ${error.message}`);
    }
  }
}

// Test rapid URL change detection
async function testTabChangeDetection() {
  console.log('\n\n2. Testing tab change detection...');
  console.log('   Please open a browser and switch between different tabs/URLs');
  console.log('   This test will check URLs every 2 seconds for 30 seconds');
  
  let lastUrl = '';
  let changeCount = 0;
  
  for (let i = 0; i < 15; i++) {
    try {
      // Test Chrome first (most common)
      const chromeScript = `
        tell application "Google Chrome"
          if (count of windows) > 0 then
            get URL of active tab of front window
          end if
        end tell
      `;
      
      const result = execSync(`osascript -e '${chromeScript}'`, { 
        encoding: 'utf8',
        timeout: 2000
      }).trim();
      
      if (result && result.startsWith('http')) {
        if (result !== lastUrl) {
          changeCount++;
          console.log(`   🔄 URL Change #${changeCount}: ${result}`);
          lastUrl = result;
        } else {
          console.log(`   ➡️  Same URL: ${result.substring(0, 50)}...`);
        }
      } else {
        console.log(`   ⚠️  No Chrome URL detected`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n   📊 Total URL changes detected: ${changeCount}`);
  
  if (changeCount > 0) {
    console.log('   ✅ Tab change detection is working!');
  } else {
    console.log('   ⚠️  No tab changes detected. Try switching tabs in Chrome.');
  }
}

// Test the actual desktop agent detection
function testDesktopAgentDetection() {
  console.log('\n\n3. Testing desktop agent URL detection...');
  console.log('   Make sure the desktop agent is running with tracking enabled');
  console.log('   Check the agent logs for URL capture messages');
  console.log('   Look for messages like:');
  console.log('   🔗 [URL-CAPTURE] 🆕 NEW URL DETECTED [TAB-MONITOR]');
  console.log('   🔍 [TAB-MONITOR] Checking tab changes in active browser');
}

// Run all tests
async function runAllTests() {
  try {
    await testBrowserUrlExtraction();
    await testTabChangeDetection();
    testDesktopAgentDetection();
    
    console.log('\n\n🎯 TEST SUMMARY:');
    console.log('   1. Run the desktop agent with: cd desktop-agent && npm start');
    console.log('   2. Start tracking a project');
    console.log('   3. Open a browser (Chrome recommended)');
    console.log('   4. Switch between different tabs/URLs');
    console.log('   5. Check the agent logs for tab change detection');
    console.log('   6. URLs should be captured within 2-5 seconds of tab changes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runAllTests(); 