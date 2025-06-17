import { app, desktopCapturer, screen, Notification, powerMonitor } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot, queueAppLog } from './unsyncedManager';
import { logError, showError } from './errorHandler';
import { screenshotIntervalSeconds, idleTimeoutMinutes } from './config';

// Safe console logging to prevent EPIPE errors
function safeLog(...args: any[]) {
  try {
    console.log(...args);
  } catch (error) {
    // Silently ignore EPIPE errors when stdout is broken
    if ((error as any).code !== 'EPIPE') {
      // For non-EPIPE errors, try to log to stderr
      try {
        console.error('Console error:', error);
      } catch (e) {
        // If even stderr fails, just ignore
      }
    }
  }
}

function safeError(...args: any[]) {
  try {
    console.error(...args);
  } catch (error) {
    // Silently ignore EPIPE errors when stderr is broken
    if ((error as any).code !== 'EPIPE') {
      // Try alternative logging
      try {
        process.stderr.write(`Error: ${args.join(' ')}\n`);
      } catch (e) {
        // If all logging fails, just ignore
      }
    }
  }
}

// Import app events for communication with main process
let appEvents: any = null;
// Note: Don't use require('./main') here as it causes circular dependency issues

const UNSYNCED_ACTIVITY_PATH = path.join(app.getPath('userData'), 'unsynced_activity.json');

// Special UUID for activity monitoring - this represents a virtual "task" for general activity monitoring
const ACTIVITY_MONITORING_TASK_ID = '00000000-0000-0000-0000-000000000001';

interface ActivitySession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  is_active: boolean;
  total_screenshots: number;
  total_apps: number;
  total_mouse_clicks: number;
  total_keystrokes: number;
  total_mouse_movements: number;
}

interface AppActivity {
  app_name: string;
  window_title: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  url?: string;
  mouse_clicks: number;
  keystrokes: number;
  mouse_movements: number;
}

interface ActivityMetrics {
  mouse_clicks: number;
  keystrokes: number;
  mouse_movements: number;
  last_activity_time: number;
  activity_score: number; // 0-100 based on activity level
}

// Add blur settings interface
interface AppSettings {
  blur_screenshots: boolean;
  screenshot_interval_seconds: number;
  idle_threshold_seconds: number;
  max_laptop_closed_hours: number;
  mandatory_screenshot_interval_minutes: number;
}

// === SETTINGS ===
let appSettings: AppSettings = {
  blur_screenshots: false,
  screenshot_interval_seconds: 60,
  idle_threshold_seconds: 300, // 5 minutes default
  max_laptop_closed_hours: 1, // Stop tracking after 1 hour of laptop being closed (reduced from 15)
  mandatory_screenshot_interval_minutes: 15 // Screenshots are mandatory every 15 minutes (reduced from 30)
};

// === ACTIVITY METRICS ===
let activityMetrics: ActivityMetrics = {
  mouse_clicks: 0,
  keystrokes: 0,
  mouse_movements: 0,
  last_activity_time: Date.now(),
  activity_score: 0
};

let lastActivityTime = Date.now();

// === INTERVALS ===
let activityInterval: NodeJS.Timeout | undefined;
let appTrackingInterval: NodeJS.Timeout | undefined;
let activityMetricsInterval: NodeJS.Timeout | undefined;
let notificationInterval: NodeJS.Timeout | undefined;
let activityResetInterval: NodeJS.Timeout | undefined; // Add reset interval

// === TRACKING STATE ===
let isMonitoring = false;
let currentUserId: string | null = null;
let currentActivitySession: ActivitySession | null = null;
let currentApp: AppActivity | null = null;
let consecutiveScreenshotFailures = 0;
let lastSuccessfulScreenshot = 0;
let systemUnavailableStart: number | null = null;
let laptopClosedStart: number | null = null; // Track when laptop was closed
let lastMandatoryScreenshotTime = 0; // Track mandatory screenshots
const MAX_SCREENSHOT_FAILURES = 3; // Stop after 3 consecutive failures
const MAX_SYSTEM_UNAVAILABLE_TIME = 2 * 60 * 1000; // 2 minutes
const SCREENSHOT_TIMEOUT_MS = 10000;
const MAX_LAPTOP_CLOSED_TIME = 1 * 60 * 60 * 1000; // 1 hour in milliseconds (reduced from 15)
const MANDATORY_SCREENSHOT_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds (reduced from 30)

// Always-on activity monitoring - starts when app launches
export async function startActivityMonitoring(userId: string) {
  if (isMonitoring) {
    safeLog('🔄 Activity monitoring already running');
    return;
  }

  safeLog('🚀 Starting always-on activity monitoring for user:', userId);
  currentUserId = userId;
  isMonitoring = true;
  lastActivityTime = Date.now();

  // Reset activity metrics
  activityMetrics = {
    mouse_clicks: 0,
    keystrokes: 0,
    mouse_movements: 0,
    last_activity_time: Date.now(),
    activity_score: 0
  };

  // Fetch settings from server first
  await fetchSettings();

  // Create new activity session
  currentActivitySession = {
    id: randomUUID(),
    user_id: userId,
    start_time: new Date().toISOString(),
    is_active: true,
    total_screenshots: 0,
    total_apps: 0,
    total_mouse_clicks: 0,
    total_keystrokes: 0,
    total_mouse_movements: 0
  };

  // Save session to database
  saveActivitySession();

  // Start random screenshot capture (2 per 10-minute period)
  startRandomScreenshotCapture();

  // Start app activity tracking every 5 seconds - DON'T reset activity timer!
  appTrackingInterval = setInterval(async () => {
    const userActive = isUserActive();
    safeLog('🔍 [APP-TRACKING] Interval check:', {
      currentUserId: !!currentUserId,
      isUserActive: userActive,
      will_track_app: currentUserId && userActive
    });
    
    if (currentUserId && userActive) {
      await trackCurrentApp();
    } else if (currentUserId && !userActive) {
      safeLog('⚠️ [APP-TRACKING] Skipped - user not active');
    } else if (!currentUserId) {
      safeLog('⚠️ [APP-TRACKING] Skipped - no user ID');
    }
  }, 5000);

  // Start activity metrics tracking every 1 second
  activityMetricsInterval = setInterval(async () => {
    await trackActivityMetrics();
  }, 1000);

  // Start notification checking every 60 seconds
  notificationInterval = setInterval(async () => {
    await checkNotifications();
  }, 60000);

  // Start activity metrics reset every 10 minutes to show incremental changes
  activityResetInterval = setInterval(() => {
    resetActivityMetrics();
  }, 10 * 60 * 1000); // 10 minutes

  safeLog(`✅ Activity monitoring started - Random screenshots (2 per 10 min), App tracking every 5s, Activity metrics every 1s, Reset every 10min`);
}

export function stopActivityMonitoring() {
  if (!isMonitoring) return;

  safeLog('🛑 Stopping activity monitoring');
  isMonitoring = false;

  if (activityInterval) {
    clearTimeout(activityInterval);
    activityInterval = undefined;
  }

  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = undefined;
  }

  if (activityMetricsInterval) {
    clearInterval(activityMetricsInterval);
    activityMetricsInterval = undefined;
  }

  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = undefined;
  }

  if (activityResetInterval) {
    clearInterval(activityResetInterval);
    activityResetInterval = undefined;
  }

  // End current activity session
  if (currentActivitySession) {
    currentActivitySession.end_time = new Date().toISOString();
    currentActivitySession.is_active = false;
    currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
    currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
    currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
    saveActivitySession();
  }

  // End current app activity with safety checks
  if (currentApp) {
    try {
      currentApp.end_time = new Date().toISOString();
      currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
      currentApp.mouse_clicks = activityMetrics.mouse_clicks;
      currentApp.keystrokes = activityMetrics.keystrokes;
      currentApp.mouse_movements = activityMetrics.mouse_movements;
      saveAppActivity();
    } catch (error) {
      safeError('❌ Error saving final app activity during stop:', error);
      // Don't throw error, just log it
    }
  }

  currentActivitySession = null;
  currentApp = null;
  currentUserId = null;
}

