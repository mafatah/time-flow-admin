const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

let lastApp = '';
let lastUrl = '';
let lastWindowTitle = '';

async function getCurrentDetection() {
  const results = {
    timestamp: new Date().toLocaleTimeString(),
    app: 'Unknown',
    windowTitle: 'Unknown', 
    url: 'No URL detected'
  };

  try {
    // Test AppleScript app detection
    const { stdout: appName } = await execAsync('osascript -e "tell application \\"System Events\\" to get name of first application process whose frontmost is true"');
    results.app = appName.trim();

    // Test AppleScript window title detection
    try {
      const { stdout: windowTitle } = await execAsync('osascript -e \'tell application "System Events" to get title of front window of (first application process whose frontmost is true)\'');
      results.windowTitle = windowTitle.trim();
    } catch (e) {
      results.windowTitle = 'No title available';
    }

    // Test URL detection for Chrome
    if (results.app === 'Google Chrome') {
      try {
        const { stdout: chromeUrl } = await execAsync('osascript -e \'tell application "Google Chrome" to get URL of active tab of first window\'');
        results.url = chromeUrl.trim();
      } catch (e) {
        results.url = 'Chrome URL not accessible';
      }
    }

    // Test URL detection for Safari
    if (results.app === 'Safari') {
      try {
        const { stdout: safariUrl } = await execAsync('osascript -e \'tell application "Safari" to get URL of current tab of first window\'');
        results.url = safariUrl.trim();
      } catch (e) {
        results.url = 'Safari URL not accessible';
      }
    }

  } catch (e) {
    results.app = `Error: ${e.message}`;
  }

  return results;
}

async function monitorDetection() {
  console.log('🚀 Starting real-time app/URL detection monitoring...');
  console.log('📱 Switch between different apps and websites now!\n');
  console.log('=' .repeat(80));

  setInterval(async () => {
    try {
      const current = await getCurrentDetection();
      
      // Only log if something changed
      if (current.app !== lastApp || current.url !== lastUrl || current.windowTitle !== lastWindowTitle) {
        console.log(`⏰ ${current.timestamp}`);
        console.log(`📱 App: ${current.app}`);
        console.log(`🪟 Window: ${current.windowTitle}`);
        console.log(`🌐 URL: ${current.url}`);
        
        // Highlight changes
        if (current.app !== lastApp) {
          console.log(`🔄 APP CHANGED: ${lastApp} → ${current.app}`);
        }
        if (current.url !== lastUrl && current.url !== 'No URL detected') {
          console.log(`🔄 URL CHANGED: ${current.url}`);
        }
        
        console.log('-'.repeat(80));
        
        lastApp = current.app;
        lastUrl = current.url;
        lastWindowTitle = current.windowTitle;
      }
    } catch (e) {
      console.error('❌ Detection error:', e.message);
    }
  }, 1000); // Check every second
}

// Also test active-win one more time
async function testActiveWin() {
  console.log('🧪 Testing active-win one more time...');
  try {
    const { stdout } = await execAsync('/Users/mohammedabdulfattah/time-flow-admin/build/electron/node_modules/active-win/main');
    const result = JSON.parse(stdout);
    console.log('✅ Active-win working:', result);
  } catch (e) {
    console.log('❌ Active-win still failing:', e.message.split('\n')[0]);
  }
  console.log('');
}

// Start monitoring
testActiveWin().then(() => {
  monitorDetection();
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🔚 Monitoring stopped. Final detection summary:');
  console.log(`Last detected app: ${lastApp}`);
  console.log(`Last detected URL: ${lastUrl}`);
  process.exit(0);
}); 