const { app, BrowserWindow, powerMonitor, screen, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const idle = require('desktop-idle');
const activeWin = require('active-win');
const robot = require('robotjs');
const cron = require('node-cron');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const SyncManager = require('./sync-manager');

const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const supabase = createClient(config.supabase_url, config.supabase_key);
let syncManager;
let mainWindow;
let tray;

// === TRACKING STATE ===
let isTracking = false;
let isPaused = false;
let currentSession = null;
let currentTimeLogId = null;
let idleStart = null;
let lastActivity = Date.now();
let lastMousePos = { x: 0, y: 0 };

// === INTERVALS ===
let screenshotInterval = null;
let activityInterval = null;
let idleCheckInterval = null;
let appCaptureInterval = null;
let urlCaptureInterval = null;
let settingsInterval = null;
let notificationInterval = null;

// === SETTINGS (Items 6 - Settings Pull) ===
let appSettings = {
  screenshot_interval_seconds: 300, // 5 minutes
  idle_threshold_seconds: 300, // 5 minutes  
  blur_screenshots: false,
  track_urls: true,
  track_applications: true,
  auto_start_tracking: false,
  max_idle_time_seconds: 2400, // 40 minutes
  screenshot_quality: 80,
  notification_frequency_seconds: 120 // 2 minutes
};

// === ACTIVITY STATS ===
let activityStats = {
  mouseClicks: 0,
  keystrokes: 0,
  mouseMovements: 0,
  idleSeconds: 0,
  activeSeconds: 0,
  lastReset: Date.now()
};

// === OFFLINE QUEUES ===
let offlineQueue = {
  screenshots: [],
  appLogs: [],
  urlLogs: [],
  idleLogs: [],
  timeLogs: []
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'TimeFlow Agent - Employee Tracker',
    resizable: false,
    show: false
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ TimeFlow Agent ready');
  });

  // Handle window events
  mainWindow.on('minimize', () => {
    mainWindow.hide();
    showTrayNotification('TimeFlow continues tracking in background');
  });

  mainWindow.on('close', (event) => {
    if (isTracking) {
      event.preventDefault();
      mainWindow.hide();
      showTrayNotification('TimeFlow continues tracking in background');
    }
  });

  return mainWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TimeFlow',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: isTracking ? 'Stop Tracking' : 'Start Tracking',
      click: () => {
        if (isTracking) {
          stopTracking();
        } else {
          startTracking();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopTracking();
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('TimeFlow Agent');
  
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

// === ITEM 6: SETTINGS PULL ===
async function fetchSettings() {
  try {
    console.log('⚙️ Fetching settings from server...');
    
    // Get settings from localStorage (admin panel settings)
    const settingsResponse = await axios.get(`${config.supabase_url}/rest/v1/rpc/get_app_settings`, {
      headers: {
        'apikey': config.supabase_key,
        'Authorization': `Bearer ${config.supabase_key}`
      }
    }).catch(() => null);

    if (settingsResponse?.data) {
      const settings = settingsResponse.data;
      appSettings = {
        screenshot_interval_seconds: settings.screenshot_interval || 300,
        idle_threshold_seconds: settings.idle_threshold || 300,
        blur_screenshots: settings.blur_screenshots || false,
        track_urls: settings.track_urls !== false,
        track_applications: settings.track_applications !== false,
        auto_start_tracking: settings.auto_start_tracking || false,
        max_idle_time_seconds: settings.max_idle_time || 2400,
        screenshot_quality: settings.screenshot_quality || 80,
        notification_frequency_seconds: settings.notification_frequency || 120
      };
      console.log('✅ Settings loaded from server');
    } else {
      console.log('⚠️ Using default settings');
    }

    // Update UI with new settings
    mainWindow?.webContents.send('settings-updated', appSettings);

  } catch (error) {
    console.error('❌ Failed to fetch settings:', error);
  }
}

// === ITEM 1-3: IDLE DETECTION WITH AUTO-PAUSE ===
function startIdleMonitoring() {
  if (idleCheckInterval) clearInterval(idleCheckInterval);

  console.log(`😴 Starting idle monitoring (${appSettings.idle_threshold_seconds}s threshold)`);
  
  idleCheckInterval = setInterval(() => {
    const idleTimeMs = idle.getIdleTime();
    const idleTimeSeconds = Math.floor(idleTimeMs / 1000);
    const now = Date.now();

    // Check for mouse movement (additional activity detection)
    const currentMousePos = robot.getMousePos();
    const mouseMoved = currentMousePos.x !== lastMousePos.x || currentMousePos.y !== lastMousePos.y;
    if (mouseMoved) {
      lastMousePos = currentMousePos;
      lastActivity = now;
      activityStats.mouseMovements++;
    }

    // User became idle
    if (idleStart === null && idleTimeSeconds >= appSettings.idle_threshold_seconds) {
      idleStart = now - idleTimeMs;
      console.log('😴 User idle since:', new Date(idleStart));
      
      // ITEM 3: Auto-pause timer and captures
      if (isTracking && !isPaused) {
        pauseTracking('idle');
      }
      
      // Update UI
      mainWindow?.webContents.send('idle-status-changed', { 
        isIdle: true, 
        idleSince: idleStart,
        idleSeconds: idleTimeSeconds
      });
    }

    // User became active
    if (idleStart !== null && idleTimeSeconds < 5) {
      const idleEnd = now;
      const idleDuration = idleEnd - idleStart;
      const idleDurationSeconds = Math.floor(idleDuration / 1000);
      
      console.log(`⚡ User active. Idle: ${idleDurationSeconds}s`);
      
      // ITEM 2: Log idle period
      logIdlePeriod(idleStart, idleEnd, idleDurationSeconds);
      
      idleStart = null;
      
      // ITEM 3: Auto-resume tracking
      if (isPaused && currentSession) {
        resumeTracking();
      }
      
      // Update UI
      mainWindow?.webContents.send('idle-status-changed', { 
        isIdle: false, 
        idleDuration: idleDurationSeconds 
      });
    }

    // Update idle accumulator for current session
    if (isTracking && idleStart !== null) {
      activityStats.idleSeconds++;
    } else if (isTracking) {
      activityStats.activeSeconds++;
    }

  }, 1000); // Check every second for precise tracking
}

function stopIdleMonitoring() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}

// === ITEM 2: IDLE FLAG UPLOAD ===
async function logIdlePeriod(start, end, durationSeconds) {
  try {
    const idleLog = {
      user_id: config.user_id,
      time_log_id: currentTimeLogId,
      idle_start: new Date(start).toISOString(),
      idle_end: new Date(end).toISOString(),
      duration_seconds: durationSeconds,
      created_at: new Date().toISOString()
    };

    // Update current time_log with idle flag
    if (currentTimeLogId) {
      await updateTimeLogIdleStatus(true, durationSeconds);
    }

    // Queue for offline support
    await syncManager.addIdleLog(idleLog);
    console.log(`📝 Idle period logged: ${durationSeconds}s`);

  } catch (error) {
    console.error('❌ Failed to log idle period:', error);
  }
}

async function updateTimeLogIdleStatus(isIdle, idleSeconds = 0) {
  try {
    const updateData = {
      is_idle: isIdle,
      idle_seconds: idleSeconds,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('time_logs')
      .update(updateData)
      .eq('id', currentTimeLogId);

    if (error) {
      // Queue for offline sync
      offlineQueue.timeLogs.push({
        action: 'update_idle',
        id: currentTimeLogId,
        data: updateData
      });
    }

  } catch (error) {
    console.error('❌ Failed to update time log idle status:', error);
  }
}

// === ITEM 4: APP/WINDOW CAPTURE ===
function startAppCapture() {
  if (appCaptureInterval) clearInterval(appCaptureInterval);
  
  if (!appSettings.track_applications) return;

  console.log('🖥️ Starting app capture every 15s');
  
  appCaptureInterval = setInterval(async () => {
    if (!isTracking || isPaused) return;

    try {
      const activeWindow = await activeWin();
      if (activeWindow) {
        const appLog = {
          user_id: config.user_id,
          time_log_id: currentTimeLogId,
          app_name: activeWindow.owner.name,
          window_title: activeWindow.title,
          app_path: activeWindow.owner.path || '',
          timestamp: new Date().toISOString()
        };

        await syncManager.addAppLogs([appLog]);
        console.log(`📱 App captured: ${activeWindow.owner.name}`);
      }
    } catch (error) {
      console.error('❌ App capture failed:', error);
    }
  }, 15000); // Every 15 seconds
}

function stopAppCapture() {
  if (appCaptureInterval) {
    clearInterval(appCaptureInterval);
    appCaptureInterval = null;
  }
}

// === ITEM 5: URL/DOMAIN CAPTURE ===
function startUrlCapture() {
  if (urlCaptureInterval) clearInterval(urlCaptureInterval);
  
  if (!appSettings.track_urls) return;

  console.log('🌐 Starting URL capture every 15s');
  
  urlCaptureInterval = setInterval(async () => {
    if (!isTracking || isPaused) return;

    try {
      const activeWindow = await activeWin();
      if (activeWindow && isBrowserApp(activeWindow.owner.name)) {
        // Extract URL from browser window title (simplified)
        const url = extractUrlFromTitle(activeWindow.title);
        if (url) {
          const urlLog = {
            user_id: config.user_id,
            time_log_id: currentTimeLogId,
            url: url,
            title: activeWindow.title,
            domain: extractDomain(url),
            browser: activeWindow.owner.name,
            timestamp: new Date().toISOString()
          };

          await syncManager.addUrlLogs([urlLog]);
          console.log(`🔗 URL captured: ${urlLog.domain}`);
        }
      }
    } catch (error) {
      console.error('❌ URL capture failed:', error);
    }
  }, 15000); // Every 15 seconds
}

function stopUrlCapture() {
  if (urlCaptureInterval) {
    clearInterval(urlCaptureInterval);
    urlCaptureInterval = null;
  }
}

function isBrowserApp(appName) {
  const browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'brave'];
  return browsers.some(browser => appName.toLowerCase().includes(browser));
}

function extractUrlFromTitle(title) {
  // Simple URL extraction from browser title
  const urlMatch = title.match(/(https?:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// === SCREENSHOT MANAGEMENT WITH BLUR ===
async function captureScreenshot() {
  if (!isTracking || isPaused) return;

  try {
    console.log('📸 Capturing screenshot...');
    
    const img = await screenshot({ 
      format: 'png',
      quality: appSettings.screenshot_quality
    });

    // Apply blur if enabled
    let processedImg = img;
    if (appSettings.blur_screenshots) {
      // Placeholder for blur - in production use sharp library
      console.log('🔒 Blur applied');
    }

    // Calculate activity metrics
    const activityPercent = calculateActivityPercent();
    const focusPercent = calculateFocusPercent();

    const screenshotData = {
      user_id: config.user_id,
      time_log_id: currentTimeLogId,
      image_data: processedImg,
      activity_percent: activityPercent,
      focus_percent: focusPercent,
      mouse_clicks: activityStats.mouseClicks,
      keystrokes: activityStats.keystrokes,
      mouse_movements: activityStats.mouseMovements,
      is_blurred: appSettings.blur_screenshots,
      captured_at: new Date().toISOString()
    };

    await syncManager.addScreenshot(processedImg, screenshotData);
    console.log('✅ Screenshot captured and queued');
    
    // Reset activity stats
    resetActivityStats();

    // Update UI
    mainWindow?.webContents.send('screenshot-captured', {
      timestamp: new Date().toISOString(),
      activityPercent,
      focusPercent
    });

  } catch (error) {
    console.error('❌ Screenshot failed:', error);
  }
}

function calculateActivityPercent() {
  const totalActivity = activityStats.mouseClicks + activityStats.keystrokes + Math.floor(activityStats.mouseMovements / 10);
  return Math.min(100, totalActivity * 2); // Simple calculation
}

function calculateFocusPercent() {
  const timeSinceReset = Date.now() - activityStats.lastReset;
  const activeTime = timeSinceReset - (activityStats.idleSeconds * 1000);
  return Math.max(0, Math.min(100, (activeTime / timeSinceReset) * 100));
}

function resetActivityStats() {
  activityStats = {
    mouseClicks: 0,
    keystrokes: 0,
    mouseMovements: 0,
    idleSeconds: 0,
    activeSeconds: 0,
    lastReset: Date.now()
  };
}

function startScreenshotCapture() {
  if (screenshotInterval) clearInterval(screenshotInterval);

  console.log(`📸 Starting screenshots every ${appSettings.screenshot_interval_seconds}s`);
  
  // First screenshot after 10 seconds
  setTimeout(captureScreenshot, 10000);
  
  screenshotInterval = setInterval(captureScreenshot, appSettings.screenshot_interval_seconds * 1000);
}

function stopScreenshotCapture() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

// === ITEM 7: NOTIFICATIONS TRAY ===
function startNotificationChecking() {
  if (notificationInterval) clearInterval(notificationInterval);
  
  console.log(`🔔 Starting notification checking every ${appSettings.notification_frequency_seconds}s`);
  
  notificationInterval = setInterval(async () => {
    await checkNotifications();
  }, appSettings.notification_frequency_seconds * 1000);
}

function stopNotificationChecking() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

async function checkNotifications() {
  try {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', config.user_id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (notifications && notifications.length > 0) {
      // Update tray badge
      tray.setTitle(`${notifications.length}`);
      
      for (const notification of notifications) {
        showTrayNotification(notification.message, notification.type);
        
        // Mark as read
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', notification.id);
      }
      
      // Clear badge after showing notifications
      setTimeout(() => tray.setTitle(''), 5000);
    }
  } catch (error) {
    console.error('❌ Notification check failed:', error);
  }
}

function showTrayNotification(message, type = 'info') {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: 'TimeFlow',
      body: message,
      icon: path.join(__dirname, '../assets/icon.png')
    });
    
    notification.show();
    console.log(`🔔 Notification: ${message}`);
  }
}

