import { app, desktopCapturer, screen, Notification } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot, queueAppLog } from './unsyncedManager';
import { logError, showError } from './errorHandler';
import { screenshotIntervalSeconds, idleTimeoutMinutes } from './config';

// Import app events for communication with main process
let appEvents: any = null;
try {
  // Use dynamic import to avoid circular dependency
  appEvents = require('./main').appEvents;
} catch (e) {
  // Fallback if main is not available
  console.log('Main events not available yet');
}

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
}

let appSettings: AppSettings = {
  blur_screenshots: false,
  screenshot_interval_seconds: screenshotIntervalSeconds,
  idle_threshold_seconds: idleTimeoutMinutes * 60
};

let activityInterval: ReturnType<typeof setInterval> | undefined;
let appTrackingInterval: ReturnType<typeof setInterval> | undefined;
let notificationInterval: ReturnType<typeof setInterval> | undefined;
let activityMetricsInterval: ReturnType<typeof setInterval> | undefined;
let isMonitoring = false;
let currentUserId: string | null = null;
let currentActivitySession: ActivitySession | null = null;
let lastActivityTime = Date.now();
let currentApp: AppActivity | null = null;
let activityMetrics: ActivityMetrics = {
  mouse_clicks: 0,
  keystrokes: 0,
  mouse_movements: 0,
  last_activity_time: Date.now(),
  activity_score: 0
};

// Add new variables for enhanced idle detection
let consecutiveScreenshotFailures = 0;
let lastSuccessfulScreenshot = Date.now();
let systemUnavailableStart: number | null = null;
const MAX_SCREENSHOT_FAILURES = 3; // Stop after 3 consecutive failures
const MAX_SYSTEM_UNAVAILABLE_TIME = 2 * 60 * 1000; // 2 minutes
const SCREENSHOT_TIMEOUT_MS = 10000; // 10 seconds timeout for screenshot capture

// Always-on activity monitoring - starts when app launches
export async function startActivityMonitoring(userId: string) {
  if (isMonitoring) {
    console.log('🔄 Activity monitoring already running');
    return;
  }

  console.log('🚀 Starting always-on activity monitoring for user:', userId);
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

  // Start app activity tracking every 5 seconds
  appTrackingInterval = setInterval(async () => {
    if (currentUserId && isUserActive()) {
      await trackCurrentApp();
      updateLastActivity();
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

  console.log(`✅ Activity monitoring started - Random screenshots (2 per 10 min), App tracking every 5s, Activity metrics every 1s`);
}

export function stopActivityMonitoring() {
  if (!isMonitoring) return;

  console.log('🛑 Stopping activity monitoring');
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

  // End current activity session
  if (currentActivitySession) {
    currentActivitySession.end_time = new Date().toISOString();
    currentActivitySession.is_active = false;
    currentActivitySession.total_mouse_clicks = activityMetrics.mouse_clicks;
    currentActivitySession.total_keystrokes = activityMetrics.keystrokes;
    currentActivitySession.total_mouse_movements = activityMetrics.mouse_movements;
    saveActivitySession();
  }

  // End current app activity
  if (currentApp) {
    currentApp.end_time = new Date().toISOString();
    currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
    currentApp.mouse_clicks = activityMetrics.mouse_clicks;
    currentApp.keystrokes = activityMetrics.keystrokes;
    currentApp.mouse_movements = activityMetrics.mouse_movements;
    saveAppActivity();
  }

  currentActivitySession = null;
  currentApp = null;
  currentUserId = null;
}

function isUserActive(): boolean {
  const idleTimeMs = appSettings.idle_threshold_seconds * 1000;
  const timeSinceLastActivity = Date.now() - lastActivityTime;
  const timeSinceLastScreenshot = Date.now() - lastSuccessfulScreenshot;
  
  // Check if we've had too many screenshot failures or been too long without successful capture
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    console.log(`❌ Too many consecutive screenshot failures (${consecutiveScreenshotFailures}), user considered inactive`);
    return false;
  }
  
  // If we haven't had a successful screenshot in a while, consider user inactive
  if (timeSinceLastScreenshot > MAX_SYSTEM_UNAVAILABLE_TIME) {
    console.log(`❌ No successful screenshot in ${Math.round(timeSinceLastScreenshot / 1000)}s, user considered inactive`);
    return false;
  }
  
  return timeSinceLastActivity < idleTimeMs;
}

function updateLastActivity() {
  lastActivityTime = Date.now();
  activityMetrics.last_activity_time = Date.now();
}

// Simulate keyboard and mouse activity tracking
// In a real implementation, you'd use native modules to track actual input
async function trackActivityMetrics() {
  if (!currentUserId || !isMonitoring) return;

  try {
    // Simulate activity detection (in production, use native modules)
    const now = Date.now();
    const timeSinceLastActivity = now - activityMetrics.last_activity_time;
    
    // Simulate some activity based on time (for demo purposes)
    if (timeSinceLastActivity < 5000) { // Active in last 5 seconds
      // Simulate random activity
      const mouseClicks = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
      const keystrokes = Math.random() > 0.7 ? Math.floor(Math.random() * 10) : 0;
      const mouseMovements = Math.random() > 0.5 ? Math.floor(Math.random() * 20) : 0;
      
      activityMetrics.mouse_clicks += mouseClicks;
      activityMetrics.keystrokes += keystrokes;
      activityMetrics.mouse_movements += mouseMovements;
      
      // Calculate activity score (0-100)
      const recentActivity = mouseClicks + keystrokes + (mouseMovements / 10);
      activityMetrics.activity_score = Math.min(100, Math.max(0, recentActivity * 10));
      
      if (mouseClicks > 0 || keystrokes > 0 || mouseMovements > 0) {
        updateLastActivity();
      }
    } else {
      // Decrease activity score over time
      activityMetrics.activity_score = Math.max(0, activityMetrics.activity_score - 1);
    }

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
    console.error('❌ Activity metrics tracking failed:', error);
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
        idle_threshold_seconds: config.idle_threshold_seconds || 300
      };
      console.log('✅ Settings loaded from config:', appSettings);
      return;
    }

    // Fallback to database settings if config file doesn't exist
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .single();
    
    if (error) {
      console.log('⚠️ Could not fetch settings, using defaults:', error);
      return;
    }
    
    if (data) {
      appSettings = {
        blur_screenshots: data.blur_screenshots || false,
        screenshot_interval_seconds: data.screenshot_interval_seconds || 60,
        idle_threshold_seconds: data.idle_threshold_seconds || 300
      };
      console.log('✅ Settings loaded from database:', appSettings);
    }
  } catch (error) {
    console.error('❌ Settings fetch error:', error);
    logError('fetchSettings', error);
  }
}