function isUserActive(): boolean {
  // Use improved idle detection instead of corrupted activity tracking
  const currentIdleTime = calculateIdleTimeSeconds();
  const idleThreshold = appSettings.idle_threshold_seconds;
  
  // Only stop monitoring if we have consecutive technical failures, not just lack of screenshots
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    safeLog(`❌ Too many consecutive screenshot failures (${consecutiveScreenshotFailures}), stopping monitoring due to technical issues`);
    return false;
  }
  
  // Check actual user activity using improved detection
  const isActive = currentIdleTime < idleThreshold;
  
  // Log for debugging user activity detection
  if (currentIdleTime > 30) { // Only log when approaching idle threshold
    safeLog('👤 USER ACTIVITY CHECK:', {
      current_idle_seconds: currentIdleTime,
      idle_threshold: idleThreshold,
      is_active: isActive,
      detection_method: 'IMPROVED_SYSTEM_IDLE'
    });
  }
  
  return isActive;
}

function updateLastActivity() {
  lastActivityTime = Date.now();
  activityMetrics.last_activity_time = Date.now();
}

// Get system idle time using Electron's powerMonitor (more reliable than activity tracking)
function getSystemIdleTime(): number {
  try {
    return powerMonitor.getSystemIdleTime() * 1000; // Convert to milliseconds
  } catch (error) {
    safeError('❌ Failed to get system idle time:', error);
    return 0; // Fallback to 0 if system idle detection fails
  }
}

// Calculate idle time using both system and manual detection for accuracy
function calculateIdleTimeSeconds(): number {
  // Use system idle time as primary method (more reliable)
  const systemIdleMs = getSystemIdleTime();
  const systemIdleSeconds = Math.floor(systemIdleMs / 1000);
  
  // Also calculate manual tracking for comparison
  const now = Date.now();
  const manualIdleSeconds = Math.floor((now - activityMetrics.last_activity_time) / 1000);
  
  // Use the larger of the two values (system idle is more reliable for detecting real idle time)
  const finalIdleSeconds = Math.max(systemIdleSeconds, manualIdleSeconds);
  
  // ALWAYS log for debugging - let's see what's happening
  safeLog('🕐 ELECTRON IDLE TIME CALCULATION:', {
    system_idle_ms: systemIdleMs,
    system_idle_seconds: systemIdleSeconds,
    manual_idle_seconds: manualIdleSeconds,
    final_idle_seconds: finalIdleSeconds,
    last_activity_ago: manualIdleSeconds,
    using_system_idle: systemIdleSeconds >= manualIdleSeconds,
    detection_method: 'ELECTRON_SYSTEM_IDLE',
    timestamp: new Date().toISOString(),
    powerMonitor_available: typeof powerMonitor !== 'undefined'
  });
  
  return finalIdleSeconds;
}

// Track real activity metrics instead of simulating
async function trackActivityMetrics() {
  if (!currentUserId || !isMonitoring) return;

  try {
    // === IMPROVED IDLE DETECTION ===
    // Use system idle time instead of corrupted activity tracking
    const currentIdleTime = calculateIdleTimeSeconds();
    const idleThreshold = appSettings.idle_threshold_seconds; // Already in seconds
    const isCurrentlyIdle = currentIdleTime > idleThreshold;
    
    // === ACTIVITY_DECAY_SYSTEM ===
    // Gradually decrease activity score over time when idle using improved detection
    if (isCurrentlyIdle) {
      // Progressive decay: faster decay as idle time increases
      let decayRate = 1; // Base decay per second
      if (currentIdleTime > 60) decayRate = 2; // Faster after 1 minute
      if (currentIdleTime > 300) decayRate = 5; // Much faster after 5 minutes
      
      const oldScore = activityMetrics.activity_score;
      activityMetrics.activity_score = Math.max(0, activityMetrics.activity_score - decayRate);
      
      if (oldScore !== activityMetrics.activity_score) {
        safeLog('💤 ELECTRON ACTIVITY DECAY:', {
          idle_duration_seconds: currentIdleTime,
          idle_threshold: idleThreshold,
          decay_rate: decayRate,
          activity_score_before: oldScore,
          activity_score_after: activityMetrics.activity_score,
          user_status: 'ELECTRON_IDLE_DECAY',
          using_system_idle: true
        });
      }
    } else if (currentIdleTime > 0) {
      // Log when approaching idle but not there yet
      safeLog('⏰ ELECTRON APPROACHING IDLE:', {
        idle_duration_seconds: currentIdleTime,
        idle_threshold: idleThreshold,
        seconds_until_decay: idleThreshold - currentIdleTime,
        current_activity_score: activityMetrics.activity_score
      });
    }
    
    // === DETAILED IDLE DETECTION LOGGING ===
    // Commented out to reduce log noise during debugging
    /*
    console.log('🕰️ ACTIVITY METRICS:', {
      timestamp: new Date().toISOString(),
      timeSinceLastActivity_ms: timeSinceLastActivity,
      timeSinceLastActivity_seconds: Math.round(timeSinceLastActivity / 1000),
      idleThreshold_seconds: appSettings.idle_threshold_seconds,
      isCurrentlyIdle: isCurrentlyIdle,
      currentActivity: {
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements,
        current_activity_score: activityMetrics.activity_score
      },
      detection_method: 'REAL_INPUT_WITH_DECAY'
    });
    */

    // Update current session metrics
    if (currentActivitySession) {
      currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
      currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
      currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
    }

    // Update current app metrics
    if (currentApp) {
      currentApp.mouse_clicks = activityMetrics.mouse_clicks;
      currentApp.keystrokes = activityMetrics.keystrokes;
      currentApp.mouse_movements = activityMetrics.mouse_movements;
    }

  } catch (error) {
    safeError('❌ Activity metrics tracking failed:', error);
    logError('trackActivityMetrics', error);
  }
}

// Add settings fetch function
export async function fetchSettings() {
  try {
    // Try to load from config file first
    const configPath = path.join(process.cwd(), 'desktop-agent', 'config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      appSettings = {
        blur_screenshots: config.blur_screenshots || false,
        screenshot_interval_seconds: config.screenshot_interval_seconds || 60,
        idle_threshold_seconds: config.idle_threshold_seconds || 300,
        max_laptop_closed_hours: config.max_laptop_closed_hours || 1,
        mandatory_screenshot_interval_minutes: config.mandatory_screenshot_interval_minutes || 15
      };
      safeLog('✅ Settings loaded from config:', appSettings);
      return;
    }

    // Fallback to database settings if config file doesn't exist
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    
    if (error) {
      safeLog('⚠️ Could not fetch settings, using defaults:', error);
      return;
    }
    
    if (data) {
      appSettings = {
        blur_screenshots: data.blur_screenshots || false,
        screenshot_interval_seconds: data.screenshot_interval_seconds || 60,
        idle_threshold_seconds: data.idle_threshold_seconds || 300,
        max_laptop_closed_hours: data.max_laptop_closed_hours || 1,
        mandatory_screenshot_interval_minutes: data.mandatory_screenshot_interval_minutes || 15
      };
      safeLog('✅ Settings loaded from database:', appSettings);
    }
  } catch (error) {
    safeError('❌ Settings fetch error:', error);
    logError('fetchSettings', error);
  }
}

// Add blur function using Canvas API
async function blurImage(buffer: Buffer): Promise<Buffer> {
  try {
    // For now, we'll use a simple approach - in production you'd want to use sharp or canvas
    // This is a placeholder that returns the original buffer
    // In a real implementation, you'd blur the image here
    safeLog('🔄 Blurring screenshot...');
    
    // TODO: Implement actual image blurring using sharp or canvas
    // For now, just return original buffer
    return buffer;
  } catch (error) {
    safeError('❌ Image blur failed:', error);
    return buffer; // Return original if blur fails
  }
}