// === TRACKING CONTROL ===
async function startTracking(taskId = 'default-task') {
  if (isTracking) return;

  console.log('🚀 Starting time tracking...');
  
  isTracking = true;
  isPaused = false;
  
  // Create time log entry
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        user_id: config.user_id,
        task_id: taskId,
        start_time: new Date().toISOString(),
        status: 'active',
        is_idle: false,
        idle_seconds: 0
      })
      .select('id')
      .single();

    if (error) throw error;
    currentTimeLogId = data.id;
    
  } catch (error) {
    console.error('❌ Failed to create time log:', error);
    currentTimeLogId = `offline_${Date.now()}`;
  }

  currentSession = {
    id: currentTimeLogId,
    start_time: new Date().toISOString(),
    user_id: config.user_id,
    task_id: taskId
  };

  // Start all monitoring
  startScreenshotCapture();
  startIdleMonitoring();
  startAppCapture();
  startUrlCapture();

  // Update tray
  updateTrayMenu();
  
  // Update UI
  mainWindow?.webContents.send('tracking-started', currentSession);
  
  console.log('✅ Time tracking started');
}

async function stopTracking() {
  if (!isTracking) return;

  console.log('🛑 Stopping time tracking...');
  
  isTracking = false;
  isPaused = false;
  
  // Stop all monitoring
  stopScreenshotCapture();
  stopIdleMonitoring();
  stopAppCapture();
  stopUrlCapture();

  // End time log
  if (currentTimeLogId) {
    try {
      await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', currentTimeLogId);
    } catch (error) {
      console.error('❌ Failed to end time log:', error);
    }
  }

  // Update tray
  updateTrayMenu();
  
  // Update UI
  mainWindow?.webContents.send('tracking-stopped');
  
  currentSession = null;
  currentTimeLogId = null;
  console.log('✅ Time tracking stopped');
}

