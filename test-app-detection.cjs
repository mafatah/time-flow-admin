const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function testAppDetection() {
  console.log('🧪 Testing current app and URL detection...\n');

  try {
    // Test AppleScript app detection
    console.log('📱 Testing AppleScript app detection:');
    const { stdout: appName } = await execAsync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"');
    console.log(`✅ Current app: ${appName.trim()}\n`);

    // Test AppleScript window title detection
    console.log('🪟 Testing AppleScript window title detection:');
    try {
      const { stdout: windowTitle } = await execAsync('osascript -e \'tell application "System Events" to get title of front window of (first application process whose frontmost is true)\'');
      console.log(`✅ Current window: ${windowTitle.trim()}\n`);
    } catch (e) {
      console.log('❌ Window title detection failed\n');
    }

    // Test browser URL detection for Chrome
    console.log('🌐 Testing browser URL detection:');
    try {
      const { stdout: chromeUrl } = await execAsync('osascript -e \'tell application "Google Chrome" to get URL of active tab of front window\'');
      console.log(`✅ Chrome URL: ${chromeUrl.trim()}\n`);
    } catch (e) {
      console.log('❌ Chrome not active or URL detection failed\n');
    }

    // Test browser URL detection for Safari
    try {
      const { stdout: safariUrl } = await execAsync('osascript -e \'tell application "Safari" to get URL of front document\'');
      console.log(`✅ Safari URL: ${safariUrl.trim()}\n`);
    } catch (e) {
      console.log('❌ Safari not active or URL detection failed\n');
    }

    // Test active-win if available
    console.log('🔧 Testing active-win detection:');
    try {
      const activeWin = require('active-win');
      const activeWindow = await activeWin();
      if (activeWindow) {
        console.log(`✅ Active-win app: ${activeWindow.owner?.name || 'Unknown'}`);
        console.log(`✅ Active-win window: ${activeWindow.title || 'Unknown'}`);
        console.log(`✅ Active-win URL: ${activeWindow.url || 'No URL'}\n`);
      }
    } catch (e) {
      console.log(`❌ Active-win failed: ${e.message}\n`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test every 5 seconds for real-time monitoring
console.log('🚀 Starting real-time app/URL detection test...');
console.log('💡 Switch between different apps and websites to test detection\n');

testAppDetection();
setInterval(testAppDetection, 5000); 