import 'dotenv/config';
import { app, BrowserWindow, ipcMain, powerMonitor, screen, nativeImage, shell, Menu, Tray, Notification, dialog } from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { setUserId, startTracking, stopTracking, syncOfflineData, loadSession, clearSavedSession } from './tracker';
import { setupAutoLaunch } from './autoLaunch';
import { initSystemMonitor } from './systemMonitor';
import { startSyncLoop } from './unsyncedManager';
import { startActivityMonitoring, stopActivityMonitoring, triggerActivityCapture, triggerDirectScreenshot } from './activityMonitor';
import { ensureScreenRecordingPermission, testScreenCapture } from './permissionManager';
import { screenshotIntervalSeconds } from './config';
import { EventEmitter } from 'events';

// Create event emitter for internal communication
export const appEvents = new EventEmitter();

// Debug environment variables
console.log('🔧 Environment variables at startup:');
console.log('   SCREENSHOT_INTERVAL_SECONDS:', process.env.SCREENSHOT_INTERVAL_SECONDS);
console.log('   Config screenshotIntervalSeconds:', screenshotIntervalSeconds);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isTracking = false;
let trackingStartTime: Date | null = null;
let timerInterval: NodeJS.Timeout | null = null;

// Check if running from DMG and prevent crashes
function checkDMGAndPreventCrash(): boolean {
  const appPath = app.getAppPath();
  console.log('🔍 App path:', appPath);
  
  // Check if running from /Volumes (DMG mount point)
  if (appPath.includes('/Volumes/')) {
    console.log('⚠️ WARNING: App is running from DMG volume!');
    
    // Show critical warning dialog
    dialog.showErrorBox(
      'Installation Required - Ebdaa Work Time',
      'This application is running from the disk image (DMG) and will crash if the DMG is ejected.\n\n' +
      'To fix this:\n' +
      '1. Drag "Ebdaa Work Time.app" to your Applications folder\n' +
      '2. Eject the DMG\n' +
      '3. Launch the app from Applications folder\n\n' +
      'The app will now close to prevent crashes.'
    );
    
    // Log the issue
    console.log('🛑 Preventing app startup from DMG to avoid memory crashes');
    console.log('   App path:', appPath);
    console.log('   Expected path should be: /Applications/Ebdaa Work Time.app');
    
    return false; // Indicate app should not continue
  }
  
  // Also check for other temporary mount points
  const tempPaths = ['/var/folders/', '/tmp/', '/private/tmp/'];
  const isTemporary = tempPaths.some(tempPath => appPath.includes(tempPath));
  
  if (isTemporary) {
    console.log('⚠️ WARNING: App is running from temporary location!');
    
    dialog.showErrorBox(
      'Improper Installation - Ebdaa Work Time',
      'This application is running from a temporary location and may not function properly.\n\n' +
      'Please install the app to your Applications folder:\n' +
      '1. Move "Ebdaa Work Time.app" to /Applications/\n' +
      '2. Launch from Applications folder\n\n' +
      'The app will now close.'
    );
    
    return false;
  }
  
  console.log('✅ App is running from proper installation location');
  return true;
}

// Listen for screenshot events from activity monitor
appEvents.on('screenshot-captured', () => {
  showScreenshotNotification();
});

// Listen for auto-stop events from activity monitor
appEvents.on('auto-stop-tracking', (data) => {
  console.log('🛑 Auto-stop tracking triggered:', data);
  
  // Stop the tracking timer
  stopTrackingTimer();
  
  // Stop time tracking in the tracker module
  stopTracking();
  
  // Show notification with reason
  try {
    let message = 'Tracking stopped automatically';
    if (data.reason === 'screenshot_failures') {
      message = `Tracking stopped due to screenshot failures (${data.failures} consecutive failures). This usually means your laptop is closed or the system is sleeping.`;
    } else if (data.reason === 'system_unavailable') {
      const minutes = Math.round(data.unavailableTime / 60000);
      message = `Tracking stopped due to system inactivity (${minutes} minutes without successful monitoring).`;
    }
    
    new Notification({
      title: 'Ebdaa Work Time - Auto-Stop',
      body: message
    }).show();
    
    console.log(`📢 Auto-stop notification shown: ${message}`);
  } catch (e) {
    console.log('⚠️ Could not show auto-stop notification:', e);
  }
  
  // Update tray menu to reflect stopped state
  updateTrayMenu();
});

