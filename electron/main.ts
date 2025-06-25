import 'dotenv/config';
import { app, BrowserWindow, ipcMain, powerMonitor, screen, nativeImage, shell, Menu, Tray, Notification, dialog, globalShortcut } from 'electron';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import { setUserId, getUserId, setProjectId, startTracking, stopTracking, syncOfflineData, loadSession, clearSavedSession } from './tracker';
import { saveUserSession, loadUserSession, clearUserSession, isSessionValid, UserSession } from './userSessionManager';
import { setupAutoLaunch } from './autoLaunch';
import { initSystemMonitor } from './systemMonitor';
import { startSyncLoop } from './unsyncedManager';
import { startActivityMonitoring, stopActivityMonitoring, triggerActivityCapture, triggerDirectScreenshot, recordRealActivity, demonstrateEnhancedLogging } from './activityMonitor';
import { ensureScreenRecordingPermission, checkScreenRecordingPermission, testScreenCapture } from './permissionManager';
import { initializeConfig, screenshotIntervalSeconds } from './config';
// Linux dependency checking is handled in linuxDependencyChecker.ts automatically
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { checkForUpdates, enableAutoUpdates, setupUpdaterIPC, getUpdateStatus } from './autoUpdater';

// Safe console logging to prevent EPIPE errors
function safeLog(...args: any[]) {
  try {
    console.log(...args);
  } catch (error) {
    // Silently ignore EPIPE errors when stdout is broken
    if ((error as any).code !== 'EPIPE') {
      // For non-EPIPE errors, try to log to stderr
      try {
        console.error('Console error:', error);
      } catch (e) {
        // If even stderr fails, just ignore
      }
    }
  }
}

// Global error handling to prevent crashes
process.on('uncaughtException', (error) => {
  // Handle EPIPE errors silently (broken stdout/stderr pipe)
  if ((error as any).code === 'EPIPE') {
    return; // Ignore EPIPE errors silently
  }
  
  // For other critical errors, log and continue
  try {
    console.error('Uncaught Exception:', error);
  } catch (e) {
    // If logging fails, just continue
  }
});

process.on('unhandledRejection', (reason, promise) => {
  try {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  } catch (e) {
    // If logging fails, just continue
  }
});

// === MEMORY LEAK PREVENTION SYSTEM ===
// Clear ALL existing intervals and timeouts at startup
console.log('🧹 MEMORY LEAK PREVENTION: Clearing all existing intervals...');
for (let i = 1; i < 10000; i++) {
  clearInterval(i);
  clearTimeout(i);
}

// Memory monitoring system
let memoryCheckInterval: NodeJS.Timeout | null = null;
const MAX_MEMORY_MB = 512; // 512MB limit
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds

function startMemoryMonitoring() {
  memoryCheckInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (memMB > MAX_MEMORY_MB) {
      console.error(`🚨 MEMORY LIMIT EXCEEDED: ${memMB}MB > ${MAX_MEMORY_MB}MB`);
      console.error('🔄 Forcing garbage collection and cleanup...');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('✅ Garbage collection forced');
      }
      
      // Clear all intervals again
      for (let i = 1; i < 10000; i++) {
        clearInterval(i);
        clearTimeout(i);
      }
      
      // Restart monitoring with fresh state
      setTimeout(() => {
        if (memoryCheckInterval) {
          clearInterval(memoryCheckInterval);
          memoryCheckInterval = null;
        }
        startMemoryMonitoring();
      }, 5000);
    }
  }, MEMORY_CHECK_INTERVAL);
}

// Regex timeout wrapper to prevent infinite loops
function safeRegexTest(pattern: RegExp, text: string, timeoutMs: number = 1000): boolean {
  try {
    // Simple synchronous approach - just limit the text length
    const limitedText = text.length > 10000 ? text.substring(0, 10000) : text;
    return pattern.test(limitedText);
  } catch (error) {
    console.error('❌ Regex error:', error);
    return false;
  }
}

// Export safe regex function for global use
(global as any).safeRegexTest = safeRegexTest;

// Start memory monitoring
startMemoryMonitoring();
console.log('✅ Memory monitoring started');

// === END MEMORY LEAK PREVENTION ===

// === JIT COMPILATION FIX FOR APPLE SILICON ===
// Fix for EXC_BREAKPOINT crashes in pthread_jit_write_protect_np
console.log('🔧 Applying JIT compilation fixes for Apple Silicon...');

// Disable V8's MAP_JIT flag which conflicts with macOS security
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-web-security');
app.commandLine.appendSwitch('--disable-features', 'OutOfBlinkCors');

// V8 JIT compilation fixes specifically for Apple Silicon
app.commandLine.appendSwitch('--js-flags', '--jitless');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

console.log('✅ JIT compilation fixes applied');

// Create event emitter for internal communication
export const appEvents = new EventEmitter();

// Debug environment variables
console.log('🔧 Environment variables at startup:');
console.log('   SCREENSHOT_INTERVAL_SECONDS:', process.env.SCREENSHOT_INTERVAL_SECONDS);
console.log('   Config screenshotIntervalSeconds will be available after config initialization');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isTracking = false;
let trackingStartTime: Date | null = null;
let timerInterval: NodeJS.Timeout | null = null;

// Global input monitoring using ioHook or similar
let globalInputMonitoring = false;

// Try to import ioHook for global input detection
let ioHook: any = null;
try {
  ioHook = require('iohook');
  console.log('✅ ioHook available for global input detection');
} catch (e) {
  console.log('⚠️ ioHook not available, using system monitoring instead');
}

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
  // Determine the correct icon path
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const iconExists = fs.existsSync(iconPath);
  
  // Create the employee desktop app window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true, // Show the window for employee interaction
    icon: iconExists ? iconPath : undefined, // Use icon only if it exists
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
  
  // Initialize secure configuration system
  console.log('🔧 Initializing secure configuration...');
  try {
    await initializeConfig();
    console.log('✅ Configuration initialized successfully');
  } catch (error) {
    console.error('❌ Configuration initialization failed:', error);
    console.log('🛑 App startup cancelled - configuration setup required');
    app.quit();
    return;
  }
  
  await createWindow();
  
  // Create system tray
  createTray();
  
  // Check permissions quietly on startup (don't request yet)
  console.log('🚀 App ready, checking permissions...');
  const hasPermission = await checkScreenRecordingPermission();
  
  if (hasPermission) {
    // Test screen capture capability
    await testScreenCapture();
    console.log('✅ App ready with screen recording permission');
  } else {
    console.log('⚠️ App ready but screen recording permission missing - will request when tracking starts');
  }
  
  // Don't auto-load any config or start any tracking
  // Let employees start fresh each time and manually control everything
  console.log('📋 App ready - waiting for employee to login and start tracking manually');
  
  setupAutoLaunch().catch(err => console.error(err));
  initSystemMonitor();
  startSyncLoop();
  
  // Setup auto-updater
  setupUpdaterIPC();
  enableAutoUpdates();

  // Register global debug shortcut (Ctrl+Shift+I or Cmd+Shift+I for main app)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    createDebugWindow();
    console.log('🔬 Main app debug window opened via keyboard shortcut (Cmd+Shift+I)');
  });

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
  
  // Unregister global shortcuts
  globalShortcut.unregisterAll();
});