async function captureActivityScreenshot() {
  if (!currentUserId || !currentActivitySession) return;

  try {
    safeLog('📸 Capturing activity screenshot...');
    safeLog('🔍 Screenshot attempt details:', {
      userId: currentUserId,
      sessionId: currentActivitySession.id,
      timestamp: new Date().toISOString()
    });
    
    // Reduce timeout to 5 seconds and add more detailed error handling
    const screenshotPromise = new Promise(async (resolve, reject) => {
      try {
        safeLog('🖥️ Getting primary display...');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        safeLog(`📐 Display dimensions: ${width}x${height}`);
        
        safeLog('🔍 Getting desktop sources...');
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
        });
        
        safeLog(`📺 Found ${sources.length} screen sources`);
        
        if (sources.length === 0) {
          throw new Error('No screen sources available - check macOS Screen Recording permissions');
        }

        safeLog('🖼️ Converting thumbnail to PNG buffer...');
        let buffer = sources[0].thumbnail.toPNG();
        safeLog(`📊 Screenshot buffer size: ${buffer.length} bytes`);
        
        // Apply blur if enabled in settings
        if (appSettings.blur_screenshots) {
          safeLog('🔄 Applying blur to screenshot...');
          buffer = await blurImage(buffer);
        }
        
        const filename = `activity_${Date.now()}_${randomUUID().slice(0, 8)}.png`;
        const tempPath = path.join(app.getPath('temp'), filename);
        
        safeLog(`💾 Saving screenshot to: ${tempPath}`);
        fs.writeFileSync(tempPath, buffer);
        safeLog('✅ Screenshot file saved successfully');

        resolve({ tempPath, filename });
      } catch (error) {
        safeError('❌ Screenshot capture error:', error);
        reject(error);
      }
    });

    // Reduce timeout to 5 seconds for faster feedback
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Screenshot capture timeout (5s)')), 5000);
    });

    safeLog('⏱️ Starting screenshot capture with 5s timeout...');
    const { tempPath, filename } = await Promise.race([screenshotPromise, timeoutPromise]) as any;

    safeLog('☁️ Starting upload to Supabase...');
    // Upload to Supabase with activity metrics
    await uploadActivityScreenshot(tempPath, filename);
    
    // Update session stats
    currentActivitySession.total_screenshots++;
    saveActivitySession();

    // Reset failure count on success
    consecutiveScreenshotFailures = 0;
    lastSuccessfulScreenshot = Date.now();
    lastMandatoryScreenshotTime = Date.now(); // Track mandatory screenshots
    
    // Reset system unavailable tracking
    if (systemUnavailableStart) {
      safeLog('✅ System available again after being unavailable');
      systemUnavailableStart = null;
    }
    
    // Reset laptop closed tracking on successful screenshot
    if (laptopClosedStart) {
      safeLog('✅ Laptop appears to be open again - successful screenshot captured');
      laptopClosedStart = null;
    }
    
    // Skip event emission to avoid circular dependency issues with main.ts
    safeLog('📸 Screenshot capture and upload completed successfully!');
    safeLog(`📊 Total screenshots this session: ${currentActivitySession?.total_screenshots || 0}`);
    
    // Calculate next screenshot time for user information
    const nextScreenshotSeconds = screenshotIntervalSeconds;
    const nextMinutes = Math.floor(nextScreenshotSeconds / 60);
    const nextSecondsRemainder = nextScreenshotSeconds % 60;
    safeLog(`📸 Next screenshot in ${nextMinutes} minutes ${nextSecondsRemainder} seconds`);

  } catch (error) {
    consecutiveScreenshotFailures++;
    safeError(`💥 Screenshot failed (attempt ${consecutiveScreenshotFailures}/${MAX_SCREENSHOT_FAILURES}):`);
    safeError('📋 Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
    });
    logError('captureActivityScreenshot', error);
    
    // Track when system became unavailable
    if (!systemUnavailableStart) {
      systemUnavailableStart = Date.now();
      safeLog('⚠️ System appears to be unavailable, starting timer');
    }
    
    // Check if laptop might be closed (multiple screenshot failures)
    if (consecutiveScreenshotFailures >= 2 && !laptopClosedStart) {
      laptopClosedStart = Date.now();
      safeLog('💤 Laptop appears to be closed, starting laptop closure timer');
    }
    
    // Check various stop conditions
    const shouldStopTracking = checkStopConditions();
    
    if (shouldStopTracking) {
      const { reason, details } = getStopReason();
      safeLog(`🛑 Stopping tracking due to: ${reason}`);
      safeLog(`📊 Details: ${details}`);
      
      // Stop all monitoring
      stopActivityMonitoring();
      
      // Notify main process to stop timer tracking
      try {
        if (!appEvents) {
          appEvents = require('./main').appEvents;
        }
        if (appEvents) {
          appEvents.emit('auto-stop-tracking', {
            reason: reason,
            failures: consecutiveScreenshotFailures,
            unavailableTime: systemUnavailableStart ? Date.now() - systemUnavailableStart : 0,
            laptopClosedTime: laptopClosedStart ? Date.now() - laptopClosedStart : 0,
            details: details
          });
        }
      } catch (e) {
        safeLog('⚠️ Could not notify main process:', e);
      }
      
      // Show notification if possible
      try {
        new Notification({
          title: 'TimeFlow - Tracking Stopped',
          body: getNotificationMessage(reason, details)
        }).show();
      } catch (e) {
        // Silent fail for notifications
      }
    }
  }
}

// Enhanced stop condition checking
function checkStopConditions(): boolean {
  const now = Date.now();
  
  // Check consecutive screenshot failures
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    return true;
  }
  
  // Check system unavailable time (2 minutes)
  if (systemUnavailableStart && (now - systemUnavailableStart) > MAX_SYSTEM_UNAVAILABLE_TIME) {
    return true;
  }
  
  // Check laptop closed time (1 hour)
  if (laptopClosedStart && (now - laptopClosedStart) > MAX_LAPTOP_CLOSED_TIME) {
    return true;
  }
  
  // Check mandatory screenshot requirement (15 minutes without successful screenshot)
  if (lastSuccessfulScreenshot > 0 && (now - lastSuccessfulScreenshot) > MANDATORY_SCREENSHOT_INTERVAL) {
    return true;
  }
  
  // Check if we haven't had ANY successful screenshot for too long during active tracking
  if (currentActivitySession && lastMandatoryScreenshotTime > 0) {
    const timeSinceLastMandatory = now - lastMandatoryScreenshotTime;
    if (timeSinceLastMandatory > MANDATORY_SCREENSHOT_INTERVAL) {
      return true;
    }
  }
  
  return false;
}

// Get stop reason details
function getStopReason(): { reason: string, details: string } {
  const now = Date.now();
  
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    return {
      reason: 'screenshot_failures',
      details: `${consecutiveScreenshotFailures} consecutive screenshot failures - system may be sleeping or locked`
    };
  }
  
  if (laptopClosedStart && (now - laptopClosedStart) > MAX_LAPTOP_CLOSED_TIME) {
    const closedHours = Math.floor((now - laptopClosedStart) / (60 * 60 * 1000));
    return {
      reason: 'laptop_closed_extended',
      details: `Laptop appears closed for ${closedHours} hours (max: ${appSettings.max_laptop_closed_hours} hours)`
    };
  }
  
  if (lastSuccessfulScreenshot > 0 && (now - lastSuccessfulScreenshot) > MANDATORY_SCREENSHOT_INTERVAL) {
    const minutesWithoutScreenshot = Math.floor((now - lastSuccessfulScreenshot) / (60 * 1000));
    return {
      reason: 'mandatory_screenshot_timeout',
      details: `${minutesWithoutScreenshot} minutes without successful screenshot (mandatory every ${appSettings.mandatory_screenshot_interval_minutes} minutes)`
    };
  }
  
  if (systemUnavailableStart && (now - systemUnavailableStart) > MAX_SYSTEM_UNAVAILABLE_TIME) {
    const unavailableMinutes = Math.floor((now - systemUnavailableStart) / (60 * 1000));
    return {
      reason: 'system_unavailable',
      details: `System unavailable for ${unavailableMinutes} minutes`
    };
  }
  
  return {
    reason: 'unknown',
    details: 'Unknown stop condition triggered'
  };
}