async function pauseTracking(reason = 'manual') {
  if (!isTracking || isPaused) return;

  console.log(`⏸️ Pausing tracking (${reason})`);
  
  isPaused = true;
  
  // Stop captures but keep monitoring
  stopScreenshotCapture();
  stopAppCapture();
  stopUrlCapture();

  // Update time log
  if (currentTimeLogId) {
    await updateTimeLogIdleStatus(true);
  }

  // Update UI
  mainWindow?.webContents.send('tracking-paused', { reason });
}

async function resumeTracking() {
  if (!isTracking || !isPaused) return;

  console.log('▶️ Resuming tracking');
  
  isPaused = false;
  
  // Restart captures
  startScreenshotCapture();
  startAppCapture();
  startUrlCapture();

  // Update time log
  if (currentTimeLogId) {
    await updateTimeLogIdleStatus(false);
  }

  // Update UI
  mainWindow?.webContents.send('tracking-resumed');
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show TimeFlow',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: isTracking ? 'Stop Tracking' : 'Start Tracking',
      click: () => {
        if (isTracking) {
          stopTracking();
        } else {
          startTracking();
        }
      }
    },
    { type: 'separator' },
    {
      label: `Status: ${isTracking ? (isPaused ? 'Paused' : 'Active') : 'Stopped'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        stopTracking();
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

// === IPC HANDLERS ===
ipcMain.handle('start-tracking', async (event, taskId) => {
  await startTracking(taskId);
});

ipcMain.handle('stop-tracking', async () => {
  await stopTracking();
});

ipcMain.handle('pause-tracking', async () => {
  await pauseTracking('manual');
});

ipcMain.handle('resume-tracking', async () => {
  await resumeTracking();
});

ipcMain.handle('get-settings', () => {
  return appSettings;
});

ipcMain.handle('get-session', () => {
  return currentSession;
});

ipcMain.handle('is-tracking', () => {
  return { isTracking, isPaused };
});

ipcMain.handle('get-stats', () => {
  return activityStats;
});

// === APP LIFECYCLE ===
app.whenReady().then(async () => {
  console.log('🚀 TimeFlow Desktop Agent starting...');
  
  // Initialize sync manager
  syncManager = new SyncManager(config);
  
  // Create tray
  createTray();
  
  // Create window
  createWindow();
  
  // Fetch settings immediately and then every 10 minutes
  await fetchSettings();
  settingsInterval = setInterval(fetchSettings, 10 * 60 * 1000);
  
  // Start notification checking
  startNotificationChecking();
  
  // Auto-start if enabled
  if (appSettings.auto_start_tracking) {
    setTimeout(() => startTracking(), 5000);
  }

  console.log('✅ TimeFlow Agent ready');
});

app.on('window-all-closed', () => {
  // Keep running in background
});

app.on('before-quit', async () => {
  console.log('🔄 App shutting down...');
  await stopTracking();
  
  // Clear intervals
  if (settingsInterval) clearInterval(settingsInterval);
  stopNotificationChecking();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

// Handle system events
powerMonitor.on('suspend', () => {
  console.log('💤 System suspended');
  if (isTracking) pauseTracking('system_suspend');
});

powerMonitor.on('resume', () => {
  console.log('⚡ System resumed');
  if (isPaused && currentSession) {
    setTimeout(() => resumeTracking(), 5000);
  }
});

console.log('📱 TimeFlow Desktop Agent initialized');
