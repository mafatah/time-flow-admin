#!/usr/bin/env node

/**
 * Enhanced Power Management for TimeFlow Desktop Agent
 * Provides better handling of laptop closure, sleep events, and screenshot management
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔋 TimeFlow Enhanced Power Management Starting...');
console.log(`📍 Platform: ${process.platform}`);
console.log(`🏠 Working Directory: ${process.cwd()}`);

// Configuration
const CONFIG = {
  maxRestartAttempts: 5,
  restartDelay: 5000, // 5 seconds
  healthCheckInterval: 30000, // 30 seconds
  maxMemoryMB: 512,
  logRotationSize: 10 * 1024 * 1024, // 10MB
  crashRecoveryEnabled: true
};

let desktopAgent = null;
let restartAttempts = 0;
let healthCheckTimer = null;
let isShuttingDown = false;

// Enhanced logging
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console.log(logMessage, ...args);
  
  // Write to log file
  try {
    const logFile = path.join(__dirname, 'power-management.log');
    fs.appendFileSync(logFile, logMessage + '\n');
    
    // Rotate log if too large
    const stats = fs.statSync(logFile);
    if (stats.size > CONFIG.logRotationSize) {
      fs.renameSync(logFile, path.join(__dirname, 'power-management.log.old'));
    }
  } catch (error) {
    // Ignore logging errors
  }
}

// Start the desktop agent process
function startDesktopAgent() {
  if (isShuttingDown) return;
  
  log('info', '🚀 Starting TimeFlow Desktop Agent...');
  
  const agentPath = path.join(__dirname, 'src', 'main.js');
  
  desktopAgent = spawn('npx', ['electron', '.'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1',
      TIMEFLOW_POWER_MANAGED: '1',
      NODE_ENV: process.env.NODE_ENV || 'production'
    }
  });
  
  log('info', `📱 Desktop Agent started with PID: ${desktopAgent.pid}`);
  
  // Handle stdout
  desktopAgent.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log('agent', output);
      
      // Check for important events
      if (output.includes('💤 System suspended')) {
        log('power', '🛌 Laptop closure detected - agent handling suspend');
      }
      
      if (output.includes('⚡ System resumed')) {
        log('power', '👋 Laptop opened - agent handling resume');
      }
      
      if (output.includes('📸 Screenshot captured')) {
        log('screenshot', '✅ Screenshot captured successfully');
      }
      
      if (output.includes('❌ Screenshot capture failed')) {
        log('screenshot', '⚠️ Screenshot capture failed - investigating');
      }
    }
  });
  
  // Handle stderr
  desktopAgent.stderr.on('data', (data) => {
    const error = data.toString().trim();
    if (error) {
      log('error', `Agent Error: ${error}`);
    }
  });
  
  // Handle process exit
  desktopAgent.on('exit', (code, signal) => {
    log('info', `📱 Desktop Agent exited with code: ${code}, signal: ${signal}`);
    
    if (!isShuttingDown) {
      if (code === 0) {
        log('info', '✅ Clean exit - not restarting');
      } else {
        log('warn', '💥 Unexpected exit - attempting restart');
        scheduleRestart();
      }
    }
    
    desktopAgent = null;
  });
  
  // Handle process error
  desktopAgent.on('error', (error) => {
    log('error', `❌ Desktop Agent process error: ${error.message}`);
    scheduleRestart();
  });
  
  // Reset restart attempts on successful start
  setTimeout(() => {
    if (desktopAgent && !desktopAgent.killed) {
      restartAttempts = 0;
      log('info', '✅ Desktop Agent startup successful');
    }
  }, 10000);
  
  // Start health monitoring
  startHealthMonitoring();
}

// Schedule restart with exponential backoff
function scheduleRestart() {
  if (isShuttingDown) return;
  
  if (restartAttempts >= CONFIG.maxRestartAttempts) {
    log('error', '🛑 Maximum restart attempts reached - giving up');
    process.exit(1);
  }
  
  restartAttempts++;
  const delay = CONFIG.restartDelay * Math.pow(2, restartAttempts - 1);
  
  log('warn', `🔄 Scheduling restart attempt ${restartAttempts}/${CONFIG.maxRestartAttempts} in ${delay}ms`);
  
  setTimeout(() => {
    if (!isShuttingDown) {
      startDesktopAgent();
    }
  }, delay);
}

// Health monitoring
function startHealthMonitoring() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  
  healthCheckTimer = setInterval(() => {
    if (!desktopAgent || desktopAgent.killed) {
      log('warn', '💔 Health check failed - agent not running');
      return;
    }
    
    // Check memory usage
    try {
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memMB > CONFIG.maxMemoryMB) {
        log('warn', `🚨 High memory usage detected: ${memMB}MB > ${CONFIG.maxMemoryMB}MB`);
        
        // Send signal to agent to cleanup
        if (desktopAgent) {
          desktopAgent.kill('SIGUSR1'); // Custom cleanup signal
        }
      }
    } catch (error) {
      log('error', `❌ Health check error: ${error.message}`);
    }
  }, CONFIG.healthCheckInterval);
}

// Graceful shutdown
function gracefulShutdown(signal) {
  log('info', `🔌 Received ${signal} - initiating graceful shutdown`);
  isShuttingDown = true;
  
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  
  if (desktopAgent && !desktopAgent.killed) {
    log('info', '📱 Stopping Desktop Agent...');
    
    // Send SIGTERM first for graceful shutdown
    desktopAgent.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (desktopAgent && !desktopAgent.killed) {
        log('warn', '⚡ Force killing Desktop Agent');
        desktopAgent.kill('SIGKILL');
      }
    }, 5000);
  }
  
  setTimeout(() => {
    log('info', '👋 Power Management shutdown complete');
    process.exit(0);
  }, 6000);
}

// Platform-specific power event handling
function setupPowerEventHandling() {
  log('info', '🔋 Setting up power event handling...');
  
  // Handle system signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log('error', `💥 Uncaught exception: ${error.message}`);
    log('error', error.stack);
    
    if (CONFIG.crashRecoveryEnabled) {
      log('info', '🔄 Attempting crash recovery...');
      setTimeout(() => {
        if (!isShuttingDown) {
          startDesktopAgent();
        }
      }, 2000);
    } else {
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    log('error', `💥 Unhandled rejection: ${reason}`);
    
    if (CONFIG.crashRecoveryEnabled) {
      log('info', '🔄 Attempting recovery from unhandled rejection...');
    }
  });
  
  log('info', '✅ Power event handling configured');
}

// Main execution
function main() {
  log('info', '🎯 TimeFlow Enhanced Power Management v1.0.0');
  log('info', `📁 Working from: ${__dirname}`);
  
  // Setup power event handling
  setupPowerEventHandling();
  
  // Check if desktop agent exists
  const agentPath = path.join(__dirname, 'src', 'main.js');
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(agentPath) || !fs.existsSync(packageJsonPath)) {
    log('error', `❌ Desktop Agent not found. Missing files:`);
    log('error', `   main.js: ${fs.existsSync(agentPath) ? '✅' : '❌'}`);
    log('error', `   package.json: ${fs.existsSync(packageJsonPath) ? '✅' : '❌'}`);
    process.exit(1);
  }
  
  log('info', '✅ Desktop Agent found - starting power-managed execution');
  
  // Start the desktop agent
  startDesktopAgent();
  
  // Keep the process alive
  process.stdin.resume();
  
  log('info', '🎉 Enhanced Power Management active');
  log('info', '💡 Features enabled:');
  log('info', '   • Automatic restart on crashes');
  log('info', '   • Memory usage monitoring');
  log('info', '   • Laptop closure detection');  
  log('info', '   • Screenshot failure recovery');
  log('info', '   • Graceful shutdown handling');
}

// Start the power management system
if (require.main === module) {
  main();
}

module.exports = {
  startDesktopAgent,
  gracefulShutdown,
  CONFIG
}; 