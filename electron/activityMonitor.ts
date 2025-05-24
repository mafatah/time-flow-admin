import { app, desktopCapturer, screen } from 'electron';
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
}

let activityInterval: ReturnType<typeof setInterval> | undefined;
let appTrackingInterval: ReturnType<typeof setInterval> | undefined;
let isMonitoring = false;
let currentUserId: string | null = null;
let currentActivitySession: ActivitySession | null = null;
let lastActivityTime = Date.now();
let currentApp: AppActivity | null = null;

// Always-on activity monitoring - starts when app launches
export function startActivityMonitoring(userId: string) {
  if (isMonitoring) {
    console.log('🔄 Activity monitoring already running');
    return;
  }

  console.log('🚀 Starting always-on activity monitoring for user:', userId);
  currentUserId = userId;
  isMonitoring = true;
  lastActivityTime = Date.now();

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

  // Start screenshot capture every X seconds
  activityInterval = setInterval(async () => {
    if (currentUserId && isUserActive()) {
      await captureActivityScreenshot();
      updateLastActivity();
    }
  }, screenshotIntervalSeconds * 1000);

  // Start app activity tracking every 5 seconds
  appTrackingInterval = setInterval(async () => {
    if (currentUserId && isUserActive()) {
      await trackCurrentApp();
      updateLastActivity();
    }
  }, 5000);

  console.log(`✅ Activity monitoring started - Screenshots every ${screenshotIntervalSeconds}s, App tracking every 5s`);
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
  const idleTimeMs = idleTimeoutMinutes * 60 * 1000;
  return (Date.now() - lastActivityTime) < idleTimeMs;
}

function updateLastActivity() {
  lastActivityTime = Date.now();
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

    const buffer = sources[0].thumbnail.toPNG();
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
      console.log('⚠️ Could not delete local file:', err.message);
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

async function trackCurrentApp() {
  if (!currentUserId || !currentActivitySession) return;

  try {
    // Get current active application (simplified for now)
    // This would need native implementation for macOS
    const appName = await getCurrentAppName();
    const windowTitle = await getCurrentWindowTitle();

    if (currentApp && currentApp.app_name === appName && currentApp.window_title === windowTitle) {
      // Still in same app/window, continue tracking
      return;
    }

    // End previous app activity
    if (currentApp) {
      currentApp.end_time = new Date().toISOString();
      currentApp.duration_seconds = Math.floor((Date.now() - new Date(currentApp.start_time).getTime()) / 1000);
      await saveAppActivity();
    }

    // Start new app activity
    currentApp = {
      app_name: appName,
      window_title: windowTitle,
      start_time: new Date().toISOString(),
      duration_seconds: 0
    };

    currentActivitySession.total_apps++;
    saveActivitySession();

    console.log('📱 App activity:', appName, '-', windowTitle);

  } catch (error) {
    console.error('❌ App tracking failed:', error);
    logError('trackCurrentApp', error);
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

async function saveAppActivity() {
  if (!currentApp || !currentUserId || !currentActivitySession) return;

  try {
    // Format app activity as a message for the existing app_logs table
    const message = `App: ${currentApp.app_name} | Window: ${currentApp.window_title} | Duration: ${currentApp.duration_seconds}s`;
    
    const appLogData = {
      user_id: currentUserId,
      message: message
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

async function saveActivitySession() {
  if (!currentActivitySession) return;

  try {
    // Save activity session as an app log entry for now
    const sessionMessage = `Activity Session: ${currentActivitySession.is_active ? 'Active' : 'Ended'} | Screenshots: ${currentActivitySession.total_screenshots} | Apps: ${currentActivitySession.total_apps}`;
    
    const sessionLogData = {
      user_id: currentActivitySession.user_id,
      message: sessionMessage
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