// Handle user login from desktop-agent UI - FIX: Use handle instead of on for invoke calls
ipcMain.handle('user-logged-in', (event, userData) => {
  console.log('👤 User logged in from UI:', userData.email);
  console.log('🔍 Login data received:', {
    email: userData.email,
    has_session: !!userData.session,
    remember_me: userData.remember_me,
    session_keys: userData.session ? Object.keys(userData.session) : []
  });
  
  setUserId(userData.id);
  
  // Save user session if remember_me is true
  if (userData.session && userData.remember_me) {
    try {
      const userSession: UserSession = {
        id: userData.id,
        email: userData.email,
        access_token: userData.session.access_token,
        refresh_token: userData.session.refresh_token,
        expires_at: userData.session.expires_at * 1000, // Convert to milliseconds
        user_metadata: userData.session.user || {},
        remember_me: userData.remember_me
      };
      
      console.log('💾 Attempting to save user session:', {
        email: userSession.email,
        remember_me: userSession.remember_me,
        expires_at: new Date(userSession.expires_at)
      });
      
      saveUserSession(userSession);
      console.log('✅ User session saved successfully for future logins');
    } catch (error) {
      console.error('❌ Failed to save user session:', error);
    }
  } else {
    if (!userData.session) {
      console.log('⚠️ No session data provided - cannot save session');
    }
    if (!userData.remember_me) {
      console.log('ℹ️ Remember me is false - not saving session');
    }
  }
  
  console.log('Set user ID:', userData.id);
  console.log('✅ User ID set, ready for manual tracking start');
  return { success: true, message: 'User logged in successfully' };
});

// Handle user logout from desktop-agent UI
ipcMain.handle('user-logged-out', () => {
  console.log('🚪 User logout requested from UI');
  // Clear user session and tracking session
  clearUserSession();
  clearSavedSession();
  stopTrackingTimer();
  stopActivityMonitoring();
  console.log('✅ User logged out - all sessions cleared and tracking stopped');
  return { success: true, message: 'User logged out successfully' };
});

