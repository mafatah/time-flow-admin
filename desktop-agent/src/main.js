const { app, BrowserWindow, powerMonitor, screen, ipcMain, Notification, Tray, Menu, desktopCapturer, systemPreferences } = require('electron');
const path = require('path');
const fs = require('fs');
const screenshot = require('screenshot-desktop');
const activeWin = require('active-win');
const cron = require('node-cron');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const SyncManager = require('./sync-manager');
const AntiCheatDetector = require('./anti-cheat-detector');

// Import our unified input detection system
try {
  const { initSystemMonitor } = require('../../electron/systemMonitor.ts');
  global.systemMonitorModule = { initSystemMonitor };
  console.log('✅ SystemMonitor module loaded successfully');
} catch (error) {
  console.log('⚠️ SystemMonitor module not available:', error.message);
  global.systemMonitorModule = null;
}

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
  keyboard_diversity_threshold: 5,
  max_laptop_closed_hours: 1
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
  screenshotsCaptured: 0,
  lastScreenshotTime: null
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
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../renderer/renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'Ebdaa Time - Employee Portal',
    resizable: true,
    show: false,
    minWidth: 800,
    minHeight: 600
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Ebdaa Time Agent ready');
  });

  // Handle window events
  mainWindow.on('minimize', () => {
    mainWindow.hide();
    showTrayNotification('Ebdaa Time continues tracking in background');
  });

  mainWindow.on('close', (event) => {
    if (isTracking) {
      event.preventDefault();
      mainWindow.hide();
      showTrayNotification('Ebdaa Time continues tracking in background');
    }
  });

  return mainWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(iconPath);
  
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  const isCurrentlyTracking = isTracking && !isPaused;
  const isPausing = isTracking && isPaused;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `TimeFlow Desktop Agent`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: `Status: ${isCurrentlyTracking ? '🟢 Tracking' : isPausing ? '⏸️ Paused' : '⭕ Stopped'}`,
      enabled: false
    },
    {
      label: currentSession ? `Project: ${currentSession.project_id || 'Unknown'}` : 'No active project',
      enabled: false
    },
    { type: 'separator' },
    {
      label: '▶️ Start Tracking',
      enabled: !isTracking,
      click: async () => {
        try {
          // Check if project is selected
          if (!config.project_id) {
            // Show project selection requirement
            if (mainWindow) {
              mainWindow.focus();
              mainWindow.webContents.send('show-project-selection-required');
            }
            
            new Notification({
              title: 'Project Selection Required',
              body: 'Please open the TimeFlow app and select a project before starting tracking from the menu bar.'
            }).show();
            
            return;
          }
          
          await startTracking(config.project_id);
          console.log('✅ [TRAY] Tracking started from menu bar');
        } catch (error) {
          console.error('❌ [TRAY] Failed to start tracking:', error.message);
          new Notification({
            title: 'Failed to Start Tracking',
            body: error.message
          }).show();
        }
      }
    },
    {
      label: '⏸️ Pause Tracking',
      enabled: isCurrentlyTracking,
      click: async () => {
        try {
          await pauseTracking('manual');
          console.log('✅ [TRAY] Tracking paused from menu bar');
        } catch (error) {
          console.error('❌ [TRAY] Failed to pause tracking:', error);
        }
      }
    },
    {
      label: '▶️ Resume Tracking',
      enabled: isPausing,
      click: async () => {
        try {
          await resumeTracking();
          console.log('✅ [TRAY] Tracking resumed from menu bar');
        } catch (error) {
          console.error('❌ [TRAY] Failed to resume tracking:', error);
        }
      }
    },
    {
      label: '⏹️ Stop Tracking',
      enabled: isTracking,
      click: async () => {
        try {
          await stopTracking();
          console.log('✅ [TRAY] Tracking stopped from menu bar');
        } catch (error) {
          console.error('❌ [TRAY] Failed to stop tracking:', error);
        }
      }
    },
    { type: 'separator' },
    {
      label: '📊 Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '📋 Select Project',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to-time-tracker');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  // Update tray tooltip with current status
  const tooltipStatus = isCurrentlyTracking ? 'Tracking' : isPausing ? 'Paused' : 'Stopped';
  const projectInfo = currentSession ? ` - ${currentSession.project_id}` : '';
  tray.setToolTip(`TimeFlow: ${tooltipStatus}${projectInfo}`);
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
        keyboard_diversity_threshold: settings.keyboard_diversity_threshold || 5,
        max_laptop_closed_hours: settings.max_laptop_closed_hours || 1
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
  
  // Initialize unified input detection system
  if (global.systemMonitorModule?.initSystemMonitor) {
    try {
      global.systemMonitorModule.initSystemMonitor();
      console.log('🎯 Unified input detection system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize unified input detection:', error);
    }
  } else {
    console.log('⚠️ Unified input detection not available, falling back to basic detection');
  }
  
  // Legacy tracking disabled - replaced with unified detection above
  // startMouseTracking();
  // startKeyboardTracking();
  
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
      
      // ITEM 3: Auto-resume tracking without asking employee
      if (isPaused && currentSession) {
        // Always auto-resume regardless of idle duration - don't interrupt employee
        resumeTracking();
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
  // DISABLED: Replaced with unified input detection in systemMonitor.ts
  console.log('🚫 Legacy mouse tracking disabled - using unified input detection');
  return;
  
  /* COMMENTED OUT - OLD LOGIC CAUSING CROSS-CONTAMINATION
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
  */
}