// Get notification message based on stop reason
function getNotificationMessage(reason: string, details: string): string {
  switch (reason) {
    case 'screenshot_failures':
      return 'Tracking stopped: Screenshots are mandatory for time tracking. Please ensure your laptop is open and permissions are granted.';
    
    case 'laptop_closed_extended':
      return `Tracking stopped: Laptop has been closed for over ${appSettings.max_laptop_closed_hours} hours. Time tracking cannot continue without active monitoring.`;
    
    case 'mandatory_screenshot_timeout':
      return `Tracking stopped: Screenshots are required every ${appSettings.mandatory_screenshot_interval_minutes} minutes for time tracking verification.`;
    
    case 'system_unavailable':
      return 'Tracking stopped: System appears to be unavailable or sleeping. Please restart tracking when you resume work.';
    
    default:
      return `Tracking stopped: ${details}`;
  }
}

async function uploadActivityScreenshot(filePath: string, filename: string) {
  if (!currentUserId) {
    safeLog('⚠️ No user ID available, queuing screenshot for later upload');
    queueScreenshot({
      user_id: 'unknown',
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: `local://${filePath}`,
      captured_at: new Date().toISOString()
    });
    return;
  }

  // Use a default task ID that should exist in the system
  // This will be replaced with real task ID when proper time tracking is active
  const taskId = ACTIVITY_MONITORING_TASK_ID;
  
  safeLog(`☁️ Starting upload process...`);
  safeLog(`📋 Upload details:`, {
    userId: currentUserId,
    taskId: taskId,
    filename: filename,
    filePath: filePath
  });

  try {
    safeLog('📂 Reading file buffer...');
    const fileBuffer = fs.readFileSync(filePath);
    safeLog(`📊 File buffer size: ${fileBuffer.length} bytes`);
    
    safeLog('☁️ Uploading to Supabase Storage...');
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(`${currentUserId}/${filename}`, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      safeError('❌ Supabase Storage upload failed:', {
        error: uploadError.message,
        code: uploadError.name,
        details: uploadError
      });
      queueScreenshot({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: `local://${filePath}`,
        captured_at: new Date().toISOString()
      });
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    safeLog('✅ Storage upload successful, getting public URL...');
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(`${currentUserId}/${filename}`);

    safeLog(`🔗 Public URL generated: ${publicUrl}`);

    safeLog('💾 Saving to database...');
    // Save to database with activity metrics - handle idle states properly using improved detection
    const currentIdleTime = calculateIdleTimeSeconds();
    const isCurrentlyIdle = currentIdleTime > appSettings.idle_threshold_seconds;
    
    // If user is idle, activity should be 0
    const activityPercent = isCurrentlyIdle ? 0 : Math.round(activityMetrics.activity_score);
    const focusPercent = isCurrentlyIdle ? 0 : Math.round(activityMetrics.activity_score * 0.8);
    
    // Log detailed idle detection for screenshots
    safeLog('📸 SCREENSHOT IDLE DETECTION:', {
      current_idle_seconds: currentIdleTime,
      idle_threshold: appSettings.idle_threshold_seconds,
      is_idle: isCurrentlyIdle,
      activity_percent: activityPercent,
      focus_percent: focusPercent,
      activity_score: activityMetrics.activity_score,
      detection_method: 'IMPROVED_SYSTEM_IDLE'
    });
    
    // === DETAILED ACTIVITY PERCENTAGE LOGGING ===
    // Commented out to reduce log noise during debugging
    /*
    console.log('📊 ACTIVITY PERCENTAGE CALCULATION:', {
      timestamp: new Date().toISOString(),
      idle_detection: {
        timeSinceLastActivity_ms: timeSinceLastActivity,
        timeSinceLastActivity_seconds: Math.round(timeSinceLastActivity / 1000),
        idle_threshold_seconds: appSettings.idle_threshold_seconds,
        isCurrentlyIdle: isCurrentlyIdle
      },
      raw_metrics: {
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements,
        activity_score: activityMetrics.activity_score
      },
      calculations: {
        activity_percent_formula: isCurrentlyIdle ? 'IDLE = 0%' : `Math.round(${activityMetrics.activity_score})`,
        activity_percent_result: activityPercent,
        focus_percent_formula: isCurrentlyIdle ? 'IDLE = 0%' : `Math.round(${activityMetrics.activity_score} * 0.8)`,
        focus_percent_result: focusPercent,
        focus_estimation_note: 'Focus is estimated as 80% of activity score'
      },
      screenshot_classification: {
        activity_level: activityPercent > 70 ? 'HIGH' : activityPercent > 30 ? 'MEDIUM' : activityPercent > 0 ? 'LOW' : 'IDLE',
        focus_level: focusPercent > 70 ? 'HIGH' : focusPercent > 30 ? 'MEDIUM' : focusPercent > 0 ? 'LOW' : 'IDLE',
        is_productive: focusPercent > 50,
        detection_status: isCurrentlyIdle ? 'USER_IS_IDLE' : 'USER_IS_ACTIVE'
      }
    });
    */
    
    const dbPayload = {
      user_id: currentUserId,
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: publicUrl,
      captured_at: new Date().toISOString(),
      activity_percent: activityPercent,
      focus_percent: focusPercent,
      mouse_clicks: activityMetrics.mouse_clicks,
      keystrokes: activityMetrics.keystrokes,
      mouse_movements: activityMetrics.mouse_movements
    };

    safeLog('📊 Database payload:', dbPayload);

    const { error: dbError } = await supabase
      .from('screenshots')
      .insert(dbPayload);

    if (dbError) {
      safeError('❌ Database save failed:', {
        error: dbError.message,
        code: dbError.code,
        details: dbError
      });
      queueScreenshot({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: publicUrl,
        captured_at: new Date().toISOString()
      });
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    safeLog('🎉 Screenshot uploaded and saved to database successfully!');
    
    // Clean up temp file
    try {
      fs.unlinkSync(filePath);
      safeLog('🗑️ Temporary file cleaned up');
    } catch (cleanupError) {
      safeLog('⚠️ Could not clean up temp file:', (cleanupError as Error).message);
    }
    
    // Emit event to trigger notification in main process
    try {
      if (!appEvents) {
        // Try to get app events again in case it wasn't available during initialization
        appEvents = require('./main').appEvents;
      }
      if (appEvents) {
        appEvents.emit('screenshot-captured');
      }
    } catch (e) {
      safeLog('⚠️ Could not emit screenshot-captured event:', (e as Error).message);
    }

  } catch (error) {
    safeError('💥 Upload process failed:', error);
    throw error; // Re-throw to be handled by calling function
  }
}

async function getCurrentAppName(): Promise<string> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      if (process.platform === 'win32') {
        // Windows implementation using PowerShell
        const { stdout } = await execAsync(`powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 ProcessName | ForEach-Object {$_.ProcessName}"`);
        const appName = stdout.trim();
        return appName || 'System Application';
      } else if (process.platform === 'darwin') {
        // macOS implementation using AppleScript - improved version
        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null || echo "System Application"`);
        const appName = stdout.trim();
        return appName || 'System Application';
      } else if (process.platform === 'linux') {
        // Linux implementation using xdotool or wmctrl
        try {
          const { stdout } = await execAsync(`xdotool getactivewindow getwindowname 2>/dev/null || wmctrl -a $(wmctrl -l | head -1 | cut -d' ' -f1) 2>/dev/null || echo "System Application"`);
          const appName = stdout.trim();
          return appName || 'System Application';
        } catch {
          return 'System Application';
        }
      } else {
        return 'System Application';
      }
    } catch (error) {
      // Only log occasionally to reduce spam
      if (Math.random() < 0.01) { // Log only 1% of the time
        safeLog('⚠️ App detection failed occasionally, using System Application');
      }
      return 'System Application';
    }
  } catch (error) {
    return 'System Application';
  }
}

async function getCurrentWindowTitle(): Promise<string> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      if (process.platform === 'win32') {
        // Windows implementation using PowerShell
        const { stdout } = await execAsync(`powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 MainWindowTitle | ForEach-Object {$_.MainWindowTitle}"`);
        const windowTitle = stdout.trim();
        return windowTitle || 'Unknown Window';
      } else if (process.platform === 'darwin') {
        // macOS implementation using corrected AppleScript
        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get title of front window of (first application process whose frontmost is true)'`);
        const windowTitle = stdout.trim();
        return windowTitle || 'Unknown Window';
      } else if (process.platform === 'linux') {
        // Linux implementation
        try {
          const { stdout } = await execAsync(`xdotool getactivewindow getwindowname 2>/dev/null || echo "Unknown Window"`);
          const windowTitle = stdout.trim();
          return windowTitle || 'Unknown Window';
        } catch {
          return 'Unknown Window';
        }
      } else {
        return 'Unknown Window';
      }
    } catch (error) {
      // Fallback to app name if window title not available
      const appName = await getCurrentAppName();
      return `${appName} Window`;
    }
  } catch (error) {
    safeError('❌ Window title detection failed:', error);
    return 'Unknown Window';
  }
}

