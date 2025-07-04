const fs = require('fs');
const path = require('path');

// Create debug log file
const debugLogPath = path.join(__dirname, 'debug-timer-screenshots.log');

function debugLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  fs.appendFileSync(debugLogPath, logEntry);
}

// Monitor TimeFlow Agent processes
function monitorAgentProcesses() {
  debugLog('=== AGENT PROCESS MONITOR STARTED ===');
  
  setInterval(() => {
    const { exec } = require('child_process');
    
    exec('ps aux | grep -i timeflow | grep -v grep', (error, stdout, stderr) => {
      if (error) {
        debugLog('❌ Error checking TimeFlow processes: ' + error.message);
        return;
      }
      
      const processes = stdout.trim().split('\n').filter(line => line.length > 0);
      debugLog(`📊 TIMEFLOW PROCESSES (${processes.length} active):`);
      
      processes.forEach((process, index) => {
        const parts = process.split(/\s+/);
        const pid = parts[1];
        const cpu = parts[2];
        const mem = parts[3];
        const processName = parts.slice(10).join(' ').substring(0, 80);
        debugLog(`   ${index + 1}. PID:${pid} CPU:${cpu}% MEM:${mem}% - ${processName}`);
      });
      
      if (processes.length === 0) {
        debugLog('⚠️ NO TIMEFLOW PROCESSES RUNNING!');
      }
    });
  }, 15000); // Every 15 seconds
}

// Monitor log file creation
function monitorLogFiles() {
  debugLog('=== LOG FILE MONITOR STARTED ===');
  
  const agentLogPath = path.join(__dirname, 'desktop-agent', 'agent-logs.txt');
  let lastLogSize = 0;
  
  setInterval(() => {
    try {
      if (fs.existsSync(agentLogPath)) {
        const stats = fs.statSync(agentLogPath);
        const currentSize = stats.size;
        
        if (currentSize > lastLogSize) {
          debugLog(`📝 AGENT LOG ACTIVITY: File grew from ${lastLogSize} to ${currentSize} bytes`);
          
          // Read new content
          const content = fs.readFileSync(agentLogPath, 'utf8');
          const lines = content.split('\n');
          const newLines = lines.slice(-5); // Last 5 lines
          
          debugLog('📄 RECENT AGENT LOG ENTRIES:');
          newLines.forEach(line => {
            if (line.trim()) {
              debugLog(`   > ${line.trim()}`);
            }
          });
          
          lastLogSize = currentSize;
        } else if (currentSize === lastLogSize && lastLogSize > 0) {
          debugLog('⚠️ AGENT LOG: No new activity detected');
        }
      } else {
        debugLog('❌ AGENT LOG: File does not exist - agent not logging');
      }
    } catch (error) {
      debugLog('❌ Error monitoring log file: ' + error.message);
    }
  }, 10000); // Every 10 seconds
}

// Test server connectivity
function testServerConnectivity() {
  debugLog('=== SERVER CONNECTIVITY TEST ===');
  
  const { exec } = require('child_process');
  
  const servers = [
    'https://fkpiqcxkmrtaetvfgcli.supabase.co',
    'https://wfrvoauijbtnwzlhsiwf.supabase.co',
    'https://timeflow-admin.netlify.app'
  ];
  
  servers.forEach(server => {
    exec(`curl -s -o /dev/null -w "%{http_code}" "${server}"`, (error, stdout, stderr) => {
      if (error) {
        debugLog(`❌ CONNECTIVITY: ${server} - ERROR: ${error.message}`);
      } else {
        debugLog(`🌐 CONNECTIVITY: ${server} - HTTP ${stdout.trim()}`);
      }
    });
  });
}

// Monitor screenshot directory
function monitorScreenshots() {
  debugLog('=== SCREENSHOT MONITOR STARTED ===');
  
  const screenshotDir = path.join(__dirname, 'desktop-agent', 'screenshots');
  
  if (!fs.existsSync(screenshotDir)) {
    debugLog('⚠️ SCREENSHOTS: Directory does not exist');
    return;
  }
  
  setInterval(() => {
    try {
      const files = fs.readdirSync(screenshotDir);
      const recentFiles = files
        .map(file => ({
          name: file,
          stats: fs.statSync(path.join(screenshotDir, file))
        }))
        .filter(file => {
          const ageMinutes = (Date.now() - file.stats.mtime.getTime()) / (1000 * 60);
          return ageMinutes < 10; // Files created in last 10 minutes
        });
      
      if (recentFiles.length > 0) {
        debugLog(`📸 SCREENSHOTS: ${recentFiles.length} files created in last 10 minutes`);
        recentFiles.forEach(file => {
          const ageMinutes = Math.round((Date.now() - file.stats.mtime.getTime()) / (1000 * 60));
          debugLog(`   - ${file.name} (${ageMinutes}m ago, ${Math.round(file.stats.size/1024)}KB)`);
        });
      } else {
        debugLog('⚠️ SCREENSHOTS: No recent screenshots detected');
      }
    } catch (error) {
      debugLog('❌ Error monitoring screenshots: ' + error.message);
    }
  }, 30000); // Every 30 seconds
}

// Start all monitoring
debugLog('🚀 STARTING COMPREHENSIVE TIMER & SCREENSHOT DEBUG MONITORING');
debugLog('📁 Debug log file: ' + debugLogPath);

monitorAgentProcesses();
monitorLogFiles();
monitorScreenshots();

// Test connectivity immediately and every 60 seconds
testServerConnectivity();
setInterval(testServerConnectivity, 60000);

debugLog('✅ All monitoring systems activated');
console.log('🔍 Debug monitoring running... Check debug-timer-screenshots.log for details');
console.log('Press Ctrl+C to stop monitoring'); 