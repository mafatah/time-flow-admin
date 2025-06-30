import { app, screen, desktopCapturer, Notification, systemPreferences } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot, queueAppLog } from './unsyncedManager';
import { logError, showError } from './errorHandler';
import { screenshotIntervalSeconds, idleTimeoutMinutes } from './config';

// === DEBUG LOGGING ===
function safeLog(...args: any[]) {
  try {
    console.log(...args);
  } catch (e) {
    // Silent fail for logging
  }
}

function safeError(...args: any[]) {
  try {
    console.error(...args);
  } catch (e) {
    // Silent fail for logging
  }
}

// === INTERFACES ===

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

interface AppSettings {
  blur_screenshots: boolean;
  screenshot_interval_seconds: number;
  idle_threshold_seconds: number;
  max_laptop_closed_hours: number;
  mandatory_screenshot_interval_minutes: number;
}

// === GLOBAL STATE ===

// Settings
let appSettings: AppSettings = {
  blur_screenshots: false,
  screenshot_interval_seconds: 60,
  idle_threshold_seconds: 300, // 5 minutes (removed testing mode)
  max_laptop_closed_hours: 1,
  mandatory_screenshot_interval_minutes: 15
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

// === SEPARATE INDEPENDENT APP TRACKING ===
let lastTrackedApp: string | null = null;
let lastTrackedAppTime: number = 0;
let independentAppInterval: NodeJS.Timeout | null = null;

// === SEPARATE INDEPENDENT URL TRACKING ===
let lastTrackedURL: string | null = null;
let lastTrackedURLTime: number = 0;
let independentUrlInterval: NodeJS.Timeout | null = null;

// === SMART ACTIVITY DETECTION SYSTEM ===
// Immediate detection + Local storage + Batch uploads

// Local storage queues for batch uploads
let localAppQueue: any[] = [];
let localURLQueue: any[] = [];
let localScreenshotQueue: any[] = [];

// Current state tracking for immediate change detection
let currentActiveApp: string | null = null;
let currentActiveWindow: string | null = null;
let currentActiveURL: string | null = null;

// Intervals
let batchUploadInterval: NodeJS.Timeout | null = null;
let screenshotScheduleTimeout: NodeJS.Timeout | null = null;
let immediateDetectionInterval: NodeJS.Timeout | null = null;

// === IMMEDIATE DETECTION SYSTEM ===
async function startImmediateDetection() {
  if (immediateDetectionInterval) {
    clearInterval(immediateDetectionInterval);
  }
  
  safeLog('⚡ Starting immediate app/URL change detection');
  
  // Check for changes every 500ms for immediate detection
  immediateDetectionInterval = setInterval(async () => {
    if (!currentUserId) return;
    
    try {
      const appName = await getCurrentAppName();
      const windowTitle = await getCurrentWindowTitle();
      
      // Detect app/window changes immediately
      const appKey = `${appName}|${windowTitle}`;
      if (appKey !== `${currentActiveApp}|${currentActiveWindow}`) {
        safeLog(`🔄 App change detected: ${appName} - ${windowTitle?.substring(0, 30)}`);
        
        // Store locally immediately
        await storeAppChangeLocally(appName, windowTitle);
        
        currentActiveApp = appName;
        currentActiveWindow = windowTitle;
      }
      
      // Detect URL changes for browsers immediately
      const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc'];
      const isBrowser = browsers.some(browser => appName?.toLowerCase().includes(browser.toLowerCase()));
      
      if (isBrowser) {
        const currentURL = await getCurrentURL();
        if (currentURL && currentURL !== currentActiveURL) {
          safeLog(`🌐 URL change detected: ${extractDomainFromURL(currentURL)}`);
          
          // Store locally immediately
          await storeURLChangeLocally(currentURL, appName);
          
          currentActiveURL = currentURL;
        }
      } else if (currentActiveURL) {
        // Clear URL when switching away from browser
        currentActiveURL = null;
      }
      
    } catch (error) {
      safeLog('⚠️ Immediate detection failed:', (error as Error).message);
    }
  }, 500); // Fast polling for immediate detection
}

function stopImmediateDetection() {
  if (immediateDetectionInterval) {
    clearInterval(immediateDetectionInterval);
    immediateDetectionInterval = null;
    safeLog('🛑 Immediate detection stopped');
  }
}

// === LOCAL STORAGE FUNCTIONS ===
async function storeAppChangeLocally(appName: string, windowTitle: string) {
  const appData = {
    user_id: currentUserId,
    project_id: '00000000-0000-0000-0000-000000000001',
    app_name: appName,
    window_title: windowTitle || 'Unknown Window',
    timestamp: new Date().toISOString(),
    time_log_id: null,
    detected_at: Date.now() // For local tracking
  };
  
  localAppQueue.push(appData);
  safeLog(`📝 App stored locally: ${appName} (queue: ${localAppQueue.length})`);
}

async function storeURLChangeLocally(url: string, browser: string) {
  const urlData = {
    user_id: currentUserId,
    project_id: '00000000-0000-0000-0000-000000000001',
    url: url,
    site_url: url,
    domain: extractDomainFromURL(url),
    browser: browser,
    timestamp: new Date().toISOString(),
    time_log_id: null,
    detected_at: Date.now() // For local tracking
  };
  
  localURLQueue.push(urlData);
  safeLog(`📝 URL stored locally: ${extractDomainFromURL(url)} (queue: ${localURLQueue.length})`);
}

// === BATCH UPLOAD SYSTEM ===
function startBatchUploadSystem() {
  if (batchUploadInterval) {
    clearInterval(batchUploadInterval);
  }
  
  safeLog('📤 Starting batch upload system (every 1 minute)');
  
  // Upload queues every 1 minute
  batchUploadInterval = setInterval(async () => {
    await uploadLocalQueues();
  }, 60000); // 1 minute
}

function stopBatchUploadSystem() {
  if (batchUploadInterval) {
    clearInterval(batchUploadInterval);
    batchUploadInterval = null;
    safeLog('🛑 Batch upload system stopped');
  }
}

async function uploadLocalQueues() {
  if (!currentUserId) return;
  
  const appCount = localAppQueue.length;
  const urlCount = localURLQueue.length;
  
  if (appCount === 0 && urlCount === 0) {
    safeLog('📤 No queued data to upload');
    return;
  }
  
  safeLog(`📤 Uploading batch: ${appCount} apps, ${urlCount} URLs`);
  
  // Upload app logs batch
  if (appCount > 0) {
    try {
      const { error: appError } = await supabase
        .from('app_logs')
        .insert(localAppQueue);
      
      if (appError) {
        safeError('❌ App batch upload failed:', appError);
        // Keep failed items in queue for retry
      } else {
        safeLog(`✅ App batch uploaded: ${appCount} entries`);
        localAppQueue = []; // Clear successful uploads
      }
    } catch (error) {
      safeError('❌ App batch upload error:', error);
    }
  }
  
  // Upload URL logs batch
  if (urlCount > 0) {
    try {
      const { error: urlError } = await supabase
        .from('url_logs')
        .insert(localURLQueue);
      
      if (urlError) {
        safeError('❌ URL batch upload failed:', urlError);
        // Keep failed items in queue for retry
      } else {
        safeLog(`✅ URL batch uploaded: ${urlCount} entries`);
        localURLQueue = []; // Clear successful uploads
      }
    } catch (error) {
      safeError('❌ URL batch upload error:', error);
    }
  }
  
  // Prevent queues from growing too large (safety)
  if (localAppQueue.length > 100) {
    localAppQueue = localAppQueue.slice(-50); // Keep last 50
    safeLog('⚠️ App queue too large, trimmed to 50 entries');
  }
  
  if (localURLQueue.length > 100) {
    localURLQueue = localURLQueue.slice(-50); // Keep last 50
    safeLog('⚠️ URL queue too large, trimmed to 50 entries');
  }
}

// === RANDOM SCREENSHOT SYSTEM ===
function startRandomScreenshotCapture() {
  if (screenshotScheduleTimeout) {
    clearTimeout(screenshotScheduleTimeout);
  }
  
  safeLog('📸 Starting random screenshot system (3 per 10 minutes)');
  scheduleNextRandomScreenshot();
}

function scheduleNextRandomScreenshot() {
  if (screenshotScheduleTimeout) {
    clearTimeout(screenshotScheduleTimeout);
  }
  
  // Random interval between 2-6 minutes to achieve ~3 per 10 minutes
  const minInterval = 2 * 60; // 2 minutes
  const maxInterval = 6 * 60; // 6 minutes
  const randomSeconds = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  
  const nextTime = new Date(Date.now() + (randomSeconds * 1000));
  safeLog(`📸 Next screenshot in ${Math.floor(randomSeconds / 60)}m ${randomSeconds % 60}s at ${nextTime.toLocaleTimeString()}`);
  
  screenshotScheduleTimeout = setTimeout(async () => {
    if (currentUserId) {
      await captureActivityScreenshot();
    }
    // Schedule next random screenshot
    scheduleNextRandomScreenshot();
  }, randomSeconds * 1000);
}

function stopRandomScreenshotCapture() {
  if (screenshotScheduleTimeout) {
    clearTimeout(screenshotScheduleTimeout);
    screenshotScheduleTimeout = null;
    safeLog('🛑 Random screenshot system stopped');
  }
}

// === ENHANCED SCREENSHOT CAPTURE ===
async function captureActivityScreenshot() {
  if (!currentUserId) return;

  try {
    safeLog('📸 Starting screenshot capture with current context...');
    
    // Get current context for screenshot
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();
    const currentURL = await getCurrentURL();
    
    safeLog('📱 Screenshot context:', {
      app: appName || 'Unknown',
      window: windowTitle?.substring(0, 50) || 'Unknown',
      url: currentURL ? 'YES' : 'NO'
    });
    
    // Capture screenshot with timeout
    const screenshotPromise = new Promise(async (resolve, reject) => {
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        
        const sources = await desktopCapturer.getSources({ 
          types: ['screen'], 
          thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
        });
        
        if (sources.length === 0) {
          throw new Error('No screen sources available - check macOS Screen Recording permissions');
        }

        const buffer = sources[0].thumbnail.toPNG();
        const filename = `activity_${Date.now()}_${randomUUID().slice(0, 8)}.png`;
        const tempPath = path.join(app.getPath('temp'), filename);
        
        fs.writeFileSync(tempPath, buffer);
        resolve({ tempPath, filename, context: { appName, windowTitle, currentURL } });
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Screenshot timeout (5s)')), 5000);
    });

    const { tempPath, filename, context } = await Promise.race([screenshotPromise, timeoutPromise]) as any;
    
    // Upload with context
    await uploadActivityScreenshot(tempPath, filename, {
      app_name: context.appName,
      window_title: context.windowTitle,
      url: context.currentURL
    });
    
    safeLog('✅ Screenshot captured and uploaded successfully!');
    
  } catch (error) {
    safeError('❌ Screenshot capture failed:', error);
  }
}

// === ESSENTIAL DETECTION FUNCTIONS ===
async function getCurrentAppName(): Promise<string> {
  try {
    if (process.platform === 'darwin') {
      // Try active-win first (works with Screen Recording permission)
      try {
        const activeWin = require('active-win');
        const activeWindow = await activeWin();
        if (activeWindow && activeWindow.owner && activeWindow.owner.name) {
          const appName = activeWindow.owner.name;
          if (appName !== 'Ebdaa Work Time' && appName !== 'TimeFlow') {
            safeLog('✅ App detected via active-win:', appName);
            return appName;
          }
        }
      } catch (e) {
        safeLog('❌ Active-win failed:', e);
      }
      
      // Fallback to AppleScript (requires Accessibility permission)
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const methods = [
        'osascript -e "tell application \"System Events\" to get name of first application process whose frontmost is true"',
        'osascript -e "tell application \"System Events\" to get displayed name of first application process whose frontmost is true"'
      ];
      
      for (const method of methods) {
        try {
          const { stdout } = await execAsync(method);
          const appName = stdout.trim();
          if (appName && appName !== 'Ebdaa Work Time' && appName !== 'TimeFlow') {
            safeLog('✅ App detected via AppleScript:', appName);
            return appName;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    return 'Unknown Application';
  } catch (error) {
    safeLog('❌ App detection failed:', error);
    return 'Unknown Application';
  }
}

async function getCurrentWindowTitle(): Promise<string> {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    if (process.platform === 'darwin') {
      try {
        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get title of front window of (first application process whose frontmost is true)'`);
        const windowTitle = stdout && typeof stdout === 'string' ? stdout.trim() : '';
        
        if (windowTitle && windowTitle !== '' && !windowTitle.includes('error')) {
          return windowTitle;
        }
      } catch (windowError) {
        // Fallback to app name if window title not available
        const appName = await getCurrentAppName();
        return `${appName} Window`;
      }
    }
    
    return 'Unknown Window';
  } catch (error) {
    safeError('❌ Window title detection failed:', error);
    return 'Unknown Window';
  }
}

async function getCurrentURL(): Promise<string | undefined> {
  try {
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Check if it's actually a browser
    const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc', 'chrome', 'firefox', 'msedge'];
    const isBrowser = browsers.some(browser => appName.toLowerCase().includes(browser.toLowerCase()));
    
    if (!isBrowser) {
      return undefined;
    }

    if (process.platform === 'darwin') {
      try {
        let script = '';
        if (appName.includes('Chrome') || appName.includes('Arc')) {
          script = `osascript -e 'tell application "Google Chrome" to get URL of active tab of front window'`;
        } else if (appName.includes('Safari')) {
          script = `osascript -e 'tell application "Safari" to get URL of front document'`;
        } else {
          return undefined;
        }
        
        const { stdout } = await execAsync(script);
        const url = stdout.trim();
        
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          return url;
        }
      } catch (error) {
        safeLog('❌ URL detection failed:', error);
      }
    }
    
    return undefined;
  } catch (error) {
    return undefined;
  }
}

function debugLog(type: string, message: string, stats?: any) {
  safeLog(`[${type}] ${message}`);
}

async function startIndependentAppTracking() {
  if (independentAppInterval) {
    clearInterval(independentAppInterval);
  }
  
  safeLog('🖥️ Starting independent app tracking (separate from screenshots)');
  
  // Track app changes every 5 seconds
  independentAppInterval = setInterval(async () => {
    if (!currentUserId) return;
    
    try {
      const appName = await getCurrentAppName();
      const windowTitle = await getCurrentWindowTitle();
      const now = Date.now();
      
      // Only save if app changed or 30 seconds have passed
      const appKey = `${appName}|${windowTitle}`;
      const timeSinceLastTrack = now - lastTrackedAppTime;
      
      if (appKey !== lastTrackedApp || timeSinceLastTrack > 30000) {
        if (appName && appName !== 'Unknown Application') {
          await saveAppLogEntry({
            user_id: currentUserId,
            project_id: '00000000-0000-0000-0000-000000000001',
            app_name: appName,
            window_title: windowTitle || 'Unknown Window',
            timestamp: new Date().toISOString(),
            time_log_id: null // Independent of time tracking
          });
          
          lastTrackedApp = appKey;
          lastTrackedAppTime = now;
          
          safeLog(`🖥️ App tracked: ${appName} - ${windowTitle?.substring(0, 30)}`);
        }
      }
    } catch (error) {
      safeLog('⚠️ App tracking failed:', (error as Error).message);
    }
  }, 5000); // Every 5 seconds
}

function stopIndependentAppTracking() {
  if (independentAppInterval) {
    clearInterval(independentAppInterval);
    independentAppInterval = null;
    safeLog('🛑 Independent app tracking stopped');
  }
}

async function saveAppLogEntry(appLogData: any) {
  try {
    const { error } = await supabase
      .from('app_logs')
      .insert(appLogData);

    if (error) {
      safeError('❌ Failed to save app log:', error);
      // Queue for later if failed
      queueAppLog(appLogData);
    } else {
      debugLog('APP', `Saved: ${appLogData.app_name}`);
    }
  } catch (error) {
    safeError('❌ App log save error:', error);
    queueAppLog(appLogData);
  }
}

async function startIndependentURLTracking() {
  if (independentUrlInterval) {
    clearInterval(independentUrlInterval);
  }
  
  safeLog('🌐 Starting independent URL tracking (separate from screenshots)');
  
  // Track URL changes every 10 seconds
  independentUrlInterval = setInterval(async () => {
    if (!currentUserId) return;
    
    try {
      const appName = await getCurrentAppName();
      
      // Only try URL detection for browsers
      const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc'];
      const isBrowser = browsers.some(browser => appName?.toLowerCase().includes(browser.toLowerCase()));
      
      if (!isBrowser) return;
      
      const currentURL = await getCurrentURL();
      const now = Date.now();
      
      // Only save if URL changed or 60 seconds have passed
      const timeSinceLastTrack = now - lastTrackedURLTime;
      
      if (currentURL && (currentURL !== lastTrackedURL || timeSinceLastTrack > 60000)) {
        await saveURLLogEntry({
          user_id: currentUserId,
          project_id: '00000000-0000-0000-0000-000000000001',
          url: currentURL,
          site_url: currentURL,
          domain: extractDomainFromURL(currentURL),
          browser: appName,
          timestamp: new Date().toISOString(),
          time_log_id: null // Independent of time tracking
        });
        
        lastTrackedURL = currentURL;
        lastTrackedURLTime = now;
        
        safeLog(`🌐 URL tracked: ${extractDomainFromURL(currentURL)} (${appName})`);
      }
    } catch (error) {
      safeLog('⚠️ URL tracking failed:', (error as Error).message);
    }
  }, 10000); // Every 10 seconds
}

function stopIndependentURLTracking() {
  if (independentUrlInterval) {
    clearInterval(independentUrlInterval);
    independentUrlInterval = null;
    safeLog('🛑 Independent URL tracking stopped');
  }
}

async function saveURLLogEntry(urlLogData: any) {
  try {
    const { error } = await supabase
      .from('url_logs')
      .insert(urlLogData);

    if (error) {
      safeError('❌ Failed to save URL log:', error);
      // Just log the error for now since we don't have queueURLLog
      safeLog('📝 URL log will be retried next time:', urlLogData.domain);
    } else {
      debugLog('URL', `Saved: ${urlLogData.domain}`);
    }
  } catch (error) {
    safeError('❌ URL log save error:', error);
  }
}

function extractDomainFromURL(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// Always-on activity monitoring - starts when app launches
export async function startActivityMonitoring(userId: string) {
  safeLog(`🚀 Starting SMART activity monitoring for user: ${userId}`);
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

  // ⭐ START NEW SMART TRACKING SYSTEMS
  safeLog('🧠 Starting smart detection systems...');
  
  // 1. Immediate detection (500ms polling for instant response)
  await startImmediateDetection();
  
  // 2. Batch upload system (every 1 minute)
  startBatchUploadSystem();
  
  // 3. Random screenshot capture (3 per 10 minutes)
  startRandomScreenshotCapture();
  
  safeLog('✅ Smart tracking systems started successfully!');
  safeLog('📊 Active: Immediate Detection + Batch Uploads + Random Screenshots');
}

export function stopActivityMonitoring() {
  if (!isMonitoring) return;

  safeLog('🛑 Stopping smart activity monitoring systems');
  isMonitoring = false;

  // Stop all NEW systems
  stopImmediateDetection();
  stopBatchUploadSystem(); 
  stopRandomScreenshotCapture();

  // Upload any remaining queued data before stopping
  if (localAppQueue.length > 0 || localURLQueue.length > 0) {
    safeLog('📤 Uploading final batch before shutdown...');
    uploadLocalQueues();
  }

  // Clear old intervals (if any)
  if (activityInterval) {
    clearTimeout(activityInterval);
    activityInterval = undefined;
  }

  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = undefined;
  }

  currentUserId = null;
  safeLog('✅ All smart monitoring stopped successfully');
}

async function uploadActivityScreenshot(filePath: string, filename: string, context?: {
  app_name?: string;
  window_title?: string;
  url?: string;
}) {
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

  safeLog(`☁️ Starting screenshot upload with context...`);
  safeLog(`📋 Context:`, {
    app: context?.app_name || 'Unknown',
    window: context?.window_title?.substring(0, 30) || 'Unknown',
    url: context?.url ? 'YES' : 'NO'
  });

  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(`${currentUserId}/${filename}`, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      safeError('❌ Storage upload failed:', uploadError);
      queueScreenshot({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: `local://${filePath}`,
        captured_at: new Date().toISOString()
      });
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(`${currentUserId}/${filename}`);

    // Save to database with context
    const dbPayload = {
      user_id: currentUserId,
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: publicUrl,
      captured_at: new Date().toISOString(),
      activity_percent: Math.round(activityMetrics.activity_score),
      focus_percent: Math.round(activityMetrics.activity_score * 0.8),
      mouse_clicks: activityMetrics.mouse_clicks,
      keystrokes: activityMetrics.keystrokes,
      mouse_movements: activityMetrics.mouse_movements,
      // ⭐ CRITICAL: Include app context
      app_name: context?.app_name || null,
      window_title: context?.window_title || null,
      url: context?.url || null
    };

    const { error: dbError } = await supabase
      .from('screenshots')
      .insert(dbPayload);

    if (dbError) {
      safeError('❌ Database save failed:', dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }

    safeLog('🎉 Screenshot uploaded with context successfully!');
    safeLog(`✅ Context saved: App="${context?.app_name}" | URL="${context?.url ? 'YES' : 'NO'}"`);
    
    // Clean up temp file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      safeLog('⚠️ Could not clean up temp file:', (cleanupError as Error).message);
    }

  } catch (error) {
    safeError('💥 Screenshot upload failed:', error);
    throw error;
  }
}

// Export functions for manual control
export { 
  startIndependentAppTracking, 
  stopIndependentAppTracking, 
  startIndependentURLTracking, 
  stopIndependentURLTracking, 
  getCurrentAppName, 
  getCurrentURL 
};

// === LEGACY FUNCTION EXPORTS FOR COMPATIBILITY ===
// These functions are called by main.ts and need to be exported

export async function triggerDirectScreenshot(): Promise<void> {
  if (!currentUserId) {
    safeLog('⚠️ Cannot trigger screenshot: No user logged in');
    return;
  }
  
  safeLog('📸 Manual screenshot triggered from main.ts');
  await captureActivityScreenshot();
}

export async function triggerActivityCapture(): Promise<void> {
  if (!currentUserId) {
    safeLog('⚠️ Cannot trigger activity capture: No user logged in');
    return;
  }
  
  safeLog('🎯 Manual activity capture triggered from main.ts');
  await captureActivityScreenshot();
}

export function recordRealActivity(): void {
  if (!currentUserId) {
    safeLog('⚠️ Cannot record activity: No user logged in');
    return;
  }
  
  safeLog('📊 Recording real activity from main.ts');
  // Update activity metrics
  activityMetrics.last_activity_time = Date.now();
  activityMetrics.activity_score = Math.min(100, activityMetrics.activity_score + 10);
}

export function demonstrateEnhancedLogging(): void {
  safeLog('🔍 Enhanced logging demonstration from main.ts');
  safeLog('📊 Current activity metrics:', activityMetrics);
  safeLog('👤 Current user ID:', currentUserId || 'None');
  safeLog('⚡ Monitoring status:', isMonitoring ? 'Active' : 'Inactive');
  safeLog('📝 Queue status:', {
    apps: localAppQueue.length,
    urls: localURLQueue.length
  });
}

// === SMART ACTIVITY LOGGING ===
// Log current activity state for debugging
safeLog('🧠 Smart Activity Monitor Initialized');
safeLog('✅ Features: Immediate Detection + Batch Upload + Random Screenshots');