async function getCurrentURL(): Promise<string | undefined> {
  try {
    // Only try to get URLs from actual browser applications
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();
    
    // Check if it's actually a browser
    const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc', 'chrome', 'firefox', 'msedge'];
    const isBrowser = browsers.some(browser => appName.toLowerCase().includes(browser.toLowerCase()));
    
    if (!isBrowser) {
      return undefined;
    }

    safeLog('🌐 [URL-EXTRACTION] Attempting URL extraction:', {
      appName,
      windowTitle: windowTitle?.substring(0, 100) + '...',
      isBrowser
    });

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      let script = '';
      
      if (process.platform === 'win32') {
        // Windows implementation - try to get URL from different browsers
        if (appName.toLowerCase().includes('chrome')) {
          // For Chrome on Windows - this is a simplified approach
          // In production, you'd need more sophisticated methods
          return extractURLFromWindowTitle(windowTitle);
        } else if (appName.toLowerCase().includes('edge')) {
          return extractURLFromWindowTitle(windowTitle);
        }
        return extractURLFromWindowTitle(windowTitle);
      } else if (process.platform === 'darwin') {
        // macOS implementation - try AppleScript first, then fallback
        if (appName.includes('Chrome') || appName.includes('Arc')) {
          script = `osascript -e 'tell application "Google Chrome" to get URL of active tab of front window'`;
        } else if (appName.includes('Safari')) {
          script = `osascript -e 'tell application "Safari" to get URL of front document'`;
        } else if (appName.includes('Firefox')) {
          // Firefox doesn't support AppleScript for URL access - use window title
          return extractURLFromWindowTitle(windowTitle);
        } else {
          return extractURLFromWindowTitle(windowTitle);
        }
        
        safeLog('🍎 [APPLESCRIPT] Executing:', script);
        
        const { stdout, stderr } = await execAsync(script);
        
        if (stderr) {
          safeLog('⚠️ [APPLESCRIPT] Error output:', stderr);
        }
        
        const url = stdout.trim();
        
        safeLog('🍎 [APPLESCRIPT] Raw result:', {
          stdout: stdout.substring(0, 200),
          url: url.substring(0, 200),
          isValidURL: url && (url.startsWith('http://') || url.startsWith('https://'))
        });
        
        // Only return valid URLs
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          safeLog('✅ [URL-APPLESCRIPT] Successfully extracted:', url);
          return url;
        } else {
          safeLog('⚠️ [APPLESCRIPT] Invalid URL result, trying window title fallback');
          return extractURLFromWindowTitle(windowTitle);
        }
      }
      
      return extractURLFromWindowTitle(windowTitle);
    } catch (error) {
      safeLog('❌ [APPLESCRIPT] Failed, trying window title fallback:', (error as Error).message || error);
      return extractURLFromWindowTitle(windowTitle);
    }
  } catch (error) {
    safeLog('❌ [URL-EXTRACTION] Complete failure:', (error as Error).message || error);
    return undefined;
  }
}

// New function to extract URLs from window titles as fallback
function extractURLFromWindowTitle(windowTitle: string | undefined): string | undefined {
  if (!windowTitle) {
    return undefined;
  }

  safeLog('🔍 [TITLE-EXTRACTION] Analyzing window title:', windowTitle.substring(0, 100) + '...');

  // Common patterns for extracting URLs from browser window titles
  try {
    // Method 1: Direct URL in title (some browsers show this)
    const urlMatch = windowTitle.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      const extractedUrl = urlMatch[1];
      safeLog('✅ [TITLE-URL] Found direct URL:', extractedUrl);
      return extractedUrl;
    }

    // Method 2: Domain-based reconstruction for common sites
    const domainMappings = [
      // Social Media
      { patterns: ['Instagram'], url: 'https://www.instagram.com/' },
      { patterns: ['Facebook'], url: 'https://www.facebook.com/' },
      { patterns: ['Twitter', 'X.com'], url: 'https://twitter.com/' },
      { patterns: ['LinkedIn'], url: 'https://www.linkedin.com/' },
      
      // Work Tools
      { patterns: ['GitHub'], url: 'https://github.com/' },
      { patterns: ['Supabase'], url: 'https://supabase.com/dashboard' },
      { patterns: ['Lovable'], url: 'https://lovable.dev/' },
      { patterns: ['Vercel'], url: 'https://vercel.com/' },
      
      // Work Time specific
      { patterns: ['Ebdaa Work Time', 'Employee Time Tracking'], url: 'https://worktime.ebdaadt.com/' },
      { patterns: ['TimeFlow Admin'], url: 'https://worktime.ebdaadt.com/admin' },
      
      // Development
      { patterns: ['Stack Overflow'], url: 'https://stackoverflow.com/' },
      { patterns: ['MDN Web Docs'], url: 'https://developer.mozilla.org/' },
      
      // Common sites
      { patterns: ['Google'], url: 'https://www.google.com/' },
      { patterns: ['YouTube'], url: 'https://www.youtube.com/' },
      { patterns: ['Gmail'], url: 'https://mail.google.com/' }
    ];

    for (const mapping of domainMappings) {
      if (mapping.patterns.some(pattern => windowTitle.includes(pattern))) {
        safeLog('✅ [TITLE-MAPPING] Mapped to:', mapping.url);
        return mapping.url;
      }
    }

    // Method 3: Extract domain from common title formats
    // "Site Name - Domain" or "Page Title | Site Name"
    const titlePatterns = [
      /([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|co|dev))/,
      /\| ([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|co|dev))/,
      /- ([a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|io|co|dev))/
    ];

    for (const pattern of titlePatterns) {
      const match = windowTitle.match(pattern);
      if (match) {
        const domain = match[1];
        const reconstructedUrl = `https://${domain}`;
        safeLog('✅ [TITLE-DOMAIN] Reconstructed URL:', reconstructedUrl);
        return reconstructedUrl;
      }
    }

    safeLog('⚠️ [TITLE-EXTRACTION] No URL patterns found in title');
    return undefined;

  } catch (error) {
    safeLog('❌ [TITLE-EXTRACTION] Error:', (error as Error).message || error);
    return undefined;
  }
}