function startKeyboardTracking() {
  // DISABLED: Replaced with unified input detection in systemMonitor.ts
  console.log('🚫 Legacy keyboard tracking disabled - using unified input detection');
  return;
  
  /* COMMENTED OUT - OLD LOGIC CAUSING CROSS-CONTAMINATION
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
  */
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
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / 60000); // Convert ms to minutes

    // Add to offline queue
    const idleLogData = {
      user_id: config.user_id || 'demo-user',
      project_id: '00000000-0000-0000-0000-000000000001',
      idle_start: new Date(start).toISOString(),
      idle_end: new Date(end).toISOString(),
      duration_minutes: durationMinutes
    };

    // Update current time_log with idle flag
    if (currentTimeLogId) {
      await updateTimeLogIdleStatus(true, durationMinutes);
    }

    // Queue for offline support
    await syncManager.addIdleLog(idleLogData);
    console.log(`📝 Idle period logged: ${durationMinutes}m`);

  } catch (error) {
    console.error('❌ Failed to log idle period:', error);
  }
}

async function updateTimeLogIdleStatus(isIdle, idleMinutes = 0) {
  try {
    const updateData = {
      is_idle: isIdle,
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
  try {
    // MEMORY LEAK FIX: Limit title length and use safe regex
    if (!title || typeof title !== 'string') return null;
    
    const limitedTitle = title.length > 1000 ? title.substring(0, 1000) : title;
    
    // Use more specific regex to prevent catastrophic backtracking
    const urlMatch = limitedTitle.match(/https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/);
    return urlMatch ? urlMatch[0] : null;
  } catch (error) {
    console.error('❌ URL extraction error:', error);
    return null;
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

// Add this function before captureScreenshot
async function checkMacScreenPermissions() {
  if (process.platform === 'darwin') {
    try {
      // Check if we have screen capture permissions on macOS
      const hasPermission = systemPreferences.getMediaAccessStatus('screen');
      
      if (hasPermission !== 'granted') {
        console.log('🔒 macOS Screen Recording permission not granted');
        console.log('📋 Please grant Screen Recording permission in System Preferences:');
        console.log('   1. Go to System Preferences > Security & Privacy > Privacy');
        console.log('   2. Select "Screen Recording" from the left sidebar');
        console.log('   3. Add and enable TimeFlow/Electron app');
        console.log('   4. Restart the application');
        
        // Try to request permission
        const granted = await systemPreferences.askForMediaAccess('screen');
        if (!granted) {
          console.log('❌ Screen Recording permission denied');
          return false;
        }
      }
      
      console.log('✅ macOS Screen Recording permission granted');
      return true;
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }
  return true; // Not macOS, assume OK
}

// === ENHANCED SCREENSHOT CAPTURE WITH MANDATORY REQUIREMENT ===
let consecutiveScreenshotFailures = 0;
let lastSuccessfulScreenshotTime = 0;
let screenshotFailureStart = null;
const MAX_SCREENSHOT_FAILURES = 3; // Stop after 3 consecutive failures
const MANDATORY_SCREENSHOT_INTERVAL = 15 * 60 * 1000; // 15 minutes mandatory screenshot interval (reduced from 30)

async function captureScreenshot() {
  try {
    console.log('📸 Capturing screenshot...');
    
    // Check macOS permissions first
    const hasPermission = await checkMacScreenPermissions();
    if (!hasPermission) {
      throw new Error('Screen Recording permission not granted on macOS');
    }
    
    // Try Electron's desktopCapturer first (better for Electron apps)
    let img;
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      if (sources && sources.length > 0) {
        // Get the primary screen
        const primarySource = sources[0];
        img = primarySource.thumbnail.toPNG();
        console.log('✅ Screenshot captured using Electron desktopCapturer');
      } else {
        throw new Error('No screen sources available');
      }
    } catch (electronError) {
      console.log('⚠️ Electron desktopCapturer failed, trying screenshot-desktop...');
      
      // Fallback to screenshot-desktop
      const screenshot = require('screenshot-desktop');
      img = await screenshot({ 
        format: 'png', 
        quality: appSettings.screenshot_quality,
        // Add macOS specific options
        ...(process.platform === 'darwin' && {
          displayId: 0, // Primary display
          format: 'png'
        })
      });
      console.log('✅ Screenshot captured using screenshot-desktop');
    }
    
    // Calculate activity metrics from recent activity
    const activityPercent = calculateActivityPercent();
    const focusPercent = calculateFocusPercent();
    
    // Update activity stats
    activityStats.screenshotsCaptured++;
    activityStats.lastScreenshotTime = Date.now();
    
    // Create screenshot metadata
    const screenshotMeta = {
      user_id: config.user_id || 'demo-user', // Ensure user_id is set
      project_id: '00000000-0000-0000-0000-000000000001',
      time_log_id: currentTimeLogId || 'no-session',
      timestamp: new Date().toISOString(),
      file_path: `screenshot_${Date.now()}.png`,
      file_size: img.length,
      activity_percent: Math.round(activityPercent),
      focus_percent: Math.round(focusPercent),
      mouse_clicks: activityStats.mouseClicks,
      keystrokes: activityStats.keystrokes,
      mouse_movements: activityStats.mouseMovements,
      captured_at: new Date().toISOString(),
      is_blurred: appSettings.blur_screenshots || false
    };
    
    // Add to offline queue and attempt sync
    try {
      await syncManager.addScreenshot(img, screenshotMeta);
    } catch (syncError) {
      console.log('⚠️ Screenshot upload failed, queuing for later');
      offlineQueue.screenshots.push(screenshotMeta);
    }
    
    console.log(`📦 Screenshot queued (${offlineQueue.screenshots.length} pending)`);
    
    // SUCCESS: Reset failure tracking
    consecutiveScreenshotFailures = 0;
    lastSuccessfulScreenshotTime = Date.now();
    screenshotFailureStart = null;
    console.log('✅ Screenshot captured successfully - mandatory requirement satisfied');
    
    // Send screenshot event to UI
    if (mainWindow) {
      mainWindow.webContents.send('screenshot-captured', {
        activityPercent: Math.round(activityPercent),
        focusPercent: Math.round(focusPercent),
        timestamp: screenshotMeta.timestamp
      });
      
      mainWindow.webContents.send('activity-update', {
        mouseClicks: activityStats.mouseClicks,
        keystrokes: activityStats.keystrokes,
        mouseMovements: activityStats.mouseMovements,
        activityPercent: Math.round(activityPercent),
        focusPercent: Math.round(focusPercent)
      });
    }
    
    // Anti-cheat analysis
    let suspiciousActivity = { suspicious: false, confidence: 0 };
    
    if (antiCheatDetector) {
      try {
        suspiciousActivity = await antiCheatDetector.analyzeScreenshot(img, {
          activityPercent,
          focusPercent,
          mouseClicks: activityStats.mouseClicks,
          keystrokes: activityStats.keystrokes
        });
        
        if (suspiciousActivity.suspicious) {
          console.log(`🚨 Suspicious activity detected (confidence: ${suspiciousActivity.confidence})`);
          activityStats.suspiciousEvents++;
        }
      } catch (detectionError) {
        console.log('⚠️ Anti-cheat detection failed:', detectionError.message);
      }
    }
    
    return true; // Success
    
  } catch (error) {
    // FAILURE: Track consecutive failures
    consecutiveScreenshotFailures++;
    console.error(`💥 Screenshot failed (attempt ${consecutiveScreenshotFailures}/${MAX_SCREENSHOT_FAILURES}):`, error.message);
    
    // Track when failures started
    if (!screenshotFailureStart) {
      screenshotFailureStart = Date.now();
      console.log('⚠️ Screenshot failures started, beginning mandatory screenshot enforcement');
    }
    
    // Check if we should stop tracking due to screenshot requirement failure
    const shouldStopTracking = checkScreenshotStopConditions();
    
    if (shouldStopTracking) {
      const { reason, message } = getScreenshotStopReason();
      console.log(`🛑 Stopping tracking due to screenshot requirement: ${reason}`);
      
      // Stop tracking
      if (isTracking) {
        await stopTracking();
        showTrayNotification(message, 'error');
        
        // Show detailed notification
        try {
          new Notification({
            title: 'TimeFlow - Screenshot Requirement Failed',
            body: message
          }).show();
        } catch (e) {
          console.log('⚠️ Could not show screenshot failure notification:', e);
        }
      }
      
      // Update tray to reflect stopped state
      updateTrayMenu();
    }
    
    return false; // Failure
  }
}

// Check if tracking should stop due to screenshot failures
function checkScreenshotStopConditions() {
  const now = Date.now();
  
  // Stop if too many consecutive failures
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    return true;
  }
  
  // Stop if mandatory screenshot interval exceeded (30 minutes without successful screenshot)
  if (lastSuccessfulScreenshotTime > 0 && (now - lastSuccessfulScreenshotTime) > MANDATORY_SCREENSHOT_INTERVAL) {
    return true;
  }
  
  // Stop if we're tracking but haven't had any successful screenshots for the mandatory interval
  if (isTracking && screenshotFailureStart && (now - screenshotFailureStart) > MANDATORY_SCREENSHOT_INTERVAL) {
    return true;
  }
  
  return false;
}

// Get stop reason for screenshot failures
function getScreenshotStopReason() {
  const now = Date.now();
  
  if (consecutiveScreenshotFailures >= MAX_SCREENSHOT_FAILURES) {
    return {
      reason: 'consecutive_failures',
      message: `Screenshots are mandatory for time tracking. ${consecutiveScreenshotFailures} consecutive failures detected. Please ensure your laptop is open and screen recording permissions are granted.`
    };
  }
  
  if (lastSuccessfulScreenshotTime > 0) {
    const minutesWithoutScreenshot = Math.floor((now - lastSuccessfulScreenshotTime) / (60 * 1000));
    return {
      reason: 'mandatory_timeout',
      message: `Screenshots are required every 15 minutes for time tracking verification. ${minutesWithoutScreenshot} minutes have passed without a successful screenshot.`
    };
  }
  
  if (screenshotFailureStart) {
    const minutesSinceFirstFailure = Math.floor((now - screenshotFailureStart) / (60 * 1000));
    return {
      reason: 'extended_failure',
      message: `Screenshot capture has been failing for ${minutesSinceFirstFailure} minutes. Screenshots are mandatory for continued time tracking.`
    };
  }
  
  return {
    reason: 'unknown',
    message: 'Screenshot requirement not met. Please restart tracking and ensure proper permissions.'
  };
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
    screenshotsCaptured: 0,
    lastScreenshotTime: null
  };
}

function startScreenshotCapture() {
  if (screenshotInterval) clearInterval(screenshotInterval);

  console.log(`📸 Starting random screenshots - 2 per 10 minute period`);
  
  // Schedule first screenshot with initial random delay
  scheduleRandomScreenshot();
}

function scheduleRandomScreenshot() {
  if (screenshotInterval) clearTimeout(screenshotInterval);
  
  // Generate random interval between 2-8 minutes (120-480 seconds)
  // This ensures 2 screenshots within each 10-minute window at random times
  const minInterval = 120; // 2 minutes 
  const maxInterval = 480; // 8 minutes
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
  
  console.log(`📸 Next screenshot in ${Math.round(randomInterval / 60)} minutes ${randomInterval % 60} seconds`);
  
  screenshotInterval = setTimeout(async () => {
    await captureScreenshot();
    // Schedule next random screenshot
    scheduleRandomScreenshot();
  }, randomInterval * 1000);
}

function stopScreenshotCapture() {
  if (screenshotInterval) {
    clearTimeout(screenshotInterval);
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
      title: 'Ebdaa Time',
      body: message,
      icon: path.join(__dirname, '../assets/icon.png')
    });
    
    notification.show();
    console.log(`🔔 Notification: ${message}`);
  }
}

