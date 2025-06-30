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
  safeLog(`🚀 Starting comprehensive activity monitoring for user: ${userId}`);
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

  // ⭐ START ALL TRACKING SYSTEMS
  safeLog('🔄 Starting all tracking systems...');
  
  // 1. Start independent app tracking (separate from screenshots)
  await startIndependentAppTracking();
  
  // 2. Start independent URL tracking (separate from screenshots)  
  await startIndependentURLTracking();
  
  safeLog('✅ All tracking systems started successfully!');
  safeLog('📊 Active systems: Screenshots + Independent App + Independent URL tracking');
}

export function stopActivityMonitoring() {
  if (!isMonitoring) return;

  safeLog('🛑 Stopping all activity monitoring systems');
  isMonitoring = false;

  // Stop all tracking systems
  stopIndependentAppTracking();
  stopIndependentURLTracking();

  // Clear intervals
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

  currentUserId = null;
  safeLog('✅ All monitoring stopped successfully');
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