async function trackCurrentApp() {
  if (!currentUserId || !currentActivitySession) {
    safeLog('⚠️ [TRACK-APP] Early return - missing userId or session:', {
      hasUserId: !!currentUserId,
      hasSession: !!currentActivitySession
    });
    return;
  }

  try {
    safeLog('🔍 [TRACK-APP] Starting app detection...');
    
    // Get current active application with timeout and error handling
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();
    const currentURL = await getCurrentURL();
    
    safeLog('🔍 [TRACK-APP] Detection results:', {
      appName: appName || 'NOT_DETECTED',
      windowTitle: windowTitle || 'NOT_DETECTED', 
      currentURL: currentURL || 'NO_URL',
      hasURL: !!currentURL
    });

    // Validate that we got valid data
    if (!appName || appName === 'Unknown Application') {
      safeLog('⚠️ Could not detect valid app name, skipping app tracking');
      return;
    }

    if (currentApp && 
        currentApp.app_name === appName && 
        currentApp.window_title === windowTitle &&
        currentApp.url === currentURL) {
      // Still in same app/window/URL, continue tracking
      return;
    }

    // End previous app activity with safety checks
    if (currentApp) {
      try {
        currentApp.end_time = new Date().toISOString();
        currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
        currentApp.mouse_clicks = activityMetrics.mouse_clicks;
        currentApp.keystrokes = activityMetrics.keystrokes;
        currentApp.mouse_movements = activityMetrics.mouse_movements;
        await saveAppActivity();
        
        // Save URL log if we have a URL
        if (currentApp.url) {
          await saveURLActivity(currentApp);
        }
              } catch (error) {
        safeError('❌ Error saving previous app activity:', error);
        // Continue with new app tracking even if saving previous failed
      }
    }

    // Start new app activity with validation
    try {
      currentApp = {
        app_name: appName,
        window_title: windowTitle || 'Unknown Window',
        start_time: new Date().toISOString(),
        duration_seconds: 0,
        url: currentURL,
        mouse_clicks: 0,
        keystrokes: 0,
        mouse_movements: 0
      };

      // Validate the new currentApp object
      if (!currentApp.app_name) {
        safeError('❌ Failed to create valid currentApp object');
        currentApp = null;
        return;
      }

      currentActivitySession.total_apps++;
      saveActivitySession();

      safeLog('📱 App activity:', appName, '-', windowTitle, currentURL ? `(${currentURL})` : '');
      
      // Log URL detection specifically
      if (currentURL) {
        safeLog('🌐 [URL-DETECTED]:', {
          url: currentURL,
          app: appName,
          will_save_url: true
        });
      } else {
        safeLog('🌐 [URL-DETECTION] No URL detected for app:', appName);
      }
    } catch (error) {
      safeError('❌ Error creating new app activity:', error);
      currentApp = null;
    }

  } catch (error) {
    safeError('❌ App tracking failed:', error);
    logError('trackCurrentApp', error);
    // Reset currentApp if tracking fails completely
    currentApp = null;
  }
}

async function saveAppActivity() {
  // Add comprehensive null checks to prevent the error
  if (!currentApp) {
    safeLog('⚠️ No current app to save - skipping saveAppActivity');
    return;
  }
  
  if (!currentUserId) {
    safeLog('⚠️ No current user ID - skipping saveAppActivity');
    return;
  }
  
  if (!currentActivitySession) {
    safeLog('⚠️ No current activity session - skipping saveAppActivity');
    return;
  }

  // Additional validation to ensure currentApp has required properties
  if (!currentApp.app_name) {
    safeLog('⚠️ Current app missing app_name - skipping saveAppActivity');
    return;
  }

  try {
    // Use minimal app_logs schema - only basic columns that definitely exist
    const appLogData = {
      user_id: currentUserId,
      project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
      app_name: currentApp.app_name,
      window_title: currentApp.window_title || 'Unknown Window'
    };

    const { error } = await supabase
      .from('app_logs')
      .insert(appLogData);

    if (error) {
      // Queue for later upload if database fails
      queueAppLog(appLogData);
      throw error;
    }

    safeLog('✅ App activity saved:', currentApp.app_name);

  } catch (error) {
    safeError('❌ Failed to save app activity:', error);
    logError('saveAppActivity', error);
  }
}

function getAppCategory(appName: string): string {
  const categories: { [key: string]: string } = {
    // Development tools
    'Visual Studio Code': 'development',
    'Xcode': 'development',
    'Terminal': 'development',
    'iTerm': 'development',
    'Android Studio': 'development',
    'IntelliJ IDEA': 'development',
    
    // Browsers
    'Google Chrome': 'browser',
    'Safari': 'browser',
    'Firefox': 'browser',
    'Microsoft Edge': 'browser',
    'Arc': 'browser',
    
    // Communication
    'Slack': 'communication',
    'Zoho Cliq': 'communication',
    'Microsoft Teams': 'communication',
    'Zoom': 'communication',
    'Skype': 'communication',
    'Discord': 'communication',
    'WhatsApp': 'communication',
    'Telegram': 'communication',
    'Mail': 'communication',
    
    // System
    'Finder': 'system',
    'System Preferences': 'system',
    'Activity Monitor': 'system',
    'Console': 'system',
    
    // Entertainment
    'Spotify': 'entertainment',
    'Apple Music': 'entertainment',
    'VLC': 'entertainment',
    'QuickTime Player': 'entertainment',
    'Netflix': 'entertainment',
    
    // Productivity
    'Microsoft Word': 'productivity',
    'Microsoft Excel': 'productivity',
    'Microsoft PowerPoint': 'productivity',
    'Google Docs': 'productivity',
    'Notion': 'productivity',
    'Obsidian': 'productivity',
    'Bear': 'productivity',
    
    // Design
    'Figma': 'design',
    'Adobe Photoshop': 'design',
    'Adobe Illustrator': 'design',
    'Sketch': 'design'
  };
  
  // Check for exact matches first
  if (categories[appName]) {
    return categories[appName];
  }
  
  // Check for partial matches
  const lowerAppName = appName.toLowerCase();
  for (const [app, category] of Object.entries(categories)) {
    if (lowerAppName.includes(app.toLowerCase()) || app.toLowerCase().includes(lowerAppName)) {
      return category;
    }
  }
  
  return 'other';
}

function calculateProductivityScore(app: AppActivity): number {
  const category = getAppCategory(app.app_name);
  const activityLevel = (app.mouse_clicks + app.keystrokes + app.mouse_movements / 10) / app.duration_seconds;
  
  let baseScore = 50; // Default score
  
  // Adjust based on app category
  switch (category) {
    case 'development':
      baseScore = 90;
      break;
    case 'communication':
      baseScore = 70;
      break;
    case 'browser':
      baseScore = 60; // Depends on URL
      break;
    case 'entertainment':
      baseScore = 20;
      break;
    case 'system':
      baseScore = 40;
      break;
  }
  
  // Adjust based on activity level
  const activityMultiplier = Math.min(1.5, Math.max(0.5, activityLevel));
  
  return Math.round(baseScore * activityMultiplier);
}

async function saveURLActivity(appActivity: AppActivity) {
  safeLog('🔍 [SAVE-URL] Attempting to save URL:', {
    hasURL: !!appActivity.url,
    hasUserId: !!currentUserId,
    url: appActivity.url || 'NO_URL'
  });
  
  if (!appActivity.url || !currentUserId) {
    safeLog('⚠️ [SAVE-URL] Skipped - missing URL or user ID');
    return;
  }

  try {
    // Use minimal url_logs schema
    const urlLogData = {
      user_id: currentUserId,
      site_url: appActivity.url,
      category: getURLCategory(appActivity.url)
    };
    
    safeLog('🔍 [SAVE-URL] Inserting URL data:', urlLogData);

    const { error } = await supabase
      .from('url_logs')
      .insert(urlLogData);

    if (error) {
      safeError('❌ Failed to save URL activity:', error);
      // Could queue for later upload here
    } else {
      safeLog('✅ URL activity saved successfully:', appActivity.url);
    }

  } catch (error) {
    console.error('❌ Failed to save URL activity:', error);
    logError('saveURLActivity', error);
  }
}

function getURLCategory(url: string): string {
  if (url.includes('github.com') || url.includes('stackoverflow.com') || url.includes('docs.')) {
    return 'other'; // Use 'other' instead of 'development' until constraint is fixed
  }
  if (url.includes('youtube.com') || url.includes('netflix.com') || url.includes('spotify.com')) {
    return 'entertainment';
  }
  if (url.includes('facebook.com') || url.includes('twitter.com') || url.includes('linkedin.com')) {
    return 'social';
  }
  if (url.includes('google.com') || url.includes('wikipedia.org')) {
    return 'other'; // Use 'other' instead of 'research' until constraint is fixed
  }
  return 'other';
}

function calculateURLProductivityScore(url: string): number {
  const category = getURLCategory(url);
  
  switch (category) {
    case 'development':
      return 95;
    case 'research':
      return 80;
    case 'social':
      return 30;
    case 'entertainment':
      return 15;
    default:
      return 50;
  }
}