async function createWindow() {
  // Create the employee desktop app window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show the window for employee interaction
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hiddenInset', // Modern macOS look
    vibrancy: 'under-window' // macOS transparency effect
  });

  // Load the employee desktop app interface
  const desktopAgentPath = path.join(__dirname, '../desktop-agent/renderer/index.html');
  
  if (fs.existsSync(desktopAgentPath)) {
    console.log('📱 Loading employee desktop app from:', desktopAgentPath);
    mainWindow.loadFile(desktopAgentPath);
  } else {
    // Fallback: try different possible paths
    const possiblePaths = [
      path.join(__dirname, '../../desktop-agent/renderer/index.html'),
      path.join(process.cwd(), 'desktop-agent/renderer/index.html'),
      path.join(app.getAppPath(), 'desktop-agent/renderer/index.html')
    ];
    
    let foundPath = '';
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        break;
      }
    }
    
    if (foundPath) {
      console.log('📱 Loading employee desktop app from fallback path:', foundPath);
      mainWindow.loadFile(foundPath);
    } else {
      console.log('⚠️ Desktop agent UI not found, loading web interface instead');
      // Load the web interface as fallback
      if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
      } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
      }
    }
  }

  // Show DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  // CRITICAL: Check if running from DMG and prevent crashes
  if (!checkDMGAndPreventCrash()) {
    console.log('🛑 App startup prevented due to DMG location - quitting safely');
    app.quit();
    return;
  }
  
  await createWindow();
  
  // Create system tray
  createTray();
  
  // Request screen recording permission on startup
  console.log('🚀 App ready, checking permissions...');
  const hasPermission = await ensureScreenRecordingPermission();
  
  if (hasPermission) {
    // Test screen capture capability
    await testScreenCapture();
    console.log('✅ App ready with screen recording permission');
  } else {
    console.log('⚠️  App ready but screen recording permission missing');
  }
  
  // Don't auto-load any config or start any tracking
  // Let employees start fresh each time and manually control everything
  console.log('📋 App ready - waiting for employee to login and start tracking manually');
  
  setupAutoLaunch().catch(err => console.error(err));
  initSystemMonitor();
  startSyncLoop();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the background (tray mode)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent app from quitting when all windows are closed (keep in tray)
app.on('before-quit', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});

// Handle user login from desktop-agent UI - FIX: Use handle instead of on for invoke calls
ipcMain.handle('user-logged-in', (event, user) => {
  console.log('👤 User logged in from UI:', user.email);
  setUserId(user.id);
  console.log('Set user ID:', user.id);
  console.log('✅ User ID set, ready for manual tracking start');
  return { success: true, message: 'User logged in successfully' };
});

// Handle user logout from desktop-agent UI
ipcMain.handle('user-logged-out', () => {
  console.log('🚪 User logout requested from UI');
  // Clear session and stop tracking
  clearSavedSession();
  stopTrackingTimer();
  stopActivityMonitoring();
  console.log('✅ User logged out - session cleared and tracking stopped');
  return { success: true, message: 'User logged out successfully' };
});

// Handle tracking start with better response
ipcMain.handle('start-tracking', (event, userId) => {
  try {
    console.log('▶️ Manual tracking start requested for user:', userId);
    if (userId) {
      setUserId(userId);
    }
    startTracking();
    startTrackingTimer();
    startActivityMonitoring(userId);
    isTracking = true;
    updateTrayMenu();
    console.log('✅ Tracking started successfully');
    return { success: true, message: 'Time tracking started!' };
  } catch (error) {
    console.error('❌ Error starting tracking:', error);
    return { success: false, message: 'Failed to start tracking' };
  }
});

// Handle tracking pause
ipcMain.handle('pause-tracking', () => {
  try {
    console.log('⏸️ Manual tracking pause requested');
    stopActivityMonitoring();
    isTracking = false;
    updateTrayMenu();
    console.log('✅ Tracking paused successfully');
    return { success: true, message: 'Time tracking paused' };
  } catch (error) {
    console.error('❌ Error pausing tracking:', error);
    return { success: false, message: 'Failed to pause tracking' };
  }
});

