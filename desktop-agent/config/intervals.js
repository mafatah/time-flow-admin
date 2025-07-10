// ================================
// TimeFlow Desktop Agent - Centralized Intervals Configuration
// ================================

/**
 * All intervals and timing configurations in one place
 * Adjust these values to optimize performance vs functionality
 */

const INTERVALS = {
  // === CORE MONITORING INTERVALS ===
  
  // Idle detection - how often to check if user is idle
  IDLE_CHECK: 5000, // 5 seconds - optimal for responsive idle detection
  
  // Mouse activity tracking - how often to check mouse position/movement
  MOUSE_TRACKING: 10000, // 10 seconds - maximum performance optimization (reduced from 2000ms)
  
  // Keyboard activity tracking - how often to check for keyboard activity
  KEYBOARD_TRACKING: 10000, // 10 seconds - maximum performance optimization (reduced from 5000ms)
  
  // === CAPTURE INTERVALS ===
  
  // App capture throttling - minimum time between app captures
  APP_CAPTURE_THROTTLE: 3000, // 3 seconds - faster app switch detection (optimized from 5000ms)
  
  // URL capture throttling - minimum time between URL captures  
  URL_CAPTURE_THROTTLE: 5000, // 5 seconds
  
  // === SCREENSHOT INTERVALS ===
  
  // Random screenshot capture timing
  SCREENSHOT_MIN: 3 * 60 * 1000, // 3 minutes minimum
  SCREENSHOT_MAX: 15 * 60 * 1000, // 15 minutes maximum
  
  // Mandatory screenshot monitoring - how often to check screenshot requirements
  SCREENSHOT_MONITORING: 60 * 1000, // 60 seconds (was 30 seconds)
  
  // === NOTIFICATION & SYNC INTERVALS ===
  
  // Notification checking frequency
  NOTIFICATIONS: 60 * 1000, // 60 seconds (configurable via appSettings)
  
  // Settings refresh interval
  SETTINGS_REFRESH: 5 * 60 * 1000, // 5 minutes
  
  // === SYSTEM MONITORING ===
  
  // Node.js keep-alive interval (for standalone mode)
  NODEJS_KEEPALIVE: 30 * 1000, // 30 seconds
  
  // Sync manager intervals
  SYNC_RETRY: 30 * 1000, // 30 seconds for retry attempts
  
  // === PERFORMANCE MODES ===
  
  // High Performance Mode (reduce all intervals by 50%)
  HIGH_PERFORMANCE: {
    IDLE_CHECK: 10000, // 10 seconds
    MOUSE_TRACKING: 2000, // 2 seconds
    KEYBOARD_TRACKING: 5000, // 5 seconds
    SCREENSHOT_MONITORING: 120 * 1000, // 2 minutes
    NOTIFICATIONS: 120 * 1000, // 2 minutes
  },
  
  // Ultra Performance Mode (minimal intervals)
  ULTRA_PERFORMANCE: {
    IDLE_CHECK: 15000, // 15 seconds
    MOUSE_TRACKING: 5000, // 5 seconds  
    KEYBOARD_TRACKING: 10000, // 10 seconds
    APP_CAPTURE_THROTTLE: 8000, // 8 seconds - balanced app capture
    URL_CAPTURE_THROTTLE: 8000, // 8 seconds - balanced URL capture (catches 3 websites in 24s)
    SCREENSHOT_MONITORING: 300 * 1000, // 5 minutes
    NOTIFICATIONS: 300 * 1000, // 5 minutes
  },
  
  // Debug Mode (very frequent for testing)
  DEBUG: {
    IDLE_CHECK: 1000, // 1 second
    MOUSE_TRACKING: 500, // 0.5 seconds
    KEYBOARD_TRACKING: 1000, // 1 second
    SCREENSHOT_MONITORING: 10 * 1000, // 10 seconds
    NOTIFICATIONS: 10 * 1000, // 10 seconds
  }
};

