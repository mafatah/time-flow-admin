const { app, BrowserWindow, powerMonitor, screen, ipcMain, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const activeWin = require('active-win');
const cron = require('node-cron');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const SyncManager = require('./sync-manager');
const AntiCheatDetector = require('./anti-cheat-detector');

const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const supabase = createClient(config.supabase_url, config.supabase_key);
let syncManager;
let antiCheatDetector;
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
let systemSleepStart = null;

// Simplified mouse tracking without robotjs
let mouseTracker = {
  x: 0,
  y: 0,
  lastUpdate: Date.now()
};

// === INTERVALS ===
let screenshotInterval = null;
let activityInterval = null;
let idleCheckInterval = null;
let appCaptureInterval = null;
let urlCaptureInterval = null;
let settingsInterval = null;
let notificationInterval = null;
let mouseTrackingInterval = null;
let keyboardTrackingInterval = null;

// === SETTINGS (Items 6 - Settings Pull) ===
let appSettings = {
  screenshot_interval_seconds: 30, // 30 seconds for better monitoring
  idle_threshold_seconds: 60, // 1 minute for faster detection  
  blur_screenshots: false,
  track_urls: true,
  track_applications: true,
  auto_start_tracking: false,
  max_idle_time_seconds: 2400, // 40 minutes
  screenshot_quality: 80,
  notification_frequency_seconds: 120, // 2 minutes
  enable_anti_cheat: true,
  suspicious_activity_threshold: 10,
  pattern_detection_window_minutes: 15,
  minimum_mouse_distance: 50,
  keyboard_diversity_threshold: 5
};

// === ACTIVITY STATS ===
let activityStats = {
  mouseClicks: 0,
  keystrokes: 0,
  mouseMovements: 0,
  idleSeconds: 0,
  activeSeconds: 0,
  lastReset: Date.now(),
  suspiciousEvents: 0,
  riskScore: 0,
  screenshotsCaptured: 0
};

// === OFFLINE QUEUES ===
let offlineQueue = {
  screenshots: [],
  appLogs: [],
  urlLogs: [],
  idleLogs: [],
  timeLogs: [],
  fraudAlerts: []
};

// === SIMPLIFIED IDLE DETECTION ===
function getSystemIdleTime() {
  // Use Electron's built-in idle time detection
  try {
    return powerMonitor.getSystemIdleTime() * 1000; // Convert to milliseconds
  } catch (error) {
    console.log('⚠️ PowerMonitor idle time not available, using manual tracking');
    return Date.now() - lastActivity;
  }
}

function getCurrentMousePosition() {
  // Simplified mouse position tracking without robotjs
  try {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const point = screen.getCursorScreenPoint();
    return { x: point.x, y: point.y };
  } catch (error) {
    console.log('⚠️ Screen API not available for mouse tracking');
    return mouseTracker;
  }
}

function simulateKeyboardActivity() {
  // Simulate keyboard activity detection
  activityStats.keystrokes++;
  lastActivity = Date.now();
  
  if (antiCheatDetector) {
    antiCheatDetector.recordActivity('keyboard', {
      timestamp: Date.now(),
      key: 'simulated_activity',
      code: 'ActivityDetected'
    });
  }
}

function simulateMouseClick() {
  // Simulate mouse click detection
  activityStats.mouseClicks++;
  lastActivity = Date.now();
  
  if (antiCheatDetector) {
    antiCheatDetector.recordActivity('mouse_click', {
      x: mouseTracker.x,
      y: mouseTracker.y,
      timestamp: Date.now()
    });
  }
}

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
        screenshot_interval_seconds: settings.screenshot_interval || 30,
        idle_threshold_seconds: settings.idle_threshold || 60,
        blur_screenshots: settings.blur_screenshots || false,
        track_urls: settings.track_urls !== false,
        track_applications: settings.track_applications !== false,
        auto_start_tracking: settings.auto_start_tracking || false,
        max_idle_time_seconds: settings.max_idle_time || 2400,
        screenshot_quality: settings.screenshot_quality || 80,
        notification_frequency_seconds: settings.notification_frequency || 120,
        enable_anti_cheat: settings.enable_anti_cheat || true,
        suspicious_activity_threshold: settings.suspicious_activity_threshold || 10,
        pattern_detection_window_minutes: settings.pattern_detection_window_minutes || 15,
        minimum_mouse_distance: settings.minimum_mouse_distance || 50,
        keyboard_diversity_threshold: settings.keyboard_diversity_threshold || 5
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

// === ITEM 1-3: ENHANCED IDLE DETECTION WITH ANTI-CHEAT ===
function startIdleMonitoring() {
  if (idleCheckInterval) clearInterval(idleCheckInterval);

  console.log(`😴 Starting enhanced idle monitoring (${appSettings.idle_threshold_seconds}s threshold)`);
  
  // Initialize anti-cheat detector if enabled
  if (appSettings.enable_anti_cheat && !antiCheatDetector) {
    antiCheatDetector = new AntiCheatDetector(appSettings);
    antiCheatDetector.startMonitoring();
    console.log('🕵️  Anti-cheat detection enabled');
  }
  
  // Start enhanced mouse tracking
  startMouseTracking();
  
  // Start keyboard tracking
  startKeyboardTracking();
  
  idleCheckInterval = setInterval(() => {
    const idleTimeMs = getSystemIdleTime();
    const idleTimeSeconds = Math.floor(idleTimeMs / 1000);
    const now = Date.now();

    // Enhanced activity detection
    const currentMousePos = getCurrentMousePosition();
    const mouseMoved = currentMousePos.x !== lastMousePos.x || currentMousePos.y !== lastMousePos.y;
    
    if (mouseMoved) {
      const distance = Math.sqrt(
        Math.pow(currentMousePos.x - lastMousePos.x, 2) + 
        Math.pow(currentMousePos.y - lastMousePos.y, 2)
      );
      
      lastMousePos = currentMousePos;
      lastActivity = now;
      activityStats.mouseMovements++;
      
      // Record for anti-cheat analysis
      if (antiCheatDetector) {
        antiCheatDetector.recordActivity('mouse_move', {
          x: currentMousePos.x,
          y: currentMousePos.y,
          distance: distance
        });
      }
    }

    // Check for system-level activity
    const systemIdle = idleTimeSeconds >= appSettings.idle_threshold_seconds;
    const manualIdle = (now - lastActivity) >= (appSettings.idle_threshold_seconds * 1000);
    const actuallyIdle = systemIdle || manualIdle;

    // User became idle
    if (idleStart === null && actuallyIdle) {
      idleStart = now - idleTimeMs;
      console.log('😴 User idle detected:', {
        systemIdleSeconds: idleTimeSeconds,
        lastActivityAgo: Math.floor((now - lastActivity) / 1000),
        idleSince: new Date(idleStart)
      });
      
      // ITEM 3: Auto-pause timer and captures
      if (isTracking && !isPaused) {
        pauseTracking('idle_detected');
      }
      
      // Update UI with idle status
      mainWindow?.webContents.send('idle-status-changed', { 
        isIdle: true, 
        idleSince: idleStart,
        idleSeconds: idleTimeSeconds,
        reason: systemIdle ? 'system_idle' : 'manual_idle'
      });
      
      // Show notification
      showTrayNotification(`Idle detected - tracking paused (${idleTimeSeconds}s idle)`, 'warning');
    }

    // User became active (stricter detection)
    if (idleStart !== null && idleTimeSeconds < 5 && (now - lastActivity) < 5000) {
      const idleEnd = now;
      const idleDuration = idleEnd - idleStart;
      const idleDurationSeconds = Math.floor(idleDuration / 1000);
      
      console.log(`⚡ User activity resumed:`, {
        idleDurationSeconds: idleDurationSeconds,
        activityDetected: 'both_system_and_manual'
      });
      
      // ITEM 2: Log idle period
      logIdlePeriod(idleStart, idleEnd, idleDurationSeconds);
      
      idleStart = null;
      
      // ITEM 3: Auto-resume tracking with confirmation for long idle periods
      if (isPaused && currentSession) {
        if (idleDurationSeconds > 300) { // More than 5 minutes
          // Ask user if they want to resume
          mainWindow?.webContents.send('confirm-resume-after-idle', {
            idleDurationSeconds: idleDurationSeconds
          });
        } else {
          resumeTracking();
        }
      }
      
      // Update UI
      mainWindow?.webContents.send('idle-status-changed', { 
        isIdle: false, 
        idleDuration: idleDurationSeconds,
        resumed: true
      });
      
      // Show notification
      showTrayNotification(`Activity resumed after ${Math.floor(idleDurationSeconds/60)}m ${idleDurationSeconds%60}s`, 'success');
    }

    // Update idle accumulator for current session
    if (isTracking) {
      if (idleStart !== null) {
        activityStats.idleSeconds++;
      } else {
        activityStats.activeSeconds++;
      }
    }

    // Update anti-cheat risk score
    if (antiCheatDetector) {
      const detectionReport = antiCheatDetector.getDetectionReport();
      activityStats.suspiciousEvents = detectionReport.totalSuspiciousEvents;
      activityStats.riskScore = detectionReport.currentRiskLevel === 'HIGH' ? 0.8 :
                               detectionReport.currentRiskLevel === 'MEDIUM' ? 0.5 : 0.2;
    }

    // Send activity stats to UI
    mainWindow?.webContents.send('activity-stats-updated', activityStats);

  }, 1000); // Check every second for precise tracking
}

function startMouseTracking() {
  if (mouseTrackingInterval) clearInterval(mouseTrackingInterval);
  
  // Track mouse clicks more precisely
  mouseTrackingInterval = setInterval(() => {
    try {
      // This is a simplified approach - in production you'd use native mouse hooks
      const currentPos = getCurrentMousePosition();
      
      // Detect if mouse button is pressed (simplified detection)
      // In production, you'd use mouse event listeners
      if (currentPos.x !== lastMousePos.x || currentPos.y !== lastMousePos.y) {
        const timeSinceLastMove = Date.now() - lastActivity;
        
        // If mouse moved after being still, it might be a click
        if (timeSinceLastMove > 100) { // Debounce
          activityStats.mouseClicks++;
          
          if (antiCheatDetector) {
            antiCheatDetector.recordActivity('mouse_click', {
              x: currentPos.x,
              y: currentPos.y,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch (error) {
      // Ignore errors in mouse tracking
    }
  }, 500); // Check every 500ms
}

function startKeyboardTracking() {
  if (keyboardTrackingInterval) clearInterval(keyboardTrackingInterval);
  
  // This is a simplified approach - in production you'd use global keyboard hooks
  // For now, we'll simulate keyboard detection based on system idle time changes
  let lastIdleCheck = getSystemIdleTime();
  
  keyboardTrackingInterval = setInterval(() => {
    try {
      const currentIdle = getSystemIdleTime();
      
      // If idle time decreased significantly, keyboard/mouse activity occurred
      if (currentIdle < lastIdleCheck - 1000) { // 1 second tolerance
        activityStats.keystrokes++;
        lastActivity = Date.now();
        
        if (antiCheatDetector) {
          antiCheatDetector.recordActivity('keyboard', {
            timestamp: Date.now(),
            // In production, you'd capture actual key codes
            key: 'detected_activity',
            code: 'KeyDetected'
          });
        }
      }
      
      lastIdleCheck = currentIdle;
    } catch (error) {
      // Ignore errors in keyboard tracking
    }
  }, 1000); // Check every second
}

function stopIdleMonitoring() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
  
  if (mouseTrackingInterval) {
    clearInterval(mouseTrackingInterval);
    mouseTrackingInterval = null;
  }
  
  if (keyboardTrackingInterval) {
    clearInterval(keyboardTrackingInterval);
    keyboardTrackingInterval = null;
  }
  
  if (antiCheatDetector) {
    antiCheatDetector.stopMonitoring();
  }
  
  console.log('🛑 Enhanced idle monitoring stopped');
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

// === ENHANCED SCREENSHOT CAPTURE WITH ANTI-CHEAT ===
async function captureScreenshot() {
  if (!isTracking || isPaused) return;

  try {
    console.log('📸 Capturing screenshot...');
    
    // Record screenshot event for anti-cheat analysis
    if (antiCheatDetector) {
      antiCheatDetector.recordActivity('screenshot', {
        timestamp: Date.now(),
        isScheduled: true
      });
    }
    
    const screenshots = await screenshot.listDisplays();
    if (screenshots.length === 0) {
      console.log('❌ No displays available for screenshot');
      return;
    }

    // Capture from primary display
    const img = await screenshot({ format: 'png', quality: appSettings.screenshot_quality });
    
    // Calculate activity metrics
    const activityPercent = calculateActivityPercent();
    const focusPercent = calculateFocusPercent();
    
    // Enhanced activity detection - flag suspicious low activity
    let suspiciousActivity = false;
    if (activityPercent < 10 && focusPercent < 20) {
      suspiciousActivity = true;
      console.log('⚠️  Low activity detected during screenshot');
    }
    
    const screenshotData = {
      user_id: config.user_id,
      time_log_id: currentTimeLogId,
      timestamp: new Date().toISOString(),
      image_data: img.toString('base64'),
      activity_percent: activityPercent,
      focus_percent: focusPercent,
      mouse_clicks: activityStats.mouseClicks,
      keystrokes: activityStats.keystrokes,
      mouse_movements: activityStats.mouseMovements,
      is_blurred: appSettings.blur_screenshots,
      suspicious_activity: suspiciousActivity,
      risk_score: activityStats.riskScore
    };

    // Include anti-cheat data if available
    if (antiCheatDetector) {
      const detectionReport = antiCheatDetector.getDetectionReport();
      screenshotData.anti_cheat_report = {
        suspicious_events: detectionReport.totalSuspiciousEvents,
        risk_level: detectionReport.currentRiskLevel,
        recent_patterns: detectionReport.recentActivity.slice(-5) // Last 5 activities
      };
    }

    await syncManager.addScreenshot(screenshotData);
    activityStats.screenshotsCaptured = (activityStats.screenshotsCaptured || 0) + 1;
    
    console.log(`✅ Screenshot captured - Activity: ${activityPercent}%, Focus: ${focusPercent}%, Risk: ${activityStats.riskScore}`);

    // Send updated stats to UI
    mainWindow?.webContents.send('screenshot-captured', {
      activityPercent,
      focusPercent,
      timestamp: new Date().toISOString(),
      suspicious: suspiciousActivity,
      riskScore: activityStats.riskScore
    });

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    
    // Log screenshot failure
    if (antiCheatDetector) {
      antiCheatDetector.recordActivity('screenshot_failed', {
        timestamp: Date.now(),
        error: error.message
      });
    }
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
    lastReset: Date.now(),
    suspiciousEvents: 0,
    riskScore: 0,
    screenshotsCaptured: 0
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

// === ENHANCED IPC HANDLERS ===
ipcMain.handle('start-tracking', async (event, taskId = 'default-task') => {
  await startTracking(taskId);
  return { success: true, message: 'Enhanced tracking started with anti-cheat detection' };
});

ipcMain.handle('stop-tracking', async () => {
  await stopTracking();
  return { success: true, message: 'Tracking stopped' };
});

ipcMain.handle('pause-tracking', async () => {
  pauseTracking('manual');
  return { success: true, message: 'Tracking paused' };
});

ipcMain.handle('resume-tracking', async () => {
  await resumeTracking();
  return { success: true, message: 'Tracking resumed' };
});

ipcMain.handle('get-activity-stats', () => {
  return activityStats;
});

ipcMain.handle('get-anti-cheat-report', () => {
  if (antiCheatDetector) {
    return antiCheatDetector.getDetectionReport();
  }
  return { error: 'Anti-cheat detector not available' };
});

ipcMain.handle('confirm-resume-after-idle', async (event, confirmed) => {
  if (confirmed) {
    await resumeTracking();
    return { success: true, message: 'Tracking resumed after idle period' };
  } else {
    await stopTracking();
    return { success: true, message: 'Tracking stopped' };
  }
});

ipcMain.handle('confirm-resume-after-sleep', async (event, confirmed) => {
  if (confirmed) {
    await resumeTracking();
    return { success: true, message: 'Tracking resumed after sleep' };
  } else {
    await stopTracking();
    return { success: true, message: 'Tracking stopped' };
  }
});

ipcMain.handle('get-app-settings', () => {
  return appSettings;
});

ipcMain.handle('update-app-settings', (event, newSettings) => {
  appSettings = { ...appSettings, ...newSettings };
  
  // Restart anti-cheat detector with new settings
  if (antiCheatDetector && appSettings.enable_anti_cheat) {
    antiCheatDetector.stopMonitoring();
    antiCheatDetector = new AntiCheatDetector(appSettings);
    antiCheatDetector.startMonitoring();
  }
  
  // Save to config file
  const configToSave = { ...config, ...newSettings };
  fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
  
  return { success: true, message: 'Settings updated' };
});

ipcMain.handle('get-queue-status', () => {
  return {
    screenshots: offlineQueue.screenshots.length,
    appLogs: offlineQueue.appLogs.length,
    urlLogs: offlineQueue.urlLogs.length,
    idleLogs: offlineQueue.idleLogs.length,
    timeLogs: offlineQueue.timeLogs.length,
    fraudAlerts: offlineQueue.fraudAlerts.length
  };
});

ipcMain.handle('force-screenshot', async () => {
  await captureScreenshot();
  return { success: true, message: 'Screenshot captured manually' };
});

// === FRAUD DETECTION HANDLERS ===
ipcMain.handle('report-suspicious-activity', (event, activityData) => {
  if (antiCheatDetector) {
    antiCheatDetector.recordActivity('manual_report', activityData);
    return { success: true, message: 'Suspicious activity reported' };
  }
  return { error: 'Anti-cheat detector not available' };
});

ipcMain.handle('get-fraud-alerts', () => {
  return offlineQueue.fraudAlerts.slice(-20); // Return last 20 alerts
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

// === ENHANCED POWER MONITORING ===
powerMonitor.on('suspend', () => {
  console.log('💤 System suspended (laptop closed/sleep mode)');
  systemSleepStart = Date.now();
  
  if (isTracking) {
    pauseTracking('system_suspend');
    showTrayNotification('System sleep detected - tracking paused', 'info');
  }
  
  // Stop all monitoring during sleep
  if (antiCheatDetector) {
    antiCheatDetector.stopMonitoring();
  }
});

powerMonitor.on('resume', () => {
  const sleepDuration = systemSleepStart ? Date.now() - systemSleepStart : 0;
  const sleepMinutes = Math.floor(sleepDuration / 60000);
  
  console.log(`⚡ System resumed after ${sleepMinutes} minutes`);
  
  // Log the sleep period as idle time
  if (systemSleepStart && currentTimeLogId) {
    logIdlePeriod(systemSleepStart, Date.now(), Math.floor(sleepDuration / 1000));
  }
  
  // Restart anti-cheat monitoring
  if (appSettings.enable_anti_cheat) {
    if (!antiCheatDetector) {
      antiCheatDetector = new AntiCheatDetector(appSettings);
    }
    antiCheatDetector.startMonitoring();
  }
  
  // Auto-resume with user confirmation for long sleep periods
  if (isPaused && currentSession) {
    setTimeout(() => {
      if (sleepMinutes > 60) { // More than 1 hour
        mainWindow?.webContents.send('confirm-resume-after-sleep', {
          sleepMinutes: sleepMinutes
        });
      } else {
        resumeTracking();
        showTrayNotification(`Tracking resumed after ${sleepMinutes}m sleep`, 'success');
      }
    }, 5000); // Wait 5 seconds after resume
  }
  
  systemSleepStart = null;
});

powerMonitor.on('lock-screen', () => {
  console.log('🔒 Screen locked');
  if (isTracking && !isPaused) {
    pauseTracking('screen_locked');
    showTrayNotification('Screen locked - tracking paused', 'info');
  }
});

powerMonitor.on('unlock-screen', () => {
  console.log('🔓 Screen unlocked');
  if (isPaused && currentSession) {
    setTimeout(() => {
      resumeTracking();
      showTrayNotification('Screen unlocked - tracking resumed', 'success');
    }, 2000); // Wait 2 seconds after unlock
  }
});

console.log('📱 TimeFlow Desktop Agent initialized');