// Handle tracking stop with better response
ipcMain.handle('stop-tracking', () => {
  try {
    console.log('⏹️ Manual tracking stop requested');
    stopTracking();
    stopTrackingTimer();
    stopActivityMonitoring();
    isTracking = false;
    updateTrayMenu();
    console.log('✅ Tracking stopped successfully');
    return { success: true, message: 'Time tracking stopped' };
  } catch (error) {
    console.error('❌ Error stopping tracking:', error);
    return { success: false, message: 'Failed to stop tracking' };
  }
});

// Handle screenshot force capture with response
ipcMain.handle('force-screenshot', async () => {
  try {
    console.log('📸 Manual screenshot requested');
    const result = await triggerDirectScreenshot();
    showScreenshotNotification();
    return { success: true, message: 'Screenshot captured successfully' };
  } catch (error) {
    console.error('❌ Error capturing screenshot:', error);
    return { success: false, message: 'Failed to capture screenshot' };
  }
});

// Handle activity monitoring start from desktop-agent UI
ipcMain.on('start-activity-monitoring', (event, userId) => {
  console.log('🚀 Starting activity monitoring for user:', userId);
  setUserId(userId);
  startActivityMonitoring(userId);
  startTrackingTimer();
  console.log('✅ Activity monitoring started from UI');
});

// Keep existing deprecated handlers for backward compatibility
ipcMain.on('set-user-id', (_e, id) => {
  setUserId(id);
  console.log('✅ User ID set:', id, '- Waiting for manual tracking start');
});

ipcMain.on('start-tracking', () => {
  console.log('▶️ Manual tracking start requested (legacy)');
  startTracking();
  startTrackingTimer();
});

ipcMain.on('stop-tracking', () => {
  console.log('⏸️ Manual tracking stop requested (legacy)');
  stopTracking();
  stopTrackingTimer();
});

ipcMain.on('logout', () => {
  console.log('🚪 Logout requested from UI (legacy)');
  clearSavedSession();
  stopTrackingTimer();
  stopActivityMonitoring();
  if (mainWindow) {
    mainWindow.reload();
  }
  console.log('🚪 User logged out - session cleared and tracking stopped');
});

// Add back the missing sync handlers
ipcMain.on('sync-offline-data', () => void syncOfflineData());
ipcMain.handle('load-session', () => loadSession());
ipcMain.on('clear-session', () => clearSavedSession());

// Add missing get-config handler if not already present
ipcMain.handle('get-config', () => {
  return {
    supabase_url: process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co',
    supabase_key: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4',
    user_id: process.env.USER_ID || '',
    project_id: process.env.PROJECT_ID || '00000000-0000-0000-0000-000000000001',
    screenshot_interval_seconds: screenshotIntervalSeconds,
    idle_threshold_seconds: Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
    enable_screenshots: true,
    enable_idle_detection: true,
    enable_activity_tracking: true,
    enable_anti_cheat: process.env.ANTI_CHEAT_ENABLED !== 'false'
  };
});

// Add missing fetch-screenshots handler if not already present
ipcMain.handle('fetch-screenshots', async (event, params) => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { user_id, date, limit = 20, offset = 0 } = params;
    
    // Create date range for the selected date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    console.log(`📸 Fetching screenshots for user ${user_id} on ${date}`);
    
    const { data: screenshots, error } = await supabase
      .from('screenshots')
      .select('*')
      .eq('user_id', user_id)
      .gte('captured_at', startDate.toISOString())
      .lt('captured_at', endDate.toISOString())
      .order('captured_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('❌ Error fetching screenshots:', error);
      throw error;
    }
    
    console.log(`✅ Fetched ${screenshots?.length || 0} screenshots`);
    return screenshots || [];
    
  } catch (error) {
    console.error('❌ Failed to fetch screenshots:', error);
    return [];
  }
});

ipcMain.on('trigger-activity-capture', () => {
  triggerActivityCapture();
  showScreenshotNotification();
});

ipcMain.handle('trigger-direct-screenshot', async () => {
  const result = await triggerDirectScreenshot();
  showScreenshotNotification();
  return result;
});