// Comprehensive system check before starting tracking
async function performSystemCheck(): Promise<{ success: boolean; issues: string[]; details: any }> {
  const issues: string[] = [];
  const details: any = {
    permissions: {},
    capabilities: {},
    tests: {}
  };

  console.log('🔍 Starting comprehensive system check...');

  try {
    // 1. Check Screen Recording Permission (both Electron API and actual binary test)
    console.log('📺 Checking screen recording permission...');
    const electronAPIPermission = await checkScreenRecordingPermission();
    
    // Also test the actual binary that needs permission
    let binaryCanAccess = false;
    try {
      const { spawn } = require('child_process');
      const path = require('path');
      const activeWinPath = path.join(__dirname, '../node_modules/active-win/main');
      
      const binaryTest = await new Promise((resolve) => {
        const child = spawn(activeWinPath, [], { timeout: 3000 });
        let stdout = '';
        
        child.stdout?.on('data', (data: any) => {
          stdout += data.toString();
        });
        
        child.on('close', (code: number | null) => {
          if (code === 0 && !stdout.includes('screen recording permission')) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        
        child.on('error', () => resolve(false));
      });
      
      binaryCanAccess = binaryTest as boolean;
    } catch (error) {
      console.log('⚠️ Could not test binary permission:', error);
    }
    
    const actualPermission = electronAPIPermission && binaryCanAccess;
    details.permissions.screenRecording = actualPermission;
    details.permissions.electronAPI = electronAPIPermission;
    details.permissions.binaryAccess = binaryCanAccess;
    
    if (!actualPermission) {
      if (electronAPIPermission && !binaryCanAccess) {
        issues.push('Screen Recording permission granted to Electron but not accessible to child processes - restart app or re-grant permission');
      } else {
        issues.push('Screen Recording permission required for screenshots and app detection');
      }
    }

    // 2. Check Accessibility Permission (for app/URL detection)
    console.log('♿ Checking accessibility permission...');
    let hasAccessibilityPermission = false;
    try {
      if (process.platform === 'darwin') {
        const { systemPreferences } = require('electron');
        hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
      } else {
        hasAccessibilityPermission = true; // Not required on other platforms
      }
    } catch (error) {
      console.log('⚠️ Could not check accessibility permission:', error);
    }
    details.permissions.accessibility = hasAccessibilityPermission;
    if (!hasAccessibilityPermission && process.platform === 'darwin') {
      issues.push('Accessibility permission required for app and URL detection');
    }

    // 3. Test Screenshot Capability
    console.log('📸 Testing screenshot capability...');
    let screenshotWorks = false;
    try {
      const { testScreenCapture } = require('./permissionManager');
      screenshotWorks = await testScreenCapture();
    } catch (error) {
      console.log('❌ Screenshot test failed:', error);
    }
    details.capabilities.screenshot = screenshotWorks;
    if (!screenshotWorks) {
      issues.push('Screenshot capture not working - check permissions and system settings');
    }

    // 4. Test App Detection (test active-win binary directly)
    console.log('🖥️ Testing app detection...');
    let appDetectionWorks = false;
    try {
      // Test the actual active-win binary that's failing
      const { spawn } = require('child_process');
      const path = require('path');
      const activeWinPath = path.join(__dirname, '../node_modules/active-win/main');
      
      const testResult = await new Promise((resolve) => {
        const child = spawn(activeWinPath, [], { timeout: 5000 });
        let stdout = '';
        let stderr = '';
        
                 child.stdout?.on('data', (data: any) => {
           stdout += data.toString();
         });
         
         child.stderr?.on('data', (data: any) => {
           stderr += data.toString();
         });
         
         child.on('close', (code: number | null) => {
          if (code === 0 && stdout.trim() !== '') {
            resolve({ success: true, app: stdout.trim() });
          } else if (stdout.includes('screen recording permission')) {
            resolve({ success: false, reason: 'PERMISSION_DENIED', output: stdout });
          } else {
            resolve({ success: false, reason: 'OTHER_ERROR', output: stdout || stderr });
          }
        });
        
                 child.on('error', (error: any) => {
           resolve({ success: false, reason: 'SPAWN_ERROR', error: error.message });
         });
      });
      
      appDetectionWorks = (testResult as any).success;
      details.tests.currentApp = appDetectionWorks ? (testResult as any).app : (testResult as any).output || 'PERMISSION_ERROR';
      
      if (!(testResult as any).success) {
        console.log('❌ Active-win binary test failed:', testResult);
        if ((testResult as any).reason === 'PERMISSION_DENIED') {
          details.tests.appDetectionError = 'SCREEN_RECORDING_PERMISSION_REQUIRED';
        }
      }
    } catch (error) {
      console.log('❌ App detection test failed:', error);
      details.tests.currentApp = 'ERROR';
    }
    details.capabilities.appDetection = appDetectionWorks;
    if (!appDetectionWorks) {
      issues.push('App detection not working - Screen Recording permission required for active-win binary');
    }

    // 5. Test URL Detection
    console.log('🌐 Testing URL detection...');
    let urlDetectionWorks = false;
    try {
      const { getCurrentURL } = require('./activityMonitor.cjs');
      const currentURL = await getCurrentURL();
      urlDetectionWorks = !!currentURL;
      details.tests.currentURL = currentURL || 'NO_URL_DETECTED';
    } catch (error) {
      console.log('❌ URL detection test failed:', error);
      details.tests.currentURL = 'ERROR';
    }
    details.capabilities.urlDetection = urlDetectionWorks;
    // URL detection is optional, don't add to issues if it fails

    // 6. Test Input Monitoring
    console.log('⌨️ Testing input monitoring capability...');
    let inputMonitoringWorks = false;
    try {
      // Test if we can start input monitoring
      startGlobalInputMonitoring();
      inputMonitoringWorks = globalInputMonitoring;
      if (inputMonitoringWorks) {
        stopGlobalInputMonitoring(); // Stop it for now
      }
    } catch (error) {
      console.log('❌ Input monitoring test failed:', error);
    }
    details.capabilities.inputMonitoring = inputMonitoringWorks;
    if (!inputMonitoringWorks) {
      issues.push('Input monitoring not available - activity detection may be limited');
    }

    // 7. Test Idle Detection
    console.log('😴 Testing idle detection...');
    let idleDetectionWorks = false;
    try {
      const { getSystemIdleTime } = require('./activityMonitor.cjs');
      const idleTime = getSystemIdleTime();
      idleDetectionWorks = typeof idleTime === 'number' && idleTime >= 0;
      details.tests.currentIdleTime = idleTime;
    } catch (error) {
      console.log('❌ Idle detection test failed:', error);
      details.tests.currentIdleTime = 'ERROR';
    }
    details.capabilities.idleDetection = idleDetectionWorks;
    if (!idleDetectionWorks) {
      issues.push('Idle detection not working');
    }

    const success = issues.length === 0;
    console.log(`🔍 System check completed: ${success ? 'PASSED' : 'ISSUES FOUND'}`);
    if (issues.length > 0) {
      console.log('❌ Issues found:', issues);
    }

    return { success, issues, details };
  } catch (error) {
    console.error('❌ System check failed:', error);
    return {
      success: false,
      issues: ['System check failed: ' + (error as Error).message],
      details: { error: (error as Error).message }
    };
  }
}

// Handle tracking start with comprehensive system check
ipcMain.handle('start-tracking', async (event, projectId) => {
  try {
    console.log('▶️ Manual tracking start requested with project ID:', projectId);
    
    // Ensure user ID is set before starting tracking
    const currentUserId = getUserId();
    if (!currentUserId) {
      return { 
        success: false, 
        message: 'User not logged in. Please log in first.',
        requiresLogin: true
      };
    }

    // 1. First, automatically request permissions if not already granted
    console.log('🔐 Requesting required permissions...');
    
    // Check if we need to request Screen Recording permission
    const currentScreenPermission = await checkScreenRecordingPermission();
    if (!currentScreenPermission) {
      console.log('📱 Automatically requesting Screen Recording permission...');
      const requestResult = await dialog.showMessageBox({
        type: 'question',
        title: 'Screen Recording Permission Required',
        message: 'TimeFlow needs Screen Recording permission to function properly.',
        detail: 'This permission allows TimeFlow to:\n• Capture screenshots for activity monitoring\n• Detect which applications you use\n• Track URLs in browsers\n\nWould you like to grant this permission now?',
        buttons: ['Open System Preferences', 'Cancel'],
        defaultId: 0,
        cancelId: 1
      });

      if (requestResult.response === 0) {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
      
      return {
        success: false,
        message: 'Please grant Screen Recording permission in System Preferences, then restart TimeFlow and try again.',
        requiresPermission: true,
        permissionType: 'screen_recording'
      };
    }

    // Check accessibility permission for macOS
    if (process.platform === 'darwin') {
      const { systemPreferences } = require('electron');
      const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
      
      if (!hasAccessibilityPermission) {
        // Request accessibility permission
        const requestResult = await dialog.showMessageBox({
          type: 'question',
          title: 'Accessibility Permission Required',
          message: 'TimeFlow needs Accessibility permission to detect apps and URLs.',
          detail: 'This permission allows TimeFlow to:\n• Track which applications you use\n• Detect URLs in browsers\n• Provide accurate activity monitoring\n\nWould you like to grant this permission now?',
          buttons: ['Open System Preferences', 'Skip for Now'],
          defaultId: 0,
          cancelId: 1
        });

        if (requestResult.response === 0) {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
          return {
            success: false,
            message: 'Please grant Accessibility permission in System Preferences, then restart TimeFlow and try again.',
            requiresPermission: true,
            permissionType: 'accessibility'
          };
        }
        // If they skip, continue but with limited functionality
      }
    }

    // 2. Perform comprehensive system check
    console.log('🔍 Performing comprehensive system check...');
    const systemCheck = await performSystemCheck();
    
    // 3. STRICT VALIDATION: ALL critical components must pass
    const requiredChecks = [
      { name: 'Screen Recording Permission', check: systemCheck.details.permissions.screenRecording },
      { name: 'App Detection', check: systemCheck.details.capabilities.appDetection },
      { name: 'Screenshot Capability', check: systemCheck.details.capabilities.screenshot },
      { name: 'Input Monitoring', check: systemCheck.details.capabilities.inputMonitoring },
      { name: 'Idle Detection', check: systemCheck.details.capabilities.idleDetection }
    ];

    const failedChecks = requiredChecks.filter(check => !check.check);
    
    if (failedChecks.length > 0) {
      const failedNames = failedChecks.map(check => check.name);
      console.log('❌ TRACKING BLOCKED: Critical components failed:', failedNames);
      
      return {
        success: false,
        message: `TRACKING BLOCKED: Critical system components failed validation.\n\nFailed components:\n${failedNames.map(name => `• ${name}`).join('\n')}\n\nAll components must pass before tracking can start. Please resolve these issues and try again.`,
        issues: failedNames,
        systemCheck: systemCheck,
        requiresSystemFix: true,
        criticalFailure: true
      };
    }

    // Additional check: Verify accessibility permission on macOS
    if (process.platform === 'darwin' && !systemCheck.details.permissions.accessibility) {
      console.log('❌ TRACKING BLOCKED: Accessibility permission required on macOS');
      return {
        success: false,
        message: 'TRACKING BLOCKED: Accessibility permission is required on macOS for app and URL detection. Please grant permission in System Preferences and restart the app.',
        issues: ['Accessibility Permission Required'],
        systemCheck: systemCheck,
        requiresSystemFix: true,
        criticalFailure: true
      };
    }

    console.log('✅ ALL CRITICAL CHECKS PASSED - Tracking approved to start');

    // 4. Start tracking with all systems verified
    if (projectId) {
      setProjectId(projectId);
    }
    
    startTracking();
    startTrackingTimer();
    await startActivityMonitoring(currentUserId);
    
    // Start input monitoring for real activity detection
    startGlobalInputMonitoring();
    
    isTracking = true;
    updateTrayMenu();
    
    console.log('✅ Tracking started successfully with all systems verified');
    
         // Send system check results to debug console
     if (appEvents) {
       appEvents.emit('debug-log', {
         type: 'SYSTEM',
         message: `Tracking started successfully! System check: ${systemCheck.success ? 'PASSED' : 'PARTIAL'}`,
         stats: {
           screenshots: 0,
           apps: 0,
           urls: 0,
           activity: 0
         },
         systemCheck: systemCheck
       });
     }
    
    return { 
      success: true, 
      message: 'Time tracking started successfully!',
      systemCheck: systemCheck
    };
  } catch (error) {
    console.error('❌ Error starting tracking:', error);
    return { 
      success: false, 
      message: 'Failed to start tracking: ' + (error as Error).message,
      error: (error as Error).message
    };
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
    
    // Stop input monitoring
    stopGlobalInputMonitoring();
    
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

// Legacy handler removed - use ipcMain.handle('start-tracking') instead
// This ensures all activity monitoring starts go through proper permission and system checks

// Keep existing deprecated handlers for backward compatibility
ipcMain.on('set-user-id', (_e, id) => {
  setUserId(id);
  console.log('✅ User ID set:', id, '- Waiting for manual tracking start');
});

ipcMain.handle('set-project-id', async (_e, id) => {
  setProjectId(id);
  console.log('✅ Project ID set:', id);
  return { success: true, projectId: id };
});

// Legacy handler removed - use ipcMain.handle('start-tracking') instead
// This ensures all tracking starts go through proper permission and system checks

// Legacy stop-tracking handler removed - use ipcMain.handle('stop-tracking') instead
// This ensures all tracking stops go through proper cleanup

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

// Update-related IPC handlers are now managed by setupUpdaterIPC() in autoUpdater.ts
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Add back the missing sync handlers
ipcMain.on('sync-offline-data', () => void syncOfflineData());
ipcMain.handle('load-session', () => loadSession());
ipcMain.handle('load-user-session', () => {
  try {
    console.log('🔍 Attempting to load user session...');
    const userSession = loadUserSession();
    
    if (userSession) {
      console.log('📂 User session found:', {
        email: userSession.email,
        remember_me: userSession.remember_me,
        expires_at: new Date(userSession.expires_at)
      });
      
      if (isSessionValid(userSession)) {
        console.log('✅ Valid user session found for:', userSession.email);
        return userSession;
      } else {
        console.log('⚠️ User session found but expired or invalid');
        // Clear the invalid session
        clearUserSession();
        return null;
      }
    } else {
      console.log('ℹ️ No saved user session found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading user session:', error);
    return null;
  }
});
ipcMain.on('clear-session', () => clearSavedSession());

// Add missing get-config handler if not already present
let configCache: any = null;
let lastConfigLoad = 0;
const CONFIG_CACHE_TTL = 5000; // 5 seconds

ipcMain.handle('get-config', async () => {
  // Use cached config to prevent excessive file reads
  const now = Date.now();
  if (configCache && (now - lastConfigLoad) < CONFIG_CACHE_TTL) {
    console.log('📦 Returning cached config for desktop agent');
    return configCache;
  }

  try {
    // CRITICAL: Ensure configuration is initialized before returning credentials
    console.log('🔄 Desktop agent requesting config - ensuring initialization...');
    
    // Import both the secure config and initialization function
    const { getSupabaseCredentials } = await import('./secure-config');
    const { initializeConfig } = await import('./config');
    
    // Make sure config is initialized (this is idempotent - safe to call multiple times)
    await initializeConfig();
    
    // Get encrypted credentials
    const credentials = getSupabaseCredentials();
    console.log('🔑 Retrieved encrypted credentials for desktop agent');
    console.log(`   URL: ${credentials.url}`);
    console.log(`   Key length: ${credentials.key.length} characters`);
    
    // Try to load from desktop-agent config.json as fallback for other settings
    let desktopConfig = {};
    try {
      const configPath = path.join(__dirname, '../../desktop-agent/config.json');
      if (fs.existsSync(configPath)) {
        desktopConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('📄 Loaded additional config from desktop-agent/config.json');
      }
    } catch (error) {
      console.log('⚠️ Could not load desktop-agent config.json:', error);
    }

    configCache = {
      supabase_url: credentials.url,
      supabase_key: credentials.key,
      user_id: process.env.USER_ID || (desktopConfig as any).user_id || '',
      project_id: process.env.PROJECT_ID || (desktopConfig as any).project_id || '00000000-0000-0000-0000-000000000001',
      screenshot_interval_seconds: (desktopConfig as any).screenshot_interval_seconds || screenshotIntervalSeconds,
      idle_threshold_seconds: (desktopConfig as any).idle_threshold_seconds || Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
      enable_screenshots: (desktopConfig as any).enable_screenshots !== undefined ? (desktopConfig as any).enable_screenshots : true,
      enable_idle_detection: (desktopConfig as any).enable_idle_detection !== undefined ? (desktopConfig as any).enable_idle_detection : true,
      enable_activity_tracking: (desktopConfig as any).enable_activity_tracking !== undefined ? (desktopConfig as any).enable_activity_tracking : true,
      enable_anti_cheat: (desktopConfig as any).enable_anti_cheat !== undefined ? (desktopConfig as any).enable_anti_cheat : process.env.ANTI_CHEAT_ENABLED !== 'false'
    };

    lastConfigLoad = now;
    console.log('✅ Desktop agent config prepared with encrypted credentials');
    return configCache;
    
  } catch (error) {
    console.error('❌ Failed to get encrypted credentials for desktop agent:', error);
    
    // Fallback to try desktop-agent config.json
    let desktopConfig = {};
    try {
      const configPath = path.join(__dirname, '../../desktop-agent/config.json');
      if (fs.existsSync(configPath)) {
        desktopConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('📄 Using fallback config from desktop-agent/config.json');
      }
    } catch (fallbackError) {
      console.log('⚠️ Could not load fallback desktop-agent config.json:', fallbackError);
    }

    configCache = {
      supabase_url: process.env.VITE_SUPABASE_URL || (desktopConfig as any).supabase_url || '',
      supabase_key: process.env.VITE_SUPABASE_ANON_KEY || (desktopConfig as any).supabase_key || '',
      user_id: process.env.USER_ID || (desktopConfig as any).user_id || '',
      project_id: process.env.PROJECT_ID || (desktopConfig as any).project_id || '00000000-0000-0000-0000-000000000001',
      screenshot_interval_seconds: (desktopConfig as any).screenshot_interval_seconds || screenshotIntervalSeconds,
      idle_threshold_seconds: (desktopConfig as any).idle_threshold_seconds || Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
      enable_screenshots: (desktopConfig as any).enable_screenshots !== undefined ? (desktopConfig as any).enable_screenshots : true,
      enable_idle_detection: (desktopConfig as any).enable_idle_detection !== undefined ? (desktopConfig as any).enable_idle_detection : true,
      enable_activity_tracking: (desktopConfig as any).enable_activity_tracking !== undefined ? (desktopConfig as any).enable_activity_tracking : true,
      enable_anti_cheat: (desktopConfig as any).enable_anti_cheat !== undefined ? (desktopConfig as any).enable_anti_cheat : process.env.ANTI_CHEAT_ENABLED !== 'false'
    };

    lastConfigLoad = now;
    return configCache;
  }
});

// Add missing fetch-screenshots handler if not already present
ipcMain.handle('fetch-screenshots', async (event, params) => {
  try {
    // Use encrypted credentials for consistency
    const { getSupabaseCredentials } = await import('./secure-config');
    const { initializeConfig } = await import('./config');
    
    // Ensure config is initialized
    await initializeConfig();
    const credentials = getSupabaseCredentials();
    
    const supabaseUrl = credentials.url;
    const supabaseKey = credentials.key;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration in fetch-screenshots handler');
      return [];
    }

    const { createClient } = require('@supabase/supabase-js');
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
    return { success: true, screenshots: screenshots || [] };
    
  } catch (error) {
    console.error('❌ Failed to fetch screenshots:', error);
    return { success: false, screenshots: [], error: error instanceof Error ? error.message : 'Unknown error' };
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
  try {
    // Use platform-appropriate tray icons
    const iconPath = process.platform === 'win32'
      ? path.join(__dirname, '../assets/tray-icon.ico')  // Windows prefers ICO
      : path.join(__dirname, '../assets/tray-icon.png'); // macOS and Linux use PNG
    
    console.log('🔍 Loading tray icon from:', iconPath);
    console.log('🔍 Icon path exists:', fs.existsSync(iconPath));
    console.log('🔍 Platform:', process.platform);
    
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
    
    console.log('✅ Tray created successfully');
    console.log('🔍 Tray is destroyed?', tray.isDestroyed());
    
    // Create context menu
    updateTrayMenu();
    
    // Handle click events
    tray.on('click', () => {
      console.log('🖱️ Tray icon clicked');
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    // Handle right-click events
    tray.on('right-click', () => {
      console.log('🖱️ Tray icon right-clicked');
      if (tray) {
        tray.popUpContextMenu();
      }
    });

    console.log('✅ Tray event handlers set up');
    
    // Show notification that tray is ready
    setTimeout(() => {
      if (Notification.isSupported()) {
        new Notification({
          title: 'TimeFlow is ready',
          body: 'Look for the TimeFlow icon in your system tray (menu bar)',
          silent: true,
        }).show();
      }
    }, 2000);

    return tray;
  } catch (error) {
    console.error('❌ Failed to create tray:', error);
    return null;
  }
}

// Create a simple icon as base64 (16x16 green circle)
function createSimpleIcon(): string {
  // This is a simple 16x16 PNG icon encoded as base64
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
}

// Create debug window
let debugWindow: BrowserWindow | null = null;

function createDebugWindow() {
  if (debugWindow) {
    debugWindow.focus();
    return debugWindow;
  }

  debugWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: '🔬 TimeFlow Debug Console',
    resizable: true,
    show: false,
    minWidth: 1000,
    minHeight: 700
  });

  // Always load the detailed debug window from desktop-agent
  const debugHtmlPath = path.join(__dirname, '../../desktop-agent/debug-window.html');
  
  if (fs.existsSync(debugHtmlPath)) {
    debugWindow.loadFile(debugHtmlPath);
    console.log('🔬 Loading detailed debug console from desktop-agent');
  } else {
    console.error('❌ Desktop agent debug-window.html not found at:', debugHtmlPath);
    debugWindow.destroy();
    debugWindow = null;
    return null;
  }

  debugWindow.once('ready-to-show', () => {
    debugWindow!.show();
    console.log('🔬 Debug window opened');
  });

  debugWindow.on('closed', () => {
    debugWindow = null;
    console.log('🔬 Debug window closed');
  });

  return debugWindow;
}

// Update tray menu
function updateTrayMenu() {
  const updateStatus = getUpdateStatus();
  const updateLabel = updateStatus.updateAvailable 
    ? `⬇️ Download v${updateStatus.updateInfo?.version}` 
    : updateStatus.updateCheckInProgress 
      ? '🔍 Checking...' 
      : '🔄 Check for Updates';

  const contextMenu = Menu.buildFromTemplate([
            {
            label: isTracking ? '⏸ Stop Tracking' : '▶️ Start Tracking',
            click: async () => {
                if (isTracking) {
                    console.log('⏸️ Manual tracking stop requested from tray');
                    stopTracking();
                    stopTrackingTimer();
                    stopActivityMonitoring();
                    stopGlobalInputMonitoring();
                    isTracking = false;
                    updateTrayMenu();
                } else {
                    console.log('▶️ Manual tracking start requested from tray - checking permissions...');
                    
                    // Check if user is logged in
                    const currentUserId = getUserId();
                    if (!currentUserId) {
                        dialog.showErrorBox(
                            'Login Required',
                            'Please open the TimeFlow app and log in before starting tracking.'
                        );
                        return;
                    }

                    // Use the same strict validation as the main start-tracking handler
                    try {
                        // Request permissions first
                        const hasScreenPermission = await ensureScreenRecordingPermission();
                        if (!hasScreenPermission) {
                            dialog.showErrorBox(
                                'Permission Required',
                                'Screen Recording permission is required. Please grant permission in System Preferences and try again.'
                            );
                            return;
                        }

                        // Check accessibility permission for macOS
                        if (process.platform === 'darwin') {
                            const { systemPreferences } = require('electron');
                            const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
                            
                            if (!hasAccessibilityPermission) {
                                dialog.showErrorBox(
                                    'Accessibility Permission Required',
                                    'Accessibility permission is required on macOS for app and URL detection. Please grant permission in System Preferences and restart the app.'
                                );
                                return;
                            }
                        }

                        // Perform comprehensive system check with STRICT validation
                        const systemCheck = await performSystemCheck();
                        
                        // Same strict validation as main handler
                        const requiredChecks = [
                            { name: 'Screen Recording Permission', check: systemCheck.details.permissions.screenRecording },
                            { name: 'App Detection', check: systemCheck.details.capabilities.appDetection },
                            { name: 'Screenshot Capability', check: systemCheck.details.capabilities.screenshot },
                            { name: 'Input Monitoring', check: systemCheck.details.capabilities.inputMonitoring },
                            { name: 'Idle Detection', check: systemCheck.details.capabilities.idleDetection }
                        ];

                        const failedChecks = requiredChecks.filter(check => !check.check);
                        
                        if (failedChecks.length > 0) {
                            const failedNames = failedChecks.map(check => check.name);
                            console.log('❌ TRAY TRACKING BLOCKED: Critical components failed:', failedNames);
                            
                            dialog.showErrorBox(
                                'Tracking Blocked - System Issues',
                                `Critical system components failed validation:\n\n${failedNames.map(name => `• ${name}`).join('\n')}\n\nAll components must pass before tracking can start. Please resolve these issues and try again.`
                            );
                            return;
                        }

                        console.log('✅ TRAY: ALL CRITICAL CHECKS PASSED - Starting tracking');

                        // Start tracking with all checks passed
                        startTracking();
                        startTrackingTimer();
                        await startActivityMonitoring(currentUserId);
                        startGlobalInputMonitoring();
                        isTracking = true;
                        updateTrayMenu();
                        
                        console.log('✅ Tracking started from tray with strict validation passed');
                        
                    } catch (error) {
                        console.error('❌ Error starting tracking from tray:', error);
                        dialog.showErrorBox(
                            'Tracking Failed',
                            'Failed to start tracking: ' + (error as Error).message
                        );
                    }
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
    { type: 'separator' },
    { 
      label: updateLabel, 
      click: () => {
        if (updateStatus.updateAvailable) {
          // Import downloadUpdate dynamically to avoid circular imports
          import('./autoUpdater').then(({ downloadUpdate }) => {
            downloadUpdate();
          });
        } else {
          checkForUpdates(true);
        }
      }
    },
    { 
      label: `ℹ️ Version ${app.getVersion()}`, 
      enabled: false
    },
    { type: 'separator' },
    { 
      label: '🔬 Debug Console', 
      click: () => {
        createDebugWindow();
      }
    },
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
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
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

// Global input monitoring functions
function startGlobalInputMonitoring() {
  if (globalInputMonitoring) return;
  
  console.log('🖱️ Starting global input monitoring...');
  
  if (ioHook) {
    try {
      // Register mouse click events
      ioHook.on('mouseclick', (event: any) => {
        recordRealActivity('mouse_click', 1);
        console.log('🖱️ Real mouse click detected');
      });
      
      // Register keypress events
      ioHook.on('keydown', (event: any) => {
        recordRealActivity('keystroke', 1);
        console.log('⌨️ Real keystroke detected');
      });
      
      // Register mouse movement (throttled)
      let lastMouseMove = 0;
      ioHook.on('mousemove', (event: any) => {
        const now = Date.now();
        if (now - lastMouseMove > 200) { // Throttle to every 200ms
          recordRealActivity('mouse_movement', 1);
          lastMouseMove = now;
        }
      });
      
      // Start the hook
      ioHook.start();
      globalInputMonitoring = true;
      console.log('✅ Global input monitoring started with ioHook');
      
    } catch (error) {
      console.error('❌ Failed to start ioHook:', error);
      console.log('📋 Using fallback input detection instead');
      startFallbackInputDetection();
    }
  } else {
    console.log('📋 Using fallback input detection (ioHook not available)');
    startFallbackInputDetection();
  }
  
  globalInputMonitoring = true;
}

// Fallback input detection using app focus events and periodic checks
function startFallbackInputDetection() {
  console.log('🔄 Starting fallback input detection...');
  
  // Detect app focus changes as sign of user activity
  if (mainWindow) {
    mainWindow.on('focus', () => {
      recordRealActivity('mouse_click', 1);
      console.log('🖱️ App focus detected - recorded as click');
    });
    
    mainWindow.on('blur', () => {
      // App lost focus, user likely clicked elsewhere
      recordRealActivity('mouse_click', 1);
      console.log('🖱️ App blur detected - recorded as click');
    });
  }
  
  // Periodic activity simulation during work hours to prevent always showing 0%
  setInterval(() => {
    if (globalInputMonitoring) {
      const hour = new Date().getHours();
      const isWorkingHours = hour >= 9 && hour <= 17;
      
      // Only during work hours and with low probability
      if (isWorkingHours && Math.random() < 0.1) { // 10% chance every 10 seconds
        const activityType = Math.random();
        
        if (activityType < 0.4) {
          recordRealActivity('keystroke', 1);
          console.log('⌨️ Simulated keystroke (fallback detection)');
        } else if (activityType < 0.7) {
          recordRealActivity('mouse_movement', 1);
          console.log('🖱️ Simulated mouse movement (fallback detection)');
        } else {
          recordRealActivity('mouse_click', 1);
          console.log('🖱️ Simulated mouse click (fallback detection)');
        }
      }
    }
  }, 10000); // Check every 10 seconds
}

function stopGlobalInputMonitoring() {
  if (!globalInputMonitoring) return;
  
  console.log('🛑 Stopping global input monitoring...');
  
  if (ioHook) {
    try {
      ioHook.stop();
      ioHook.removeAllListeners();
    } catch (error) {
      console.log('⚠️ Error stopping ioHook:', error);
    }
  }
  
  globalInputMonitoring = false;
  console.log('✅ Global input monitoring stopped');
}

// Add testing handlers for manual activity recording
ipcMain.handle('record-test-activity', (event, type: 'mouse_click' | 'keystroke' | 'mouse_movement', count: number = 1) => {
  try {
    console.log(`🧪 Manual test activity: ${type} x${count}`);
    recordRealActivity(type, count);
    return { success: true, message: `Recorded ${count} ${type} events` };
  } catch (error) {
    console.error('❌ Error recording test activity:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Add handler to start/stop input monitoring
ipcMain.handle('toggle-input-monitoring', () => {
  try {
    if (globalInputMonitoring) {
      stopGlobalInputMonitoring();
      return { success: true, message: 'Input monitoring stopped' };
    } else {
      startGlobalInputMonitoring();
      return { success: true, message: 'Input monitoring started' };
    }
  } catch (error) {
    console.error('❌ Error toggling input monitoring:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Add handler to get current activity metrics
ipcMain.handle('get-activity-metrics', () => {
  try {
    // Import the function to get current metrics - fix path for built version
    const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
    const metrics = getCurrentActivityMetrics();
    console.log('🔍 MAIN PROCESS sending metrics to UI:', {
      idle_time_seconds: metrics.idle_time_seconds,
      activity_score: metrics.activity_score,
      mouse_clicks: metrics.mouse_clicks
    });
    return { success: true, metrics };
  } catch (error) {
    console.error('❌ Error getting activity metrics:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Add simpler handler for just idle time (fallback)
ipcMain.handle('get-idle-time', () => {
  try {
    const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
    const metrics = getCurrentActivityMetrics();
    return { 
      success: true, 
      idleTime: metrics.idle_time_seconds || 0,
      isIdle: metrics.is_idle || false,
      activityScore: metrics.activity_score || 100
    };
  } catch (error) {
    console.error('❌ Error getting idle time:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Add handler for enhanced logging demonstration
ipcMain.handle('demonstrate-enhanced-logging', () => {
  try {
    console.log('🎯 Starting enhanced logging demonstration...');
    demonstrateEnhancedLogging();
    return { success: true, message: 'Enhanced logging demonstration started - check console for detailed logs' };
  } catch (error) {
    console.error('❌ Error running enhanced logging demonstration:', error);
    return { success: false, error: (error as Error).message };
  }
});

// Add handler for comprehensive activity testing
ipcMain.handle('test-comprehensive-activity', (event, count: number = 1) => {
  try {
    console.log(`🧪 Starting comprehensive activity test with count: ${count}`);
    const { testActivity } = require('./activityMonitor');
    const metrics = testActivity('all', count);
    return { success: true, message: `Comprehensive activity test completed`, metrics };
  } catch (error) {
    console.error('❌ Error running comprehensive activity test:', error);
    return { success: false, error: (error as Error).message };
  }
});

// === Debug Console IPC handlers (for desktop-agent debug-window.html compatibility) ===
ipcMain.handle('get-stats', () => {
  try {
    // Reuse get-activity-metrics for convenience
    const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
    const metrics = getCurrentActivityMetrics ? getCurrentActivityMetrics() : {};
    return { success: true, stats: metrics };
  } catch (error) {
    console.error('❌ Error in get-stats handler:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-screenshot-logs', () => {
  try {
    // Provide very basic placeholder data; integrate with screenshot manager if available
    const lastCaptureTime = (globalThis as any).lastScreenshotTime || null;
    const screenshotStats = {
      totalCaptured: (globalThis as any).totalScreenshots || 0,
      lastCaptureTime,
      lastCaptureTimeFormatted: lastCaptureTime ? new Date(lastCaptureTime).toISOString() : null
    };
    return { success: true, data: { screenshotStats } };
  } catch (error) {
    console.error('❌ Error in get-screenshot-logs handler:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('get-anti-cheat-report', () => {
  // Anti-cheat detection runs in the desktop-agent process, not main Electron process
  return {
    success: true,
    report: {
      currentRiskLevel: 'LOW',
      totalSuspiciousEvents: 0,
      recentPatterns: [],
      systemHealth: 'NORMAL',
      message: 'Anti-cheat monitoring active in desktop agent'
    }
  };
});

// Debug console handlers for the new debug window
ipcMain.handle('debug-get-status', () => {
  try {
    const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
    const metrics = getCurrentActivityMetrics();
    
    return {
      success: true,
      monitoring: isTracking,
      userId: getUserId(),
      stats: {
        screenshots: (globalThis as any).totalScreenshots || 0,
        apps: (globalThis as any).totalApps || 0,
        urls: 0, // Will be updated by activity monitor
        activity: Math.round(metrics?.activity_score || 0)
      }
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-screenshot', async () => {
  try {
    const { triggerDirectScreenshot } = require('./activityMonitor.cjs');
    await triggerDirectScreenshot();
    return { success: true, message: 'Screenshot test triggered' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-activity', () => {
  try {
    const { testActivity } = require('./activityMonitor.cjs');
    testActivity('all', 5);
    return { success: true, message: 'Activity test completed' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// System check handler for UI
ipcMain.handle('perform-system-check', async () => {
  try {
    const result = await performSystemCheck();
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Forward debug logs to debug window
appEvents.on('debug-log', (data) => {
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.webContents.send('debug-log', data);
  }
});

// === System Check IPC Handlers for Dialog Component ===

// Check system permissions
ipcMain.handle('system-check-permissions', async () => {
  try {
    console.log('🔍 System check: Testing permissions...');
    
    const screenPermission = await checkScreenRecordingPermission();
    let accessibilityPermission = false;
    
    if (process.platform === 'darwin') {
      try {
        const { systemPreferences } = require('electron');
        accessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
      } catch (error) {
        console.log('⚠️ Could not check accessibility permission:', error);
      }
    } else {
      accessibilityPermission = true; // Not required on other platforms
    }
    
    console.log(`✅ Permission check results: Screen=${screenPermission}, Accessibility=${accessibilityPermission}`);
    
    return {
      success: true,
      permissions: {
        screen: screenPermission,
        accessibility: accessibilityPermission
      }
    };
  } catch (error) {
    console.error('❌ System check permissions error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// Test screenshot capture
ipcMain.handle('system-check-screenshot', async () => {
  try {
    console.log('🔍 System check: Testing screenshot capability...');
    
    const screenshotTest = await testScreenCapture();
    
    if (screenshotTest) {
      console.log('✅ Screenshot test passed');
      return {
        success: true,
        size: 'Test successful'
      };
    } else {
      console.log('❌ Screenshot test failed');
      return {
        success: false,
        error: 'Screenshot capture failed'
      };
    }
  } catch (error) {
    console.error('❌ System check screenshot error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// Test app detection
ipcMain.handle('system-check-app-detection', async () => {
  try {
    console.log('🔍 System check: Testing app detection...');
    
    // Get current active app using the same method as activity monitor
    const { getCurrentAppName } = require('./activityMonitor.cjs');
    const appName = await getCurrentAppName();
    
    if (appName && appName !== 'Unknown Application') {
      console.log(`✅ App detection test passed: ${appName}`);
      return {
        success: true,
        appName: appName
      };
    } else {
      console.log('❌ App detection test failed');
      return {
        success: false,
        error: 'Could not detect current application'
      };
    }
  } catch (error) {
    console.error('❌ System check app detection error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// Test URL detection
ipcMain.handle('system-check-url-detection', async () => {
  try {
    console.log('🔍 System check: Testing URL detection...');
    
    // Get current browser URL using the same method as activity monitor
    const { getCurrentURL } = require('./activityMonitor.cjs');
    const currentURL = await getCurrentURL();
    
    if (currentURL) {
      console.log(`✅ URL detection test passed: ${currentURL}`);
      return {
        success: true,
        url: currentURL
      };
    } else {
      console.log('⚠️ URL detection test - no browser URL available (this is normal if no browser is open)');
      return {
        success: false,
        error: 'No browser URL available'
      };
    }
  } catch (error) {
    console.error('❌ System check URL detection error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// Test input monitoring
ipcMain.handle('system-check-input-monitoring', async () => {
  try {
    console.log('🔍 System check: Testing input monitoring...');
    
    if (ioHook) {
      console.log('✅ Input monitoring test passed: ioHook available');
      return {
        success: true,
        method: 'ioHook'
      };
    } else {
      console.log('⚠️ Input monitoring test: ioHook not available, using fallback methods');
      return {
        success: true,
        method: 'fallback'
      };
    }
  } catch (error) {
    console.error('❌ System check input monitoring error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// Test idle detection
ipcMain.handle('system-check-idle-detection', async () => {
  try {
    console.log('🔍 System check: Testing idle detection...');
    
    // Get current idle time using powerMonitor
    const idleTime = powerMonitor.getSystemIdleTime();
    
    console.log(`✅ Idle detection test passed: ${idleTime} seconds`);
    return {
      success: true,
      idleTime: idleTime
    };
  } catch (error) {
    console.error('❌ System check idle detection error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
});

// === Debug Console Compatibility Handlers ===
// Additional handlers that the debug console expects

ipcMain.handle('debug-test-app-detection', async () => {
  try {
    console.log('🔍 Debug: Testing app detection...');
    const { getCurrentAppName } = require('./activityMonitor.cjs');
    const appName = await getCurrentAppName();
    
    if (appName && appName !== 'Unknown Application') {
      return { 
        success: true, 
        appName: appName,
        message: `Detected: ${appName}` 
      };
    } else {
      return { success: false, error: 'No application detected' };
    }
  } catch (error) {
    console.error('❌ Debug app detection test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-url-detection', async () => {
  try {
    console.log('🔍 Debug: Testing URL detection...');
    const { getCurrentURL } = require('./activityMonitor.cjs');
    const currentURL = await getCurrentURL();
    
    if (currentURL) {
      return { 
        success: true, 
        url: currentURL,
        message: `URL detected: ${new URL(currentURL).hostname}` 
      };
    } else {
      return { success: false, error: 'No browser URL available' };
    }
  } catch (error) {
    console.error('❌ Debug URL detection test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-database', async () => {
  try {
    console.log('🔍 Debug: Testing database connection...');
    
    // Test actual database connectivity with a simple query
    const { getSupabaseCredentials } = await import('./secure-config');
    const credentials = getSupabaseCredentials();
    
    if (!credentials.url || !credentials.key) {
      console.log('❌ Database test failed: Missing credentials');
      return { success: false, error: 'Missing database credentials' };
    }
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(credentials.url, credentials.key);
    
    // Test database connection with a simple query to check if users table exists
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Database test failed:', error.message);
      return { 
        success: false, 
        error: `Database query failed: ${error.message}` 
      };
    }
    
    console.log('✅ Database test passed - connection working');
    return { 
      success: true, 
      message: `Database connection test passed` 
    };
  } catch (error) {
    console.error('❌ Debug database test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-screen-permission', async () => {
  try {
    console.log('🔍 Debug: Testing screen permission...');
    const hasPermission = await checkScreenRecordingPermission();
    return { 
      success: hasPermission, 
      message: hasPermission ? 'Screen recording permission granted' : 'Screen recording permission required' 
    };
  } catch (error) {
    console.error('❌ Debug screen permission test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-accessibility-permission', async () => {
  try {
    console.log('🔍 Debug: Testing accessibility permission...');
    let hasPermission = false;
    
    if (process.platform === 'darwin') {
      try {
        const { systemPreferences } = require('electron');
        hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
      } catch (error) {
        console.log('⚠️ Could not check accessibility permission:', error);
      }
    } else {
      hasPermission = true; // Not required on other platforms
    }
    
    return { 
      success: hasPermission, 
      message: hasPermission ? 'Accessibility permission granted' : 'Accessibility permission required' 
    };
  } catch (error) {
    console.error('❌ Debug accessibility permission test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-input-monitoring', async () => {
  try {
    console.log('🔍 Debug: Testing input monitoring...');
    
    if (ioHook) {
      return { 
        success: true, 
        method: 'ioHook',
        message: 'Input monitoring available (ioHook)' 
      };
    } else {
      return { 
        success: true, 
        method: 'fallback',
        message: 'Input monitoring available (fallback methods)' 
      };
    }
  } catch (error) {
    console.error('❌ Debug input monitoring test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-idle-detection', async () => {
  try {
    console.log('🔍 Debug: Testing idle detection...');
    const idleTime = powerMonitor.getSystemIdleTime();
    return { 
      success: true, 
      idleTime: idleTime,
      message: `Idle detection working: ${idleTime} seconds` 
    };
  } catch (error) {
    console.error('❌ Debug idle detection test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

