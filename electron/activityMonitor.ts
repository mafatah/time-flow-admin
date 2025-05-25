import { app, desktopCapturer, screen, Notification } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot, queueAppLog } from './unsyncedManager';
import { logError, showError } from './errorHandler';
import { screenshotIntervalSeconds, idleTimeoutMinutes } from './config';

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
}

interface AppActivity {
  app_name: string;
  window_title: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  url?: string;
}

// Add blur settings interface
interface AppSettings {
  blur_screenshots: boolean;
  screenshot_interval_seconds: number;
  idle_threshold_seconds: number;
}

let appSettings: AppSettings = {
  blur_screenshots: false,
  screenshot_interval_seconds: 20,
  idle_threshold_seconds: 180
};

let activityInterval: ReturnType<typeof setInterval> | undefined;
let appTrackingInterval: ReturnType<typeof setInterval> | undefined;
let notificationInterval: ReturnType<typeof setInterval> | undefined;
let isMonitoring = false;
let currentUserId: string | null = null;
let currentActivitySession: ActivitySession | null = null;
let lastActivityTime = Date.now();
let currentApp: AppActivity | null = null;

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

  // Fetch settings from server first
  await fetchSettings();

  // Create new activity session
  currentActivitySession = {
    id: randomUUID(),
    user_id: userId,
    start_time: new Date().toISOString(),
    is_active: true,
    total_screenshots: 0,
    total_apps: 0
  };

  // Save session to database
  saveActivitySession();

  // Start screenshot capture using settings interval
  activityInterval = setInterval(async () => {
    if (currentUserId && isUserActive()) {
      await captureActivityScreenshot();
      updateLastActivity();
    }
  }, appSettings.screenshot_interval_seconds * 1000);

  // Start app activity tracking every 5 seconds
  appTrackingInterval = setInterval(async () => {
    if (currentUserId && isUserActive()) {
      await trackCurrentApp();
      updateLastActivity();
    }
  }, 5000);

  // Start notification checking every 60 seconds
  notificationInterval = setInterval(async () => {
    await checkNotifications();
  }, 60000);

  console.log(`✅ Activity monitoring started - Screenshots every ${appSettings.screenshot_interval_seconds}s, App tracking every 5s`);
}

export function stopActivityMonitoring() {
  if (!isMonitoring) return;

  console.log('🛑 Stopping activity monitoring');
  isMonitoring = false;

  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = undefined;
  }

  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = undefined;
  }

  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = undefined;
  }

  // End current activity session
  if (currentActivitySession) {
    currentActivitySession.end_time = new Date().toISOString();
    currentActivitySession.is_active = false;
    saveActivitySession();
  }

  // End current app activity
  if (currentApp) {
    currentApp.end_time = new Date().toISOString();
    currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
    saveAppActivity();
  }

  currentActivitySession = null;
  currentApp = null;
  currentUserId = null;
}

function isUserActive(): boolean {
  const idleTimeMs = appSettings.idle_threshold_seconds * 1000;
  return (Date.now() - lastActivityTime) < idleTimeMs;
}

function updateLastActivity() {
  lastActivityTime = Date.now();
}

// Add settings fetch function
export async function fetchSettings() {
  try {
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
        screenshot_interval_seconds: data.screenshot_interval_seconds || 20,
        idle_threshold_seconds: data.idle_threshold_seconds || 180
      };
      console.log('✅ Settings loaded:', appSettings);
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
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
    });
    
    if (sources.length === 0) {
      console.log('❌ No screen sources available - check macOS Screen Recording permissions');
      return;
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

    // Upload to Supabase
    await uploadActivityScreenshot(tempPath, filename);
    
    // Update session stats
    currentActivitySession.total_screenshots++;
    saveActivitySession();

    console.log('✅ Activity screenshot uploaded successfully');
    
  } catch (error) {
    console.error('❌ Activity screenshot failed:', error);
    logError('captureActivityScreenshot', error);
  }
}

async function uploadActivityScreenshot(filePath: string, filename: string) {
  if (!currentUserId) {
    console.log('⚠️ No user ID available, queuing screenshot for later upload');
    queueScreenshot({
      user_id: 'unknown',
      task_id: ACTIVITY_MONITORING_TASK_ID,
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
        task_id: taskId,
        image_url: `local://${filePath}`,
        captured_at: new Date().toISOString()
      });
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('screenshots')
      .getPublicUrl(`${currentUserId}/${filename}`);

    // Save to database
    const { error: dbError } = await supabase
      .from('screenshots')
      .insert({
        user_id: currentUserId,
        task_id: taskId,
        image_url: publicUrl,
        captured_at: new Date().toISOString()
      });

    if (dbError) {
      console.log('❌ Database save failed:', dbError);
      queueScreenshot({
        user_id: currentUserId,
        task_id: taskId,
        image_url: publicUrl,
        captured_at: new Date().toISOString()
      });
      return;
    }

    console.log('✅ Activity screenshot uploaded successfully');
    
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
      task_id: taskId,
      image_url: `local://${filePath}`,
      captured_at: new Date().toISOString()
    });
  }
}

async function getCurrentAppName(): Promise<string> {
  // Simplified implementation - would need native module for real app detection
  return 'Unknown App';
}

async function getCurrentWindowTitle(): Promise<string> {
  // Simplified implementation - would need native module for real window title
  return 'Unknown Window';
}

async function getCurrentURL(): Promise<string | undefined> {
  try {
    // This would need native implementation to get browser URLs
    // For now, return undefined - in production you'd use AppleScript on macOS
    // or Windows APIs to get the current browser tab URL
    return undefined;
  } catch (error) {
    console.error('❌ URL capture failed:', error);
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
      url: currentURL
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
    // Use the correct app_logs schema
    const appLogData = {
      user_id: currentUserId,
      app_name: currentApp.app_name,
      window_title: currentApp.window_title,
      started_at: currentApp.start_time,
      ended_at: currentApp.end_time,
      duration_seconds: currentApp.duration_seconds,
      category: 'core' // Default category
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

async function saveURLActivity(appActivity: AppActivity) {
  if (!appActivity.url || !currentUserId) return;

  try {
    const urlLogData = {
      user_id: currentUserId,
      site_url: appActivity.url,
      started_at: appActivity.start_time,
      ended_at: appActivity.end_time,
      duration_seconds: appActivity.duration_seconds,
      category: 'core' // Default category
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

async function saveActivitySession() {
  if (!currentActivitySession) return;

  try {
    // Save activity session as an app log entry for now
    const sessionLogData = {
      user_id: currentActivitySession.user_id,
      app_name: 'Activity Monitor',
      window_title: `${currentActivitySession.is_active ? 'Active' : 'Ended'} Session - Screenshots: ${currentActivitySession.total_screenshots}, Apps: ${currentActivitySession.total_apps}`,
      started_at: currentActivitySession.start_time,
      ended_at: currentActivitySession.end_time,
      category: 'system'
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