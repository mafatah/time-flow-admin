import 'dotenv/config';
import { app, BrowserWindow, ipcMain, powerMonitor, screen, nativeImage, shell, Menu, Tray, Notification } from 'electron';
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
      title: 'TimeFlow - Auto-Stop',
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
  
  // Auto-load desktop-agent config if it exists (but don't auto-start tracking)
  try {
    // Try multiple possible paths for the config file
    const possiblePaths = [
      path.join(__dirname, '../desktop-agent/config.json'),
      path.join(__dirname, '../../desktop-agent/config.json'),
      path.join(process.cwd(), 'desktop-agent/config.json'),
      path.join(app.getAppPath(), 'desktop-agent/config.json')
    ];
    
    let configPath = '';
    let config: any = null;
    
    for (const testPath of possiblePaths) {
      console.log('🔍 Checking config path:', testPath);
      if (fs.existsSync(testPath)) {
        configPath = testPath;
        config = JSON.parse(fs.readFileSync(testPath, 'utf8'));
        console.log('📋 Found desktop-agent config at:', configPath);
        break;
      }
    }
    
    // Load config but don't auto-start tracking - let employee login and start manually
    if (config && config.user_id) {
      console.log('📋 Config found for user:', config.user_id);
      console.log('⏳ Waiting for employee to login and start tracking manually...');
      // Don't auto-start - employee should login first
    } else {
      console.log('⚠️  No desktop-agent config found - employee will need to login');
    }
  } catch (error) {
    console.log('⚠️  Could not load desktop-agent config:', error);
  }
  
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

ipcMain.on('set-user-id', (_e, id) => {
  setUserId(id);
  // Start always-on activity monitoring when user ID is set
  startActivityMonitoring(id);
  // Start tracking timer
  startTrackingTimer();
});

ipcMain.on('start-tracking', () => {
  startTracking();
  startTrackingTimer();
});

ipcMain.on('stop-tracking', () => {
  stopTracking();
  stopTrackingTimer();
});

ipcMain.on('sync-offline-data', () => void syncOfflineData());
ipcMain.handle('load-session', () => loadSession());
ipcMain.on('clear-session', () => clearSavedSession());

ipcMain.on('logout', () => {
  console.log('🚪 Logout requested from UI');
  // Clear session and stop tracking
  clearSavedSession();
  stopTrackingTimer();
  stopActivityMonitoring();
  // Reload the window to show login screen
  if (mainWindow) {
    mainWindow.reload();
  }
  console.log('🚪 User logged out - session cleared and tracking stopped');
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

// Handle user login from desktop-agent UI
ipcMain.on('user-logged-in', (event, user) => {
  console.log('👤 User logged in from UI:', user.email);
  setUserId(user.id);
  console.log('✅ User ID set, ready for manual tracking start');
});

// Handle activity monitoring start from desktop-agent UI
ipcMain.on('start-activity-monitoring', (event, userId) => {
  console.log('🚀 Starting activity monitoring for user:', userId);
  setUserId(userId);
  startActivityMonitoring(userId);
  console.log('✅ Activity monitoring started from UI');
});

// Add test mode for development
ipcMain.on('start-test-mode', () => {
  console.log('🧪 Starting test mode - simulating user login...');
  const testUserId = 'test-user-12345';
  setUserId(testUserId);
  startActivityMonitoring(testUserId);
  startTrackingTimer();
  console.log('✅ Test mode started - activity monitoring should begin');
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
  tray.setToolTip('TimeFlow - Not tracking');
  
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
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
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
    tray.setToolTip('TimeFlow - Not tracking');
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
  
  tray.setToolTip(`TimeFlow - Tracking: ${timeString}`);
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