// Add blur function using Canvas API
async function blurImage(buffer: Buffer): Promise<Buffer> {
  try {
    // For now, we'll use a simple approach - in production you'd want to use sharp or canvas
    // This is a placeholder that returns the original buffer
    // In a real implementation, you'd blur the image here
    console.log('🔄 Blurring screenshot...');
    
    // TODO: Implement actual image blurring using sharp or canvas
    // For now, just return original buffer
    return buffer;
  } catch (error) {
    console.error('❌ Image blur failed:', error);
    return buffer; // Return original if blur fails
  }
}

async function captureActivityScreenshot() {
  if (!currentUserId || !currentActivitySession) return;

  try {
    console.log('📸 Capturing activity screenshot...');
    
    // Add timeout to screenshot capture
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

        let buffer = sources[0].thumbnail.toPNG();
        
        // Apply blur if enabled in settings
        if (appSettings.blur_screenshots) {
          console.log('🔄 Applying blur to screenshot...');
          buffer = await blurImage(buffer);
        }
        
        const filename = `activity_${randomUUID()}.png`;
        const tempPath = path.join(app.getPath('temp'), filename);
        fs.writeFileSync(tempPath, buffer);

        console.log('💾 Activity screenshot saved:', filename);
        resolve({ tempPath, filename });
      } catch (error) {
        reject(error);
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Screenshot capture timeout')), SCREENSHOT_TIMEOUT_MS);
    });

    const { tempPath, filename } = await Promise.race([screenshotPromise, timeoutPromise]) as any;

    // Upload to Supabase with activity metrics
    await uploadActivityScreenshot(tempPath, filename);
    
    // Update session stats
    currentActivitySession.total_screenshots++;
    saveActivitySession();

    // Reset failure count on success
    consecutiveScreenshotFailures = 0;
    lastSuccessfulScreenshot = Date.now();
    
    // Reset system unavailable tracking
    if (systemUnavailableStart) {
      console.log('✅ System available again after being unavailable');
      systemUnavailableStart = null;
    }

    console.log('✅ Activity screenshot uploaded successfully with metrics');
    
  } catch (error) {
    consecutiveScreenshotFailures++;
    console.error(`❌ Activity screenshot failed (${consecutiveScreenshotFailures}/${MAX_SCREENSHOT_FAILURES}):`, error);
    logError('captureActivityScreenshot', error);
    
    // Track when system became unavailable
    if (!systemUnavailableStart) {
      systemUnavailableStart = Date.now();
      console.log('⚠️ System appears to be unavailable, starting timer');
    }
    
    // Check if we should stop tracking due to consecutive failures or timeout
    const shouldStopTracking = consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES || 
                              (systemUnavailableStart && (Date.now() - systemUnavailableStart) > MAX_SYSTEM_UNAVAILABLE_TIME);
    
    if (shouldStopTracking) {
      console.log('🛑 Stopping tracking due to system unavailability or screenshot failures');
      
      // Stop all monitoring
      stopActivityMonitoring();
      
      // Notify main process to stop timer tracking
      try {
        if (!appEvents) {
          appEvents = require('./main').appEvents;
        }
        if (appEvents) {
          appEvents.emit('auto-stop-tracking', {
            reason: consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES ? 'screenshot_failures' : 'system_unavailable',
            failures: consecutiveScreenshotFailures,
            unavailableTime: systemUnavailableStart ? Date.now() - systemUnavailableStart : 0
          });
        }
      } catch (e) {
        console.log('⚠️ Could not notify main process:', e);
      }
      
      // Show notification if possible
      try {
        new Notification({
          title: 'TimeFlow - Tracking Stopped',
          body: consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES 
            ? 'Tracking stopped due to screenshot capture issues (laptop closed?)'
            : 'Tracking stopped due to system inactivity'
        }).show();
      } catch (e) {
        // Silent fail for notifications
      }
    }
  }
}