// Add screenshot testing handlers
ipcMain.handle('test-screenshot', async () => {
  console.log('🧪 Manual screenshot test requested');
  try {
    // Import the activity monitor function
    const { triggerDirectScreenshot } = await import('./activityMonitor');
    const result = await triggerDirectScreenshot();
    console.log('✅ Screenshot test completed:', result);
    return { success: result, message: 'Screenshot test completed' };
  } catch (error) {
    console.error('❌ Screenshot test failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('manual-screenshot', async () => {
  console.log('📸 Manual screenshot capture requested');
  try {
    // Import the activity monitor function
    const { triggerActivityCapture } = await import('./activityMonitor');
    triggerActivityCapture();
    console.log('✅ Manual screenshot triggered');
    return { success: true, message: 'Manual screenshot triggered' };
  } catch (error) {
    console.error('❌ Manual screenshot failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Create tray icon
function createTray() {
  // Use the assets from the electron directory
  const iconPath = process.platform === 'darwin' 
    ? path.join(__dirname, '../assets/tray-icon.png')  // macOS uses regular PNG
    : path.join(__dirname, '../assets/tray-icon.png');
  
  console.log('🔍 Loading tray icon from:', iconPath);
  
  // Create fallback icon if file doesn't exist
  if (!fs.existsSync(iconPath)) {
    console.log('⚠️ Tray icon not found, creating fallback');
    // Create a simple 16x16 icon programmatically
    const icon = nativeImage.createFromBuffer(
      Buffer.from(createSimpleIcon(), 'base64')
    );
    tray = new Tray(icon);
  } else {
    console.log('✅ Loading tray icon from file');
    const icon = nativeImage.createFromPath(iconPath);
    // Resize for tray (16x16 on macOS, 16x16 on Windows)
    const resizedIcon = icon.resize({ width: 16, height: 16 });
    tray = new Tray(resizedIcon);
  }

  // Set initial tooltip
  tray.setToolTip('Ebdaa Time - Not tracking');
  
  // Create context menu
  updateTrayMenu();
  
  // Handle click events
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return tray;
}

// Create a simple icon as base64 (16x16 green circle)
function createSimpleIcon(): string {
  // This is a simple 16x16 PNG icon encoded as base64
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
}

// Update tray menu
function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: isTracking ? '⏸ Stop Tracking' : '▶️ Start Tracking', 
      click: () => {
        if (isTracking) {
          stopTrackingTimer();
        } else {
          startTrackingTimer();
        }
      }
    },
    { type: 'separator' },
    { 
      label: '📊 Open Dashboard', 
      click: () => {
        // Open web dashboard in default browser instead of showing window
        shell.openExternal('https://time-flow-admin.vercel.app');
      }
    },
    { 
      label: '📸 Take Screenshot', 
      click: () => {
        triggerActivityCapture();
        showScreenshotNotification();
      }
    },
    { type: 'separator' },
    { 
      label: '🚪 Logout', 
      click: () => {
        // Clear session and stop tracking
        clearSavedSession();
        stopTrackingTimer();
        stopActivityMonitoring();
        console.log('🚪 User logged out - session cleared');
      }
    },
    { type: 'separator' },
    { label: '❌ Quit', click: () => app.quit() }
  ]);
  
  if (tray) {
    tray.setContextMenu(contextMenu);
  }
}

// Start tracking timer
function startTrackingTimer() {
  isTracking = true;
  trackingStartTime = new Date();
  
  // Update tray every second
  timerInterval = setInterval(updateTrayTimer, 1000);
  
  // Update menu
  updateTrayMenu();
  
  // Update tooltip immediately
  updateTrayTimer();
  
  console.log('⏰ Tracking timer started');
}

// Stop tracking timer
function stopTrackingTimer() {
  isTracking = false;
  trackingStartTime = null;
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Update tray
  if (tray) {
    tray.setToolTip('Ebdaa Time - Not tracking');
  }
  
  // Update menu
  updateTrayMenu();
  
  console.log('⏰ Tracking timer stopped');
}

// Update tray timer display
function updateTrayTimer() {
  if (!isTracking || !trackingStartTime || !tray) return;
  
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - trackingStartTime.getTime()) / 1000);
  
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  const timeString = hours > 0 
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  tray.setToolTip(`Ebdaa Time - Tracking: ${timeString}`);
}

// Show screenshot notification
function showScreenshotNotification() {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '📸 Screenshot Captured',
      body: 'Activity screenshot has been taken and uploaded',
      icon: path.join(__dirname, '../assets/icon.png'),
      silent: false,
    });
    
    notification.show();
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      notification.close();
    }, 3000);
    
    console.log('📸 Screenshot notification shown');
  }
}
