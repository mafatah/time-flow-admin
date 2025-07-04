#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧪 Testing Desktop Agent Enhanced URL Detection...\n');

// Check if desktop agent is running
function checkDesktopAgentStatus() {
  console.log('1. Checking Desktop Agent Status...');
  try {
    const processes = execSync('ps aux | grep -i electron', { encoding: 'utf8' });
    const desktopAgentProcess = processes.split('\n').find(line => 
      line.includes('desktop-agent') && line.includes('Electron.app')
    );
    
    if (desktopAgentProcess) {
      console.log('   ✅ Desktop Agent is running');
      const pid = desktopAgentProcess.trim().split(/\s+/)[1];
      console.log(`   📱 Process ID: ${pid}`);
      return true;
    } else {
      console.log('   ❌ Desktop Agent is not running');
      console.log('   💡 Start it with: cd desktop-agent && npm start');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error checking agent status:', error.message);
    return false;
  }
}

// Check agent logs for URL detection features
function checkUrlDetectionLogs() {
  console.log('\n2. Checking Agent Logs for URL Detection Features...');
  try {
    const logPath = 'desktop-agent/agent-logs.txt';
    if (!fs.existsSync(logPath)) {
      console.log('   ⚠️  No agent logs found');
      return false;
    }
    
    const logs = fs.readFileSync(logPath, 'utf8');
    
    // Check for enhanced URL detection initialization
    const hasEnhancedUrlCapture = logs.includes('ENHANCED EVENT-DRIVEN URL capture');
    const hasTabMonitoring = logs.includes('tab change detection');
    const hasUrlCaptureStart = logs.includes('[URL-CAPTURE]');
    
    console.log('   🔍 Enhanced URL Capture:', hasEnhancedUrlCapture ? '✅' : '❌');
    console.log('   🔄 Tab Change Detection:', hasTabMonitoring ? '✅' : '❌');
    console.log('   🌐 URL Capture Active:', hasUrlCaptureStart ? '✅' : '❌');
    
    if (hasEnhancedUrlCapture && hasTabMonitoring) {
      console.log('   ✅ Enhanced URL detection features are active!');
      return true;
    } else {
      console.log('   ⚠️  Enhanced URL detection features not detected in logs');
      console.log('   💡 Try starting tracking in the desktop agent');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error reading logs:', error.message);
    return false;
  }
}

// Test manual URL detection
async function testManualUrlDetection() {
  console.log('\n3. Testing Manual URL Detection...');
  
  try {
    // Test Chrome URL detection
    const chromeScript = `
      tell application "Google Chrome"
        if (count of windows) > 0 then
          get URL of active tab of front window
        end if
      end tell
    `;
    
    const result = execSync(`osascript -e '${chromeScript}'`, { 
      encoding: 'utf8',
      timeout: 3000
    }).trim();
    
    if (result && result.startsWith('http')) {
      console.log('   ✅ Current Chrome URL:', result);
      console.log('   🔄 The agent should detect this URL every 2 seconds if tracking is active');
      return true;
    } else {
      console.log('   ⚠️  No Chrome URL detected - open Chrome with a webpage');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Manual URL detection failed:', error.message);
    return false;
  }
}

// Monitor logs for URL detection activity
function monitorUrlDetectionActivity() {
  console.log('\n4. Monitoring URL Detection Activity...');
  console.log('   📝 Watching agent logs for URL detection messages...');
  console.log('   🔄 Switch browser tabs to trigger detection');
  console.log('   ⏱️  Monitoring for 30 seconds...\n');
  
  const logPath = 'desktop-agent/agent-logs.txt';
  let initialLogSize = 0;
  
  try {
    initialLogSize = fs.statSync(logPath).size;
  } catch (error) {
    console.log('   ❌ Cannot access log file');
    return;
  }
  
  let detectionCount = 0;
  const startTime = Date.now();
  
  const monitorInterval = setInterval(() => {
    try {
      const currentLogSize = fs.statSync(logPath).size;
      
      if (currentLogSize > initialLogSize) {
        const logs = fs.readFileSync(logPath, 'utf8');
        const newLogs = logs.slice(initialLogSize);
        
        // Check for URL detection messages
        const urlDetectionMessages = newLogs.split('\n').filter(line => 
          line.includes('[URL-CAPTURE]') || 
          line.includes('[TAB-MONITOR]') || 
          line.includes('NEW URL DETECTED')
        );
        
        if (urlDetectionMessages.length > 0) {
          detectionCount += urlDetectionMessages.length;
          console.log(`   🔗 ${urlDetectionMessages.length} new URL detection messages:`);
          urlDetectionMessages.forEach(msg => console.log(`      ${msg.trim()}`));
        }
        
        initialLogSize = currentLogSize;
      }
      
      // Stop after 30 seconds
      if (Date.now() - startTime > 30000) {
        clearInterval(monitorInterval);
        console.log(`\n   📊 Monitoring complete: ${detectionCount} URL detection events detected`);
        
        if (detectionCount > 0) {
          console.log('   ✅ Enhanced URL detection is working!');
        } else {
          console.log('   ⚠️  No URL detection activity - try switching browser tabs');
        }
      }
    } catch (error) {
      clearInterval(monitorInterval);
      console.log('   ❌ Error monitoring logs:', error.message);
    }
  }, 1000);
}

// Run all tests
async function runTests() {
  const agentRunning = checkDesktopAgentStatus();
  if (!agentRunning) return;
  
  const urlFeaturesActive = checkUrlDetectionLogs();
  await testManualUrlDetection();
  
  if (urlFeaturesActive) {
    monitorUrlDetectionActivity();
  } else {
    console.log('\n💡 To test enhanced URL detection:');
    console.log('   1. Start tracking in the desktop agent');  
    console.log('   2. Open a browser (Chrome recommended)');
    console.log('   3. Switch between different tabs/URLs');
    console.log('   4. Check agent logs for [TAB-MONITOR] messages');
  }
}

runTests(); 