async function saveActivitySession() {
  if (!currentActivitySession) return;

  try {
    // Save activity session as an app log entry for now - minimal schema
    const sessionLogData = {
      user_id: currentActivitySession.user_id,
      project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
      app_name: 'Activity Monitor',
      window_title: `${currentActivitySession.is_active ? 'Active' : 'Ended'} Session - Screenshots: ${currentActivitySession.total_screenshots}`
    };

    const { error } = await supabase
      .from('app_logs')
      .insert(sessionLogData);

    if (error) {
      console.error('❌ Failed to save activity session:', error);
      // Queue for later upload using existing queue system
      queueAppLog(sessionLogData);
    }

  } catch (error) {
    console.error('❌ Failed to save activity session:', error);
    logError('saveActivitySession', error);
  }
}

// Manual activity trigger (for testing)
export function triggerActivityCapture() {
  safeLog('🧪 triggerActivityCapture() called');
  safeLog('📊 Activity monitoring state - isMonitoring:', isMonitoring, 'currentUserId:', currentUserId);
  
  // Use the real task ID from active tracking if available, otherwise skip
  if (!currentUserId) {
    safeLog('⚠️ No user ID set for activity capture - skipping screenshot');
    return;
  }
  
  safeLog('📸 Triggering manual screenshot capture...');
  captureActivityScreenshot();
}

// Direct screenshot test function (for testing without activity monitoring)
export async function triggerDirectScreenshot() {
  safeLog('🧪 triggerDirectScreenshot() called - testing basic screenshot functionality');
  
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    safeLog(`🖥️ Display size: ${width}x${height}`);
    
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
    });
    
    safeLog(`📺 Available sources: ${sources.length}`);
    
    if (sources.length === 0) {
      safeLog('❌ No screen sources available - check macOS Screen Recording permissions');
      return false;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const filename = `test_direct_${randomUUID()}.png`;
    const tempPath = path.join(app.getPath('temp'), filename);
    fs.writeFileSync(tempPath, buffer);

    safeLog(`💾 Test screenshot saved to: ${tempPath}`);
    safeLog(`📊 Screenshot size: ${buffer.length} bytes`);

    // For testing, let's just save locally and not upload to avoid DB issues
    const testDir = path.join(app.getPath('userData'), 'test_screenshots');
    fs.mkdirSync(testDir, { recursive: true });
    const finalPath = path.join(testDir, filename);
    fs.copyFileSync(tempPath, finalPath);
    fs.unlinkSync(tempPath);

    safeLog(`✅ Test screenshot saved successfully to: ${finalPath}`);
    return true;
    
  } catch (error) {
    safeError('❌ Direct screenshot test failed:', error);
    logError('triggerDirectScreenshot', error);
    return false;
  }
}

async function checkNotifications() {
  if (!currentUserId) return;

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return;
    }

    if (notifications && notifications.length > 0) {
      for (const notification of notifications) {
        showNotification(notification);
        
        // Mark as read
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notification.id);
      }
    }

  } catch (error) {
    console.error('❌ Notification check failed:', error);
    logError('checkNotifications', error);
  }
}

function showNotification(notification: any) {
  try {
    if (Notification.isSupported()) {
      const notif = new Notification({
        title: 'Time Flow',
        body: getOriginalNotificationMessage(notification),
        icon: path.join(__dirname, '../assets/icon.png'), // Add app icon
        silent: false
      });

      notif.show();
      
      notif.on('click', () => {
        console.log('📱 Notification clicked:', notification.type);
        // Could open admin panel or specific page
      });

      console.log('📱 Notification shown:', notification.type);
    }
  } catch (error) {
    console.error('❌ Failed to show notification:', error);
  }
}

function getOriginalNotificationMessage(notification: any): string {
  switch (notification.type) {
    case 'low_activity':
      return 'Low activity detected. Please check your productivity.';
    case 'long_session':
      return 'You\'ve been working for a long time. Consider taking a break.';
    case 'activity_drop':
      return 'Significant activity drop detected.';
    case 'unusual_pattern':
      return 'Unusual activity pattern detected.';
    default:
      return notification.payload?.message || 'You have a new notification.';
  }
}

// Export activity metrics for external access
export function getActivityMetrics(): ActivityMetrics {
  return { ...activityMetrics };
}

// Export function to record REAL user activity (call this from actual input events)
export function recordRealActivity(type: 'mouse_click' | 'keystroke' | 'mouse_movement', count: number = 1) {
  if (!isMonitoring || !currentUserId) return;
  
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  // Record the real activity with proper increments
  const previousMetrics = { ...activityMetrics };
  
  switch (type) {
    case 'mouse_click':
      activityMetrics.mouse_clicks += count;
      break;
    case 'keystroke':
      activityMetrics.keystrokes += count;
      break;
    case 'mouse_movement':
      activityMetrics.mouse_movements += count;
      break;
  }
  
  // Calculate activity score from real input (improved formula)
  let scoreIncrease = 0;
  switch (type) {
    case 'mouse_click':
      scoreIncrease = count * 15; // Clicks are worth more
      break;
    case 'keystroke':
      scoreIncrease = count * 10; // Keystrokes are significant
      break;
    case 'mouse_movement':
      scoreIncrease = count * 2; // Mouse movements are worth less
      break;
  }
  
  // Boost activity score but cap at 100
  const previousScore = activityMetrics.activity_score;
  activityMetrics.activity_score = Math.min(100, activityMetrics.activity_score + scoreIncrease);
  
  // Update last activity time with real input
  updateLastActivity();
  
  // Enhanced detailed logging for all input types
  if (type === 'mouse_click') {
    console.log(`🖱️ Real mouse click detected: ${count} click${count > 1 ? 's' : ''}, total clicks: ${activityMetrics.mouse_clicks}`);
    console.log(`🖱️ MOUSE CLICK DETAILS:`, {
      timestamp: timestamp,
      click_count: count,
      total_session_clicks: activityMetrics.mouse_clicks,
      activity_score_before: previousScore,
      activity_score_after: activityMetrics.activity_score,
      score_increase: scoreIncrease,
      session_totals: {
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
      },
      user_status: 'GENUINELY_ACTIVE_CLICKING'
    });
  } else if (type === 'keystroke') {
    console.log(`⌨️ Real keystroke detected: ${count} keystroke${count > 1 ? 's' : ''}, total keystrokes: ${activityMetrics.keystrokes}`);
    console.log(`⌨️ KEYSTROKE DETAILS:`, {
      timestamp: timestamp,
      keystroke_count: count,
      total_session_keystrokes: activityMetrics.keystrokes,
      activity_score_before: previousScore,
      activity_score_after: activityMetrics.activity_score,
      score_increase: scoreIncrease,
      session_totals: {
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
      },
      user_status: 'GENUINELY_ACTIVE_TYPING'
    });
  } else if (type === 'mouse_movement') {
    // Mouse movement recorded silently to avoid log spam
  }
  
  // Overall activity summary (shown occasionally to avoid spam)
  if (Math.random() < 0.1) { // Show 10% of the time
    console.log(`📊 ACTIVITY SUMMARY:`, {
      timestamp: timestamp,
      latest_input_type: type.toUpperCase(),
      current_activity_score: activityMetrics.activity_score,
      session_activity: {
        total_clicks: activityMetrics.mouse_clicks,
        total_keystrokes: activityMetrics.keystrokes,
        total_movements: activityMetrics.mouse_movements,
        combined_inputs: activityMetrics.mouse_clicks + activityMetrics.keystrokes + activityMetrics.mouse_movements
      },
      productivity_level: activityMetrics.activity_score >= 80 ? 'HIGH' : 
                           activityMetrics.activity_score >= 50 ? 'MEDIUM' : 
                           activityMetrics.activity_score >= 20 ? 'LOW' : 'MINIMAL',
      user_engagement: 'REAL_USER_ACTIVE'
    });
  }
}