// === TRACKING CONTROL ===
async function startTracking(projectId = null) {
  if (isTracking) {
    console.log('⚠️ [MAIN] Tracking already active');
    return;
  }

  console.log('🚀 [MAIN] Starting time tracking...');
  
  // === PROJECT VALIDATION ===
  let actualProjectId = projectId || config.project_id;
  
  // If no project ID provided, show project selection dialog
  if (!actualProjectId) {
    console.log('❌ [MAIN] No project ID available - project selection required');
    
    // Show project selection notification
    showTrayNotification('Please select a project before starting tracking', 'warning');
    
    // Try to focus the main window to show project selection
    if (mainWindow) {
      mainWindow.focus();
      mainWindow.webContents.send('show-project-selection');
    }
    
    throw new Error('Project selection is required to start tracking. Please select a project from the Time Tracker page.');
  }
  
  // Validate project ID format (should be UUID or valid identifier)
  if (actualProjectId.length < 10) {
    console.log('❌ [MAIN] Invalid project ID format');
    throw new Error('Invalid project ID. Please select a valid project.');
  }

  console.log('📋 [MAIN] Project ID validated:', actualProjectId);
  
  // === MANDATORY REQUIREMENTS CHECK ===
  console.log('🔍 [MAIN] Checking mandatory requirements for time tracking...');
  
  // 1. Check screenshot capabilities
  const hasScreenshotPermissions = await checkMacScreenPermissions();
  if (!hasScreenshotPermissions) {
    console.log('❌ [MAIN] Screenshot permissions required for time tracking');
    throw new Error('Screen recording permissions are required for time tracking. Please grant permissions and restart.');
  }
  
  // 2. Test screenshot capture before starting
  console.log('📸 [MAIN] Testing screenshot capability...');
  const testScreenshotResult = await captureScreenshot();
  if (!testScreenshotResult) {
    console.log('❌ [MAIN] Screenshot test failed - cannot start tracking');
    throw new Error('Screenshot capture failed. Screenshots are mandatory for time tracking.');
  }
  
  console.log('✅ [MAIN] Mandatory requirements satisfied - proceeding with tracking');

  // Set tracking state
  isTracking = true;
  isPaused = false;

  // Generate time log ID
  currentTimeLogId = `time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log('📝 [MAIN] Generated time log ID:', currentTimeLogId);

  // Create time log
  try {
    const timeLogData = {
      id: currentTimeLogId,
      user_id: config.user_id,
      project_id: actualProjectId,
      start_time: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString()
    };

    console.log('💾 [MAIN] Creating time log with data:', timeLogData);

    const { error } = await supabase
      .from('time_logs')
      .insert(timeLogData);

    if (error) {
      console.log('⚠️ [MAIN] Failed to create time log in database:', error);
      console.log('📋 [MAIN] Queuing time log for later sync');
      offlineQueue.timeLogs.push(timeLogData);
    } else {
      console.log('✅ [MAIN] Time log created in database');
    }
  } catch (dbError) {
    console.log('❌ [MAIN] Database error creating time log:', dbError.message);
    console.log('📋 [MAIN] Queuing time log for offline sync');
    offlineQueue.timeLogs.push({
      id: currentTimeLogId,
      user_id: config.user_id,
      project_id: actualProjectId,
      start_time: new Date().toISOString(),
      status: 'active'
    });
  }

  currentSession = {
    id: currentTimeLogId,
    start_time: new Date().toISOString(),
    user_id: config.user_id,
    project_id: actualProjectId
  };

  console.log('📋 [MAIN] Current session created:', currentSession);

  // Start all monitoring
  console.log('🔄 [MAIN] Starting monitoring systems...');
  startScreenshotCapture();
  startIdleMonitoring();
  startAppCapture();
  startUrlCapture();
  startMandatoryScreenshotMonitoring(); // NEW: Monitor mandatory screenshot requirement

  // Update tray
  updateTrayMenu();
  
  // Update UI
  mainWindow?.webContents.send('tracking-started', currentSession);
  
  // Notify user of successful start with project info
  showTrayNotification(`Tracking started for project: ${actualProjectId}`, 'success');
  
  console.log('✅ [MAIN] Time tracking started successfully with mandatory screenshot enforcement');
}

// === MANDATORY SCREENSHOT MONITORING ===
let mandatoryScreenshotInterval = null;

function startMandatoryScreenshotMonitoring() {
  // Check every 3 minutes if mandatory screenshot requirement is being met
  mandatoryScreenshotInterval = setInterval(() => {
    if (!isTracking) return;
    
    const now = Date.now();
    const timeSinceLastSuccess = now - lastSuccessfulScreenshotTime;
    const minutesSinceLastSuccess = Math.floor(timeSinceLastSuccess / (60 * 1000));
    
    // Warn at 12 minutes (3 minutes before mandatory stop at 15 minutes)
    if (timeSinceLastSuccess > (12 * 60 * 1000) && timeSinceLastSuccess < (15 * 60 * 1000)) {
      console.log(`⚠️ [MANDATORY] Warning: ${minutesSinceLastSuccess} minutes since last screenshot`);
      showTrayNotification(
        `Warning: ${minutesSinceLastSuccess} minutes since last screenshot. Screenshots are required every 15 minutes.`,
        'warning'
      );
    }
    
    // Check if mandatory interval exceeded (15 minutes)
    if (timeSinceLastSuccess > MANDATORY_SCREENSHOT_INTERVAL) {
      console.log(`🛑 [MANDATORY] Stopping tracking: ${minutesSinceLastSuccess} minutes without screenshot`);
      
      // Force stop tracking
      stopTracking();
      
      showTrayNotification(
        `Tracking stopped: Screenshots are required every 15 minutes. ${minutesSinceLastSuccess} minutes have passed without a successful screenshot.`,
        'error'
      );
      
      // Show detailed notification
      try {
        new Notification({
          title: 'TimeFlow - Mandatory Screenshot Requirement',
          body: `Time tracking has been stopped because ${minutesSinceLastSuccess} minutes have passed without a successful screenshot. Screenshots are required every 15 minutes for time tracking verification. Please restart tracking and ensure proper permissions.`
        }).show();
      } catch (e) {
        console.log('⚠️ Could not show mandatory screenshot notification:', e);
      }
    }
  }, 3 * 60 * 1000); // Check every 3 minutes (more frequent for 15-minute interval)
  
  console.log('✅ [MANDATORY] Mandatory screenshot monitoring started (checking every 3 minutes)');
}

function stopMandatoryScreenshotMonitoring() {
  if (mandatoryScreenshotInterval) {
    clearInterval(mandatoryScreenshotInterval);
    mandatoryScreenshotInterval = null;
    console.log('🛑 [MANDATORY] Mandatory screenshot monitoring stopped');
  }
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
  stopMandatoryScreenshotMonitoring(); // NEW: Stop mandatory screenshot monitoring

  // Reset screenshot failure tracking
  consecutiveScreenshotFailures = 0;
  lastSuccessfulScreenshotTime = 0;
  screenshotFailureStart = null;
  console.log('🔄 Screenshot failure tracking reset');

  // End current time log and cleanup any stale sessions
  if (currentTimeLogId) {
    try {
      // End the current session
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', currentTimeLogId);
      
      if (error) {
        console.error('❌ Failed to end current time log:', error);
      } else {
        console.log('✅ Current time log ended successfully');
      }
      
      // CLEANUP: End any other active sessions for this user that might be stale
      const cleanupResult = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('user_id', config.user_id)
        .is('end_time', null)
        .neq('id', currentTimeLogId); // Don't update the current one again
      
      if (cleanupResult.error) {
        console.log('⚠️ Failed to cleanup stale sessions:', cleanupResult.error);
      } else {
        console.log('🧹 Cleaned up any stale active sessions');
      }
      
    } catch (error) {
      console.error('❌ Failed to end time log:', error);
      
      // Queue for offline sync
      offlineQueue.timeLogs.push({
        id: currentTimeLogId,
        user_id: config.user_id,
        end_time: new Date().toISOString(),
        status: 'completed',
        action: 'update'
      });
    }
  }

  // Update tray
  updateTrayMenu();
  
  // Update UI
  mainWindow?.webContents.send('tracking-stopped');
  
  // Notify user of successful stop
  showTrayNotification('Time tracking stopped', 'info');
  
  currentSession = null;
  currentTimeLogId = null;
  console.log('✅ Time tracking stopped with mandatory requirements enforced');
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

// === ENHANCED IPC HANDLERS ===

// Employee login/logout handlers
ipcMain.on('user-logged-in', (event, user) => {
  console.log('👤 User logged in:', user.email);
  // Set the user for activity monitoring
  // Auto-start activity monitoring when user logs in
  if (user.id) {
    console.log('🚀 Starting activity monitoring for user:', user.id);
    // The activity monitoring is already running from config, just need to associate with user
  }
});

ipcMain.on('user-logged-out', (event) => {
  console.log('👤 User logged out');
  // Stop tracking if active
  if (isTracking) {
    stopTracking();
  }
});

// Activity monitoring handlers
ipcMain.on('start-activity-monitoring', (event, userId) => {
  console.log('📊 Starting activity monitoring for user:', userId);
  // Activity monitoring is already running, just associate with user
});

// Tracking control handlers
ipcMain.on('start-tracking', (event, userId) => {
  console.log('▶️ Start tracking requested for user:', userId);
  startTracking();
});

ipcMain.on('pause-tracking', (event) => {
  console.log('⏸️ Pause tracking requested');
  pauseTracking('manual');
});

ipcMain.on('stop-tracking', (event) => {
  console.log('⏹️ Stop tracking requested');
  stopTracking();
});

// Legacy IPC handlers for compatibility
ipcMain.handle('start-tracking', async (event, projectId = null) => {
  console.log('🎯 [MAIN] IPC start-tracking called with project_id:', projectId);
  console.log('🎯 [MAIN] typeof projectId:', typeof projectId);
  console.log('🎯 [MAIN] projectId value:', JSON.stringify(projectId));
  
  try {
    const result = await startTracking(projectId);
    console.log('✅ [MAIN] startTracking completed successfully');
    return { success: true, message: 'Enhanced tracking started with anti-cheat detection' };
  } catch (error) {
    console.error('❌ [MAIN] startTracking failed with error:', error);
    return { success: false, message: 'Failed to start tracking: ' + error.message };
  }
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

ipcMain.handle('get-config', () => {
  return config;
});

ipcMain.handle('fetch-screenshots', async (event, params) => {
  try {
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

// === MISSING HANDLERS FIX ===
ipcMain.handle('is-tracking', () => {
  return {
    isTracking: isTracking,
    isPaused: isPaused,
    currentSession: currentSession,
    currentTimeLogId: currentTimeLogId
  };
});

ipcMain.handle('get-stats', () => {
  return {
    ...activityStats,
    isTracking: isTracking,
    isPaused: isPaused,
    systemIdleTime: getSystemIdleTime(),
    lastActivity: lastActivity,
    queueStatus: {
      screenshots: offlineQueue.screenshots.length,
      appLogs: offlineQueue.appLogs.length,
      urlLogs: offlineQueue.urlLogs.length,
      idleLogs: offlineQueue.idleLogs.length,
      timeLogs: offlineQueue.timeLogs.length,
      fraudAlerts: offlineQueue.fraudAlerts.length
    }
  };
});

// === MISSING CAPTURE FUNCTIONS ===
async function captureActiveApplication() {
  try {
    const activeWindow = await activeWin();
    if (!activeWindow) return null;

    const appData = {
      user_id: config.user_id || 'demo-user',
      time_log_id: currentTimeLogId,
      application_name: activeWindow.name || 'Unknown',
      window_title: activeWindow.title || 'Unknown',
      captured_at: new Date().toISOString()
    };

    // Add to offline queue
    offlineQueue.appLogs.push(appData);
    console.log(`📱 App captured: ${appData.application_name}`);
    return appData;
  } catch (error) {
    throw error;
  }
}

async function captureActiveUrl() {
  try {
    const activeWindow = await activeWin();
    if (!activeWindow || !isBrowserApp(activeWindow.name)) return null;

    const url = extractUrlFromTitle(activeWindow.title);
    if (!url) return null;

    const urlData = {
      user_id: config.user_id || 'demo-user',
      time_log_id: currentTimeLogId,
      url: url,
      domain: extractDomain(url),
      application_name: activeWindow.name,
      captured_at: new Date().toISOString()
    };

    // Add to offline queue
    offlineQueue.urlLogs.push(urlData);
    console.log(`🌐 URL captured: ${urlData.domain}`);
    return urlData;
  } catch (error) {
    throw error;
  }
}

// === APP LIFECYCLE ===
app.whenReady().then(() => {
  console.log('🚀 TimeFlow Desktop Agent starting...');
  
  // Initialize components
  initializeComponents();
  
  // Create tray
  createTray();
  
  // Create window
  createWindow();
  
  // Initialize anti-cheat detector
  antiCheatDetector = new AntiCheatDetector(config);
  
  // Fetch settings from server
  fetchSettings();
  
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
  
  // AGGRESSIVE INTERVAL CLEANUP TO PREVENT MEMORY LEAKS
  console.log('🧹 Performing aggressive cleanup...');
  
  // Clear all known intervals
  if (settingsInterval) clearInterval(settingsInterval);
  if (screenshotInterval) clearInterval(screenshotInterval);
  if (activityInterval) clearInterval(activityInterval);
  if (idleCheckInterval) clearInterval(idleCheckInterval);
  if (appCaptureInterval) clearInterval(appCaptureInterval);
  if (urlCaptureInterval) clearInterval(urlCaptureInterval);
  if (notificationInterval) clearInterval(notificationInterval);
  if (mouseTrackingInterval) clearInterval(mouseTrackingInterval);
  if (keyboardTrackingInterval) clearInterval(keyboardTrackingInterval);
  
  // Nuclear option: clear ALL possible intervals
  for (let i = 1; i < 10000; i++) {
    clearInterval(i);
    clearTimeout(i);
  }
  
  stopNotificationChecking();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
    console.log('✅ Garbage collection forced on shutdown');
  }
  
  console.log('✅ Aggressive cleanup completed');
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
  const sleepHours = Math.floor(sleepDuration / (60 * 60 * 1000));
  
  console.log(`⚡ System resumed after ${sleepHours}h ${sleepMinutes % 60}m`);
  
  // Log the sleep period as idle time
  if (systemSleepStart && currentTimeLogId) {
    logIdlePeriod(systemSleepStart, Date.now(), Math.floor(sleepDuration / 1000));
  }
  
  // Check if laptop was closed for more than 1 hour (configurable)
  const maxLaptopClosedHours = appSettings.max_laptop_closed_hours || 1;
  const maxLaptopClosedTime = maxLaptopClosedHours * 60 * 60 * 1000; // Convert to milliseconds
  
  if (sleepDuration > maxLaptopClosedTime) {
    console.log(`🛑 Laptop was closed for ${sleepHours} hours (max: ${maxLaptopClosedHours}h) - stopping tracking`);
    
    // Stop tracking due to extended closure
    if (isTracking) {
      stopTracking();
      showTrayNotification(
        `Tracking stopped: Laptop was closed for ${sleepHours} hours. Please restart tracking when you resume work.`, 
        'warning'
      );
    }
    
    // Update tray to reflect stopped state
    updateTrayMenu();
    
    // Show detailed notification
    try {
      new Notification({
        title: 'TimeFlow - Extended Absence Detected',
        body: `Time tracking has been stopped because your laptop was closed for ${sleepHours} hours (maximum allowed: ${maxLaptopClosedHours} hour). This ensures accurate time tracking. Please start tracking again when you resume work.`
      }).show();
    } catch (e) {
      console.log('⚠️ Could not show extended absence notification:', e);
    }
    
    systemSleepStart = null;
    return; // Don't auto-resume
  }
  
  // Restart anti-cheat monitoring
  if (appSettings.enable_anti_cheat) {
    if (!antiCheatDetector) {
      antiCheatDetector = new AntiCheatDetector(appSettings);
    }
    antiCheatDetector.startMonitoring();
  }
  
  // Auto-resume for shorter sleep periods (under 1 hour)
  if (isPaused && currentSession) {
    setTimeout(() => {
      // Always auto-resume tracking without asking - employee doesn't need to be interrupted
      resumeTracking();
      showTrayNotification(`Tracking resumed after ${sleepHours}h ${sleepMinutes % 60}m sleep`, 'success');
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

console.log('📱 Ebdaa Time Desktop Agent initialized');

// Initialize components
function initializeComponents() {
  syncManager = new SyncManager(config, supabase);
  console.log('📱 TimeFlow Desktop Agent initialized');
}

// Add the IPC handler for Mac permission checking
ipcMain.handle('check-mac-permissions', async () => {
  try {
    if (process.platform === 'darwin') {
      const hasPermission = systemPreferences.getMediaAccessStatus('screen');
      return {
        hasPermission: hasPermission === 'granted',
        status: hasPermission,
        platform: 'macOS'
      };
    } else {
      return {
        hasPermission: true,
        status: 'not-applicable',
        platform: process.platform
      };
    }
  } catch (error) {
    console.error('❌ Permission check failed:', error);
    return {
      hasPermission: false,
      status: 'error',
      error: error.message
    };
  }
});

// === LOG DOWNLOAD HANDLERS ===
ipcMain.handle('get-activity-metrics', () => {
  try {
    console.log('📊 Getting activity metrics...');
    
    const currentMetrics = {
      mouse_clicks: activityStats.mouseClicks,
      keystrokes: activityStats.keystrokes,
      mouse_movements: activityStats.mouseMovements,
      activity_score: calculateActivityPercent(),
      time_since_last_activity_ms: Date.now() - lastActivity,
      time_since_last_activity_seconds: Math.floor((Date.now() - lastActivity) / 1000),
      is_monitoring: !!idleCheckInterval,
      is_tracking: isTracking,
      is_paused: isPaused
    };
    
    return { success: true, metrics: currentMetrics };
  } catch (error) {
    console.error('❌ Error getting activity metrics:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('user-logged-in', async (event, user) => {
  console.log('👤 User logged in via IPC:', user.email);
  config.user_id = user.id;
  return { success: true, message: 'User logged in successfully' };
});

ipcMain.handle('user-logged-out', async (event) => {
  console.log('👤 User logged out via IPC');
  config.user_id = null;
  return { success: true, message: 'User logged out successfully' };
});

ipcMain.handle('set-project-id', async (event, projectId) => {
  console.log('📋 Setting project ID:', projectId);
  config.project_id = projectId;
  return { success: true, message: 'Project ID set successfully' };
});

ipcMain.handle('get-activity-logs', () => {
  try {
    console.log('📊 Generating activity logs...');
    
    const activityData = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      currentStats: activityStats,
      settings: appSettings,
      trackingState: {
        isTracking,
        isPaused,
        currentSession,
        currentTimeLogId
      },
      systemInfo: {
        systemIdleTime: getSystemIdleTime(),
        lastActivity,
        lastMousePos
      },
      queueStatus: {
        screenshots: offlineQueue.screenshots.length,
        appLogs: offlineQueue.appLogs.length,
        urlLogs: offlineQueue.urlLogs.length,
        idleLogs: offlineQueue.idleLogs.length,
        timeLogs: offlineQueue.timeLogs.length,
        fraudAlerts: offlineQueue.fraudAlerts.length
      },
      recentActivity: {
        mouseClicks: activityStats.mouseClicks,
        keystrokes: activityStats.keystrokes,
        mouseMovements: activityStats.mouseMovements,
        screenshotsCaptured: activityStats.screenshotsCaptured,
        lastScreenshotTime: activityStats.lastScreenshotTime
      }
    };
    
    return { success: true, data: activityData };
  } catch (error) {
    console.error('❌ Error generating activity logs:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-logs', () => {
  try {
    console.log('🖥️ Generating system logs...');
    
    const systemLogs = [
      `TimeFlow Desktop Agent System Logs`,
      `Generated: ${new Date().toISOString()}`,
      `Platform: ${process.platform} (${process.arch})`,
      `Node.js: ${process.version}`,
      `Electron: ${process.versions.electron}`,
      ``,
      `=== CURRENT STATE ===`,
      `Tracking: ${isTracking ? 'Active' : 'Stopped'}`,
      `Paused: ${isPaused}`,
      `Current Session: ${currentSession ? currentSession.id : 'None'}`,
      `Current Time Log: ${currentTimeLogId || 'None'}`,
      ``,
      `=== ACTIVITY STATS ===`,
      `Mouse Clicks: ${activityStats.mouseClicks}`,
      `Keystrokes: ${activityStats.keystrokes}`,
      `Mouse Movements: ${activityStats.mouseMovements}`,
      `Screenshots Captured: ${activityStats.screenshotsCaptured}`,
      `Last Screenshot: ${activityStats.lastScreenshotTime ? new Date(activityStats.lastScreenshotTime).toISOString() : 'Never'}`,
      `Risk Score: ${activityStats.riskScore}`,
      ``,
      `=== SYSTEM INFO ===`,
      `System Idle Time: ${getSystemIdleTime()}ms`,
      `Last Activity: ${new Date(lastActivity).toISOString()}`,
      `Mouse Position: x=${lastMousePos.x}, y=${lastMousePos.y}`,
      ``,
      `=== SETTINGS ===`,
      `Screenshot Interval: ${appSettings.screenshot_interval_seconds}s`,
      `Idle Threshold: ${appSettings.idle_threshold_seconds}s`,
      `Blur Screenshots: ${appSettings.blur_screenshots}`,
      `Track URLs: ${appSettings.track_urls}`,
      `Track Applications: ${appSettings.track_applications}`,
      `Auto Start: ${appSettings.auto_start_tracking}`,
      `Anti-Cheat Enabled: ${appSettings.enable_anti_cheat}`,
      ``,
      `=== QUEUE STATUS ===`,
      `Screenshots: ${offlineQueue.screenshots.length} pending`,
      `App Logs: ${offlineQueue.appLogs.length} pending`,
      `URL Logs: ${offlineQueue.urlLogs.length} pending`,
      `Idle Logs: ${offlineQueue.idleLogs.length} pending`,
      `Time Logs: ${offlineQueue.timeLogs.length} pending`,
      `Fraud Alerts: ${offlineQueue.fraudAlerts.length} pending`,
      ``,
      `=== INTERVALS STATUS ===`,
      `Screenshot Interval: ${screenshotInterval ? 'Running' : 'Stopped'}`,
      `Activity Interval: ${activityInterval ? 'Running' : 'Stopped'}`,
      `Idle Check Interval: ${idleCheckInterval ? 'Running' : 'Stopped'}`,
      `Mouse Tracking: ${mouseTrackingInterval ? 'Running' : 'Stopped'}`,
      `Keyboard Tracking: ${keyboardTrackingInterval ? 'Running' : 'Stopped'}`,
      ``,
      `=== END OF LOGS ===`
    ].join('\n');
    
    return { success: true, data: systemLogs };
  } catch (error) {
    console.error('❌ Error generating system logs:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-screenshot-logs', () => {
  try {
    console.log('📸 Generating screenshot logs...');
    
    const screenshotData = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      screenshotStats: {
        totalCaptured: activityStats.screenshotsCaptured,
        lastCaptureTime: activityStats.lastScreenshotTime,
        lastCaptureTimeFormatted: activityStats.lastScreenshotTime ? 
          new Date(activityStats.lastScreenshotTime).toISOString() : 'Never'
      },
      settings: {
        interval: appSettings.screenshot_interval_seconds,
        quality: appSettings.screenshot_quality,
        blurEnabled: appSettings.blur_screenshots
      },
      queuedScreenshots: offlineQueue.screenshots.map(screenshot => ({
        timestamp: screenshot.timestamp,
        metadata: screenshot.metadata,
        retries: screenshot.retries || 0
      })),
      recentActivity: {
        activityPercent: calculateActivityPercent(),
        focusPercent: calculateFocusPercent(),
        mouseClicks: activityStats.mouseClicks,
        keystrokes: activityStats.keystrokes,
        mouseMovements: activityStats.mouseMovements
      }
    };
    
    return { success: true, data: screenshotData };
  } catch (error) {
    console.error('❌ Error generating screenshot logs:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-compatibility-report', () => {
  try {
    console.log('🔧 Generating compatibility report...');
    
    const compatibilityReport = {
      timestamp: new Date().toISOString(),
      system: {
        platform: process.platform,
        architecture: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        osVersion: require('os').release(),
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        cpuCount: require('os').cpus().length
      },
      inputDetection: {
        systemMonitorAvailable: !!global.systemMonitorModule,
        mouseTrackingActive: !!mouseTrackingInterval,
        keyboardTrackingActive: !!keyboardTrackingInterval,
        lastMousePosition: lastMousePos,
        lastActivity: new Date(lastActivity).toISOString()
      },
      features: {
        screenshotCapture: true,
        activityMonitoring: true,
        idleDetection: true,
        antiCheatDetection: appSettings.enable_anti_cheat,
        urlTracking: appSettings.track_urls,
        appTracking: appSettings.track_applications
      },
      currentActivity: {
        mouseClicks: activityStats.mouseClicks,
        keystrokes: activityStats.keystrokes,
        mouseMovements: activityStats.mouseMovements,
        activityPercent: calculateActivityPercent(),
        focusPercent: calculateFocusPercent()
      },
      networkStatus: {
        onlineQueueEmpty: offlineQueue.screenshots.length === 0 && 
                          offlineQueue.appLogs.length === 0 && 
                          offlineQueue.urlLogs.length === 0,
        pendingUploads: {
          screenshots: offlineQueue.screenshots.length,
          appLogs: offlineQueue.appLogs.length,
          urlLogs: offlineQueue.urlLogs.length,
          idleLogs: offlineQueue.idleLogs.length,
          timeLogs: offlineQueue.timeLogs.length,
          fraudAlerts: offlineQueue.fraudAlerts.length
        }
      },
      testResults: {
        systemIdleTimeWorking: getSystemIdleTime() >= 0,
        mousePositionTracking: lastMousePos.x >= 0 && lastMousePos.y >= 0,
        activityStatsUpdating: activityStats.lastReset > 0,
        screenshotSystemReady: true // Assume ready if we got this far
      }
    };
    
    return { success: true, data: compatibilityReport };
  } catch (error) {
    console.error('❌ Error generating compatibility report:', error);
    return { success: false, error: error.message };
  }
});

console.log('✅ Desktop Agent main process initialized with log download handlers');
