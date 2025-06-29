const fs = require('fs');
const { exec } = require('child_process');

console.log('🔍 Starting Real-Time Timer & Agent Monitor');
console.log('📊 This will capture live data every 5 seconds');
console.log('🎯 Focus: Timer fluctuation + Agent status + Log creation');
console.log('----------------------------------------');

let counter = 0;

function logWithTime(message) {
  const timestamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
  console.log(`[${timestamp}] ${message}`);
}

function checkAgentStatus() {
  return new Promise((resolve) => {
    exec('ps aux | grep -i timeflow | grep -v grep | wc -l', (error, stdout) => {
      const processCount = stdout.trim();
      logWithTime(`📊 AGENT PROCESSES: ${processCount} running`);
      resolve(processCount);
    });
  });
}

function checkLogFiles() {
  return new Promise((resolve) => {
    const logPath = 'desktop-agent/agent-logs.txt';
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      const sizeKB = Math.round(stats.size / 1024);
      const ageMinutes = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60));
      logWithTime(`📝 AGENT LOG: ${sizeKB}KB (modified ${ageMinutes}m ago)`);
      resolve(true);
    } else {
      logWithTime(`❌ AGENT LOG: Not created yet`);
      resolve(false);
    }
  });
}

function checkServerConnection() {
  return new Promise((resolve) => {
    exec('curl -s -o /dev/null -w "%{http_code}" "https://fkpiqcxkmrtaetvfgcli.supabase.co/rest/v1/"', (error, stdout) => {
      const statusCode = stdout.trim();
      logWithTime(`🌐 SERVER: HTTP ${statusCode}`);
      resolve(statusCode);
    });
  });
}

async function monitorCycle() {
  counter++;
  logWithTime(`=== MONITOR CYCLE ${counter} ===`);
  
  await checkAgentStatus();
  await checkLogFiles();
  await checkServerConnection();
  
  // Check for screenshot directory activity
  try {
    const screenshotDir = 'desktop-agent/screenshots';
    if (fs.existsSync(screenshotDir)) {
      const files = fs.readdirSync(screenshotDir);
      const recentFiles = files.filter(file => {
        const filePath = `${screenshotDir}/${file}`;
        const stats = fs.statSync(filePath);
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        return ageMinutes < 15; // Files from last 15 minutes
      });
      logWithTime(`📸 SCREENSHOTS: ${recentFiles.length} recent files`);
    } else {
      logWithTime(`📸 SCREENSHOTS: Directory not found`);
    }
  } catch (error) {
    logWithTime(`📸 SCREENSHOTS: Error checking - ${error.message}`);
  }
  
  console.log('----------------------------------------');
}

// Run monitoring every 5 seconds
setInterval(monitorCycle, 5000);

// Initial run
monitorCycle();

console.log('\n👀 INSTRUCTIONS:');
console.log('1. Keep this running');
console.log('2. Go to your web TimeFlow interface');
console.log('3. Watch the timer - when it fluctuates, note the timestamps here');
console.log('4. Press Ctrl+C to stop monitoring\n'); 