/**
 * Performance mode configuration
 * Available modes: 'normal', 'high_performance', 'ultra_performance', 'debug'
 */
let currentMode = 'normal';

/**
 * Get interval value based on current performance mode
 * @param {string} intervalName - Name of the interval (e.g., 'IDLE_CHECK')
 * @returns {number} Interval value in milliseconds
 */
function getInterval(intervalName) {
  const mode = currentMode.toUpperCase();
  
  // Check if current mode has override for this interval
  if (INTERVALS[mode] && INTERVALS[mode][intervalName] !== undefined) {
    return INTERVALS[mode][intervalName];
  }
  
  // Fallback to normal interval
  return INTERVALS[intervalName] || 5000; // Default 5 seconds if not found
}

/**
 * Set performance mode
 * @param {string} mode - Performance mode ('normal', 'high_performance', 'ultra_performance', 'debug')
 */
function setPerformanceMode(mode) {
  const validModes = ['normal', 'high_performance', 'ultra_performance', 'debug'];
  
  if (validModes.includes(mode)) {
    currentMode = mode;
    console.log(`🎛️ Performance mode set to: ${mode}`);
    return true;
  } else {
    console.warn(`⚠️ Invalid performance mode: ${mode}. Valid modes:`, validModes);
    return false;
  }
}

/**
 * Get current performance mode
 * @returns {string} Current performance mode
 */
function getCurrentMode() {
  return currentMode;
}

/**
 * Get all intervals for current mode
 * @returns {object} All interval values for current mode
 */
function getAllIntervals() {
  const intervals = {};
  const mode = currentMode.toUpperCase();
  
  // Start with normal intervals
  Object.keys(INTERVALS).forEach(key => {
    if (typeof INTERVALS[key] === 'number') {
      intervals[key] = INTERVALS[key];
    }
  });
  
  // Override with mode-specific intervals if they exist
  if (INTERVALS[mode]) {
    Object.keys(INTERVALS[mode]).forEach(key => {
      intervals[key] = INTERVALS[mode][key];
    });
  }
  
  return intervals;
}

/**
 * Auto-detect performance mode based on system resources
 * @param {object} systemInfo - System information (optional)
 */
function autoDetectPerformanceMode(systemInfo = {}) {
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpuCount = os.cpus().length;
    
    const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    console.log(`🔍 System analysis: ${cpuCount} CPUs, ${Math.round(memUsagePercent)}% memory used`);
    
    // Ultra performance mode for low-end systems
    if (cpuCount <= 2 || memUsagePercent > 85) {
      setPerformanceMode('ultra_performance');
      console.log('🐌 Low-end system detected - using ultra performance mode');
    }
    // High performance mode for medium systems
    else if (cpuCount <= 4 || memUsagePercent > 70) {
      setPerformanceMode('high_performance');
      console.log('⚡ Medium system detected - using high performance mode');
    }
    // Normal mode for powerful systems
    else {
      setPerformanceMode('normal');
      console.log('🚀 Powerful system detected - using normal mode');
    }
    
  } catch (error) {
    console.warn('⚠️ Could not auto-detect performance mode:', error.message);
    setPerformanceMode('high_performance'); // Safe default
  }
}

/**
 * Export configuration for environment variables override
 */
function getEnvironmentOverrides() {
  const overrides = {};
  
  // Check for environment variable overrides
  Object.keys(INTERVALS).forEach(key => {
    if (typeof INTERVALS[key] === 'number') {
      const envKey = `TIMEFLOW_INTERVAL_${key}`;
      const envValue = process.env[envKey];
      
      if (envValue && !isNaN(envValue)) {
        overrides[key] = parseInt(envValue);
        console.log(`🔧 Environment override: ${key} = ${envValue}ms`);
      }
    }
  });
  
  return overrides;
}

module.exports = {
  INTERVALS,
  getInterval,
  setPerformanceMode,
  getCurrentMode,
  getAllIntervals,
  autoDetectPerformanceMode,
  getEnvironmentOverrides
}; 