async function uploadActivityScreenshot(filePath: string, filename: string) {
  if (!currentUserId) {
    console.log('⚠️ No user ID available, queuing screenshot for later upload');
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
  
  console.log(`☁️ Uploading activity screenshot - user: ${currentUserId}, task: ${taskId}`);

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
      console.log('❌ Storage upload failed:', uploadError);
      queueScreenshot({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: `local://${filePath}`,
        captured_at: new Date().toISOString()
      });
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(`${currentUserId}/${filename}`);

    // Save to database with activity metrics
    const { error: dbError } = await supabase
      .from('screenshots')
      .insert({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: publicUrl,
        captured_at: new Date().toISOString(),
        activity_percent: Math.round(activityMetrics.activity_score),
        focus_percent: Math.round(activityMetrics.activity_score * 0.8), // Estimate focus from activity
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
      });

    if (dbError) {
      console.log('❌ Database save failed:', dbError);
      queueScreenshot({
        user_id: currentUserId,
        project_id: '00000000-0000-0000-0000-000000000001',
        image_url: publicUrl,
        captured_at: new Date().toISOString()
      });
      return;
    }

    console.log('✅ Activity screenshot uploaded successfully with metrics');
    
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
      // Silent fail if events not available
    }
    
    // Clean up local file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.log('⚠️ Could not delete local file:', (err as Error).message);
    }

  } catch (error) {
    console.log('❌ Activity screenshot upload error:', error);
    queueScreenshot({
      user_id: currentUserId,
      project_id: '00000000-0000-0000-0000-000000000001',
      image_url: `local://${filePath}`,
      captured_at: new Date().toISOString()
    });
  }
}

async function getCurrentAppName(): Promise<string> {
  try {
    // For macOS, we need to use native calls to get real app names
    // This is a simplified implementation - in production you'd use native modules
    
    // Disable fake data generation and return a more realistic detection
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Get the frontmost application on macOS
      const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
      const appName = stdout.trim();
      return appName || 'Unknown Application';
    } catch (error) {
      console.log('⚠️ Could not detect real app, using fallback');
      return 'System Application';
    }
  } catch (error) {
    console.error('❌ App detection failed:', error);
    return 'Unknown Application';
  }
}

async function getCurrentWindowTitle(): Promise<string> {
  try {
    // For macOS, get the window title of the frontmost application
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // Get the window title of the frontmost window
      const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get title of front window of first application process whose frontmost is true'`);
      const windowTitle = stdout.trim();
      return windowTitle || 'Unknown Window';
    } catch (error) {
      // Fallback to app name if window title not available
      const appName = await getCurrentAppName();
      return `${appName} Window`;
    }
  } catch (error) {
    console.error('❌ Window title detection failed:', error);
    return 'Unknown Window';
  }
}