// Improved activity metrics reset with better logging
export function resetActivityMetrics() {
  if (!isMonitoring) return;
  
  const oldMetrics = { ...activityMetrics };
  
  // Reset ALL counters for fresh start
  activityMetrics.mouse_clicks = 0;
  activityMetrics.keystrokes = 0;
  activityMetrics.mouse_movements = 0;
  // Keep activity score and last activity time (don't reset these)
  
  console.log('🔄 ACTIVITY_METRICS_RESET:', {
    timestamp: new Date().toISOString(),
    reset_type: '10_MINUTE_INTERVAL',
    previous_metrics: {
      mouse_clicks: oldMetrics.mouse_clicks,
      keystrokes: oldMetrics.keystrokes,
      mouse_movements: oldMetrics.mouse_movements,
      activity_score: oldMetrics.activity_score
    },
    current_metrics: {
      mouse_clicks: activityMetrics.mouse_clicks,
      keystrokes: activityMetrics.keystrokes,
      mouse_movements: activityMetrics.mouse_movements,
      activity_score: activityMetrics.activity_score // This stays the same
    },
    note: 'Counters reset for fresh 10-minute window, score preserved'
  });
  
  // Save the accumulated metrics to current session and app
  if (currentActivitySession) {
    currentActivitySession.total_mouse_clicks += oldMetrics.mouse_clicks;
    currentActivitySession.total_keystrokes += oldMetrics.keystrokes;
    currentActivitySession.total_mouse_movements += oldMetrics.mouse_movements;
    saveActivitySession();
  }
  
  if (currentApp) {
    currentApp.mouse_clicks += oldMetrics.mouse_clicks;
    currentApp.keystrokes += oldMetrics.keystrokes;
    currentApp.mouse_movements += oldMetrics.mouse_movements;
    saveAppActivity();
  }
}

// Export function to force refresh activity display
export function triggerActivityRefresh() {
  if (!isMonitoring) return;
  
  console.log('🔄 Forcing activity refresh:', {
    timestamp: new Date().toISOString(),
    current_metrics: {
      mouse_clicks: activityMetrics.mouse_clicks,
      keystrokes: activityMetrics.keystrokes,
      mouse_movements: activityMetrics.mouse_movements,
      activity_score: activityMetrics.activity_score
    }
  });
}

// Add handlers for app focus/blur events
export function setupAppEventHandlers() {
  try {
    if (!appEvents) {
      appEvents = require('./main').appEvents;
    }
    
    if (appEvents) {
      // Listen for focus events
      appEvents.on('app-focus', () => {
        console.log('👁️ App gained focus');
        recordRealActivity('mouse_click', 1);
        console.log('🖱️ App focus detected - recorded as click');
      });
      
      // Listen for blur events  
      appEvents.on('app-blur', () => {
        console.log('👁️ App lost focus');
        recordRealActivity('mouse_click', 1);
        console.log('🖱️ App blur detected - recorded as click');
      });
      
      console.log('✅ App event handlers setup successfully');
    }
  } catch (error) {
    console.log('⚠️ Could not setup app event handlers:', error);
  }
}

// Call this during initialization
if (appEvents) {
  setupAppEventHandlers();
}

function startRandomScreenshotCapture() {
  if (activityInterval) {
    clearTimeout(activityInterval);
  }
  
  console.log('📸 Starting random screenshots - 2 per 10 minute period');
  scheduleRandomScreenshot();
}

function scheduleRandomScreenshot() {
  if (activityInterval) {
    clearTimeout(activityInterval);
  }
  
  // Generate random interval between 2-8 minutes (120-480 seconds)
  // This ensures 2 screenshots within each 10-minute window at random times
  const minInterval = 120; // 2 minutes 
  const maxInterval = 480; // 8 minutes
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  
  console.log(`📸 Next screenshot in ${Math.round(randomInterval / 60)} minutes ${randomInterval % 60} seconds`);
  
  activityInterval = setTimeout(async () => {
    // Take screenshot regardless of user activity status - that's the whole point of monitoring!
    if (currentUserId) {
      console.log('📸 Attempting scheduled screenshot...');
      await captureActivityScreenshot();
    } else {
      console.log('⚠️ No user ID available for scheduled screenshot');
    }
    // Schedule next random screenshot
    scheduleRandomScreenshot();
  }, randomInterval * 1000);
}

// Export function to get current activity metrics
export function getCurrentActivityMetrics() {
  return {
    mouse_clicks: activityMetrics.mouse_clicks,
    keystrokes: activityMetrics.keystrokes,
    mouse_movements: activityMetrics.mouse_movements,
    activity_score: activityMetrics.activity_score,
    last_activity_time: activityMetrics.last_activity_time,
    last_activity_formatted: new Date(activityMetrics.last_activity_time).toISOString(),
    time_since_last_activity_seconds: Math.round((Date.now() - activityMetrics.last_activity_time) / 1000),
    is_monitoring: isMonitoring,
    current_user_id: currentUserId
  };
}

// Test function to manually trigger activity (for testing)
export function testActivity(type: 'mouse_click' | 'keystroke' | 'mouse_movement' | 'all', count: number = 1) {
  console.log(`🧪 TESTING ACTIVITY: ${type} x${count}`);
  console.log(`🧪 Testing enhanced activity logging system...`);
  
  if (type === 'all') {
    console.log('🧪 === COMPREHENSIVE ACTIVITY TEST ===');
    console.log('🧪 Testing mouse clicks...');
    recordRealActivity('mouse_click', count);
    
    setTimeout(() => {
      console.log('🧪 Testing keystrokes...');
      recordRealActivity('keystroke', count);
    }, 500);
    
    setTimeout(() => {
      console.log('🧪 Testing mouse movements...');
      recordRealActivity('mouse_movement', count * 5); // More movements
    }, 1000);
    
    setTimeout(() => {
      console.log('🧪 === TEST COMPLETE ===');
      const metrics = getCurrentActivityMetrics();
      console.log('🧪 FINAL TEST RESULTS:', {
        test_type: 'COMPREHENSIVE',
        input_count_tested: count,
        final_metrics: metrics,
        test_success: metrics.mouse_clicks > 0 && metrics.keystrokes > 0 && metrics.mouse_movements > 0
      });
    }, 1500);
  } else {
    recordRealActivity(type, count);
    
    setTimeout(() => {
      const metrics = getCurrentActivityMetrics();
      console.log('🧪 SINGLE TEST RESULTS:', {
        test_type: type.toUpperCase(),
        input_count_tested: count,
        final_metrics: metrics,
        test_success: true
      });
    }, 200);
  }
  
  const metrics = getCurrentActivityMetrics();
  return metrics;
}

// Enhanced demonstration function for showcasing the new logging system
export function demonstrateEnhancedLogging() {
  console.log('🎯 === ENHANCED LOGGING DEMONSTRATION ===');
  console.log('🎯 This will show detailed logs for keyboard, mouse clicks, and movements...');
  
  // Test different activity types with delays to show separate logs
  setTimeout(() => {
    console.log('🎯 [1/5] Testing single mouse click...');
    recordRealActivity('mouse_click', 1);
  }, 500);
  
  setTimeout(() => {
    console.log('🎯 [2/5] Testing multiple keystrokes...');
    recordRealActivity('keystroke', 3);
  }, 1000);
  
  setTimeout(() => {
    console.log('🎯 [3/5] Testing mouse movements...');
    recordRealActivity('mouse_movement', 10);
  }, 1500);
  
  setTimeout(() => {
    console.log('🎯 [4/5] Testing rapid clicking...');
    recordRealActivity('mouse_click', 5);
  }, 2000);
  
  setTimeout(() => {
    console.log('🎯 [5/5] Testing heavy typing session...');
    recordRealActivity('keystroke', 15);
  }, 2500);
  
  setTimeout(() => {
    console.log('🎯 === DEMONSTRATION COMPLETE ===');
    const finalMetrics = getCurrentActivityMetrics();
    console.log('🎯 DEMONSTRATION SUMMARY:', {
      total_demonstration_inputs: {
        mouse_clicks: finalMetrics.mouse_clicks,
        keystrokes: finalMetrics.keystrokes,
        mouse_movements: finalMetrics.mouse_movements
      },
      final_activity_score: finalMetrics.activity_score,
      engagement_level: finalMetrics.activity_score >= 80 ? 'VERY_HIGH' : 
                        finalMetrics.activity_score >= 60 ? 'HIGH' : 
                        finalMetrics.activity_score >= 40 ? 'MEDIUM' : 'LOW',
      demonstration_success: true,
      logging_system_status: 'ENHANCED_LOGGING_ACTIVE'
    });
  }, 3000);
} 