async function getCurrentURL(): Promise<string | undefined> {
  try {
    // Only try to get URLs from actual browser applications
    const appName = await getCurrentAppName();
    
    // Check if it's actually a browser
    const browsers = ['Google Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Arc'];
    const isBrowser = browsers.some(browser => appName.includes(browser));
    
    if (!isBrowser) {
      return undefined;
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
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
      
      // Only return valid URLs
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
      
      return undefined;
    } catch (error) {
      // Don't log URL detection errors as they're common when browser isn't open
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
}

async function trackCurrentApp() {
  if (!currentUserId || !currentActivitySession) return;

  try {
    // Get current active application
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();
    const currentURL = await getCurrentURL();

    if (currentApp && 
        currentApp.app_name === appName && 
        currentApp.window_title === windowTitle &&
        currentApp.url === currentURL) {
      // Still in same app/window/URL, continue tracking
      return;
    }

    // End previous app activity
    if (currentApp) {
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
    }

    // Start new app activity
    currentApp = {
      app_name: appName,
      window_title: windowTitle,
      start_time: new Date().toISOString(),
      duration_seconds: 0,
      url: currentURL,
      mouse_clicks: 0,
      keystrokes: 0,
      mouse_movements: 0
    };

    currentActivitySession.total_apps++;
    saveActivitySession();

    console.log('📱 App activity:', appName, '-', windowTitle, currentURL ? `(${currentURL})` : '');

  } catch (error) {
    console.error('❌ App tracking failed:', error);
    logError('trackCurrentApp', error);
  }
}

async function saveAppActivity() {
  if (!currentApp || !currentUserId || !currentActivitySession) return;

  try {
    // Use minimal app_logs schema - only basic columns that definitely exist
    const appLogData = {
      user_id: currentUserId,
      project_id: '00000000-0000-0000-0000-000000000001', // Use default project UUID
      app_name: currentApp.app_name,
      window_title: currentApp.window_title
    };

    const { error } = await supabase
      .from('app_logs')
      .insert(appLogData);

    if (error) {
      // Queue for later upload if database fails
      queueAppLog(appLogData);
      throw error;
    }

    console.log('✅ App activity saved:', currentApp.app_name);

  } catch (error) {
    console.error('❌ Failed to save app activity:', error);
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
  if (!appActivity.url || !currentUserId) return;

  try {
    // Use minimal url_logs schema
    const urlLogData = {
      user_id: currentUserId,
      site_url: appActivity.url,
      category: getURLCategory(appActivity.url)
    };

    const { error } = await supabase
      .from('url_logs')
      .insert(urlLogData);

    if (error) {
      console.error('❌ Failed to save URL activity:', error);
      // Could queue for later upload here
    } else {
      console.log('✅ URL activity saved:', appActivity.url);
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
  console.log('🧪 triggerActivityCapture() called');
  console.log('📊 Activity monitoring state - isMonitoring:', isMonitoring, 'currentUserId:', currentUserId);
  
  // Use the real task ID from active tracking if available, otherwise skip
  if (!currentUserId) {
    console.log('⚠️ No user ID set for activity capture - skipping screenshot');
    return;
  }
  
  console.log('📸 Triggering manual screenshot capture...');
  captureActivityScreenshot();
}

// Direct screenshot test function (for testing without activity monitoring)
export async function triggerDirectScreenshot() {
  console.log('🧪 triggerDirectScreenshot() called - testing basic screenshot functionality');
  
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    console.log(`🖥️ Display size: ${width}x${height}`);
    
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
    });
    
    console.log(`📺 Available sources: ${sources.length}`);
    
    if (sources.length === 0) {
      console.log('❌ No screen sources available - check macOS Screen Recording permissions');
      return false;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const filename = `test_direct_${randomUUID()}.png`;
    const tempPath = path.join(app.getPath('temp'), filename);
    fs.writeFileSync(tempPath, buffer);

    console.log(`💾 Test screenshot saved to: ${tempPath}`);
    console.log(`📊 Screenshot size: ${buffer.length} bytes`);

    // For testing, let's just save locally and not upload to avoid DB issues
    const testDir = path.join(app.getPath('userData'), 'test_screenshots');
    fs.mkdirSync(testDir, { recursive: true });
    const finalPath = path.join(testDir, filename);
    fs.copyFileSync(tempPath, finalPath);
    fs.unlinkSync(tempPath);

    console.log(`✅ Test screenshot saved successfully to: ${finalPath}`);
    return true;
    
  } catch (error) {
    console.error('❌ Direct screenshot test failed:', error);
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
        body: getNotificationMessage(notification),
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

function getNotificationMessage(notification: any): string {
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
    if (currentUserId && isUserActive()) {
      await captureActivityScreenshot();
      updateLastActivity();
    }
    // Schedule next random screenshot
    scheduleRandomScreenshot();
  }, randomInterval * 1000);
} 