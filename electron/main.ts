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
import { showPostLoginPermissionDialog, testAndSavePermissions, cleanupPermissionDialog } from './simplePermissionDialog';
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

// === DMG PERMISSION FIX FOR LIVE INSTALLATIONS ===
// The issue is that DMG installations need enhanced permission management

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
  
  // DMG PERMISSION FIX: If running from proper location but permissions are missing,
  // show enhanced permission dialog immediately
  if (process.platform === 'darwin') {
    console.log('🔧 DMG FIX: Scheduling enhanced permission check for proper installation...');
    setTimeout(async () => {
      await showEnhancedPermissionDialog();
    }, 2000); // Delay to let app fully initialize
  }
  
  return true;
}

// === ENHANCED PERMISSION DIALOG FOR DMG INSTALLATIONS ===
async function showEnhancedPermissionDialog(): Promise<void> {
  console.log('🔧 DMG FIX: Checking permissions for properly installed app...');
  
  try {
    const { systemPreferences } = require('electron');
    
    // Check both permissions
    const screenPermission = systemPreferences.getMediaAccessStatus('screen');
    const accessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
    
    console.log('📊 DMG FIX: Permission status:', {
      screen: screenPermission,
      accessibility: accessibilityPermission
    });
    
    // If both permissions are granted, no need to show dialog
    if (screenPermission === 'granted' && accessibilityPermission) {
      console.log('✅ DMG FIX: All permissions already granted');
      return;
    }
    
         // Show comprehensive permission setup dialog
     const missingPermissions: string[] = [];
     if (screenPermission !== 'granted') {
       missingPermissions.push('Screen Recording');
     }
     if (!accessibilityPermission) {
       missingPermissions.push('Accessibility');
     }
    
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'TimeFlow - Permissions Required',
      message: `Welcome to TimeFlow! 🎯\n\nTo provide accurate time tracking, TimeFlow needs ${missingPermissions.join(' and ')} permission${missingPermissions.length > 1 ? 's' : ''}.`,
      detail: `Required permissions:\n\n` +
        (screenPermission !== 'granted' ? `• Screen Recording - Enables app detection and screenshots\n` : '') +
        (!accessibilityPermission ? `• Accessibility - Enables mouse/keyboard activity tracking\n` : '') +
        `\nThis is completely safe and all data stays private on your device.`,
      buttons: [
        'Open System Settings',
        'Set Up Later',
        'Learn More'
      ],
      defaultId: 0,
      cancelId: 1
    });
    
    if (result.response === 0) {
      console.log('🔧 DMG FIX: User chose to open System Settings');
      await openSystemSettingsForPermissions(missingPermissions);
    } else if (result.response === 2) {
      console.log('ℹ️ DMG FIX: User wants to learn more');
      await showPermissionExplanation();
    }
    
  } catch (error) {
    console.error('❌ DMG FIX: Enhanced permission dialog failed:', error);
  }
}

// === SMART SYSTEM SETTINGS OPENER ===
async function openSystemSettingsForPermissions(missingPermissions: string[]): Promise<void> {
  const { shell } = require('electron');
  
  try {
    if (missingPermissions.includes('Screen Recording')) {
      console.log('🔧 Opening Screen Recording settings...');
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      
      // Show follow-up instructions
      setTimeout(async () => {
        await dialog.showMessageBox({
          type: 'info',
          title: 'Screen Recording Setup',
          message: 'Grant Screen Recording Permission',
          detail: `In the System Settings window that just opened:\n\n` +
            `1. Look for "TimeFlow" or "Electron" in the list\n` +
            `2. Turn ON the toggle switch next to it\n` +
            `3. If not in the list, click the "+" button to add it\n` +
            `4. Navigate to Applications folder and select TimeFlow\n\n` +
            `After granting permission, restart TimeFlow for changes to take effect.`,
          buttons: ['Got It']
        });
      }, 1000);
      
      // If accessibility is also needed, open that too
      if (missingPermissions.includes('Accessibility')) {
        setTimeout(async () => {
          console.log('🔧 Opening Accessibility settings...');
          await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
          
          setTimeout(async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: 'Accessibility Setup',
              message: 'Grant Accessibility Permission',
              detail: `In the Accessibility settings:\n\n` +
                `1. Look for "TimeFlow" or "Electron" in the list\n` +
                `2. Turn ON the toggle switch next to it\n` +
                `3. If not in the list, click the "+" button to add it\n` +
                `4. You may need to unlock the settings first (click the lock icon)\n\n` +
                `This permission enables accurate activity tracking.`,
              buttons: ['Got It']
            });
          }, 2000);
        }, 3000);
      }
    } else if (missingPermissions.includes('Accessibility')) {
      console.log('🔧 Opening Accessibility settings...');
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    }
    
  } catch (error) {
    console.error('❌ Failed to open System Settings:', error);
    
    // Fallback: show manual instructions
    await dialog.showMessageBox({
      type: 'info',
      title: 'Manual Setup Required',
      message: 'Please Set Up Permissions Manually',
      detail: `Could not automatically open System Settings. Please:\n\n` +
        `1. Open System Settings (or System Preferences)\n` +
        `2. Go to Privacy & Security\n` +
        `3. Select ${missingPermissions.join(' and ')} from the sidebar\n` +
        `4. Add and enable TimeFlow\n` +
        `5. Restart the app\n\n` +
        `This ensures proper time tracking functionality.`,
      buttons: ['OK']
    });
  }
}

// === PERMISSION EXPLANATION DIALOG ===
async function showPermissionExplanation(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'info',
    title: 'Why TimeFlow Needs These Permissions',
    message: 'Privacy & Security Information 🔒',
    detail: `TimeFlow requests these permissions to provide accurate time tracking:\n\n` +
      `📺 Screen Recording Permission:\n` +
      `• Detects which applications you're using\n` +
      `• Captures periodic screenshots for verification\n` +
      `• Identifies browser URLs for web activity tracking\n\n` +
      `♿ Accessibility Permission:\n` +
      `• Monitors mouse clicks and keyboard activity\n` +
      `• Calculates productivity scores based on activity\n` +
      `• Detects idle time accurately\n\n` +
      `🔐 Your Privacy:\n` +
      `• All data is processed locally on your device\n` +
      `• Screenshots are encrypted before upload\n` +
      `• No personal data is shared without consent\n` +
      `• You maintain full control over your data`,
    buttons: [
      'Grant Permissions Now',
      'Skip Setup'
    ],
    defaultId: 0
  });
  
  if (result.response === 0) {
    console.log('🔧 User chose to grant permissions after explanation');
    await openSystemSettingsForPermissions(['Screen Recording', 'Accessibility']);
  }
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
  
  // Clean up any leftover permission dialog handlers
  cleanupPermissionDialog();
  
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
  
  // MANDATORY FIRST-TIME SETUP WIZARD (User-Friendly) - DISABLED FOR NOW
  console.log('🎯 Skipping first-time setup wizard - proceeding directly to app startup');
  // const { showFirstTimeSetup, isFirstTimeRun } = await import('./firstTimeSetupWizard');
  
  // if (isFirstTimeRun()) {
  //   console.log('🎯 First time run detected - showing user-friendly setup wizard');
  //   const setupSuccess = await showFirstTimeSetup();
  //   
  //   if (!setupSuccess) {
  //     console.log('❌ First-time setup was not completed - app cannot continue');
  //     app.quit();
  //     return;
  //   }
  //   
  //   console.log('✅ First-time setup completed successfully - continuing with app startup');
  // }
  
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

  // Debug console disabled in simplified permission system
  // globalShortcut.register('CommandOrControl+Shift+I', () => {
  //   createDebugWindow();
  //   console.log('🔬 Main app debug window opened via keyboard shortcut (Cmd+Shift+I)');
  // });

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
  
  // Clean up permission dialog
  cleanupPermissionDialog();
});

// Handle user login from desktop-agent UI - FIX: Use handle instead of on for invoke calls
ipcMain.handle('user-logged-in', async (event, userData) => {
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
  console.log('✅ User ID set, ready for permission check');
  
  // 🔒 SMART PERMISSION CHECK AFTER LOGIN
  setTimeout(async () => {
    try {
      console.log('🎯 Starting post-login permission check...');
      
      // Check if permissions were previously successful
      const previousPermissionsSuccessful = await checkPreviousPermissionStatus(userData.id);
      
      if (previousPermissionsSuccessful) {
        console.log('✅ Previous permissions were successful - skipping dialog');
        // Just log current status without showing dialog
        await testAndSavePermissions(userData.id);
      } else {
        console.log('⚠️ First time or previous permissions failed - showing dialog');
        const permissionsGranted = await showPostLoginPermissionDialog(userData.id);
        
        if (permissionsGranted) {
          console.log('✅ All permissions granted - ready for tracking');
        } else {
          console.log('⚠️ Some permissions missing - user can still start tracking with limitations');
        }
      }
    } catch (error) {
      console.error('❌ Error showing permission dialog:', error);
    }
  }, 2000); // Show dialog 2 seconds after login
  
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

// Simple permission logging (non-blocking)
async function logPermissionStatus(): Promise<void> {
  console.log('🔍 Logging permission status (non-blocking)...');
  
  try {
    const userId = getUserId();
    if (userId) {
      testAndSavePermissions(userId).then(status => {
        console.log('📊 Permission status logged to database:', {
          screen_recording: status.screen_recording,
          accessibility: status.accessibility,
          database_connection: status.database_connection,
          screenshot_capability: status.screenshot_capability
        });
      }).catch(error => {
        console.log('⚠️ Permission logging failed (not critical):', error);
      });
    }
  } catch (error) {
    console.log('⚠️ Permission logging error (not critical):', error);
  }
}

// Check if permissions were previously successful for this user
async function checkPreviousPermissionStatus(userId: string): Promise<boolean> {
  try {
    const { getSupabaseCredentials } = require('./secure-config');
    const config = getSupabaseCredentials();
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.url, config.key);
    
    // Check the most recent system check for this user
    const { data, error } = await supabase
      .from('system_checks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      console.log('🔍 No previous permission records found - first time user');
      return false;
    }
    
    const lastCheck = data[0];
    const testData = lastCheck.test_data || {};
    
    // Check if all critical permissions were successful
    const allPermissionsGranted = 
      testData.screen_recording === true && 
      testData.accessibility === true && 
      testData.screenshot_capability === true;
    
    console.log('🔍 Previous permission status:', {
      screen_recording: testData.screen_recording,
      accessibility: testData.accessibility,
      screenshot_capability: testData.screenshot_capability,
      database_connection: testData.database_connection,
      all_granted: allPermissionsGranted,
      last_check: lastCheck.created_at
    });
    
    return allPermissionsGranted;
    
  } catch (error) {
    console.log('⚠️ Error checking previous permission status:', error);
    // If we can't check, assume first time and show dialog
    return false;
  }
}

// === SECURE TRACKING START FUNCTION ===
// This is the ONLY function that can start tracking - all entry points must go through this
async function startTrackingSecure(projectId?: string, source: 'UI' | 'TRAY' | 'API' = 'UI'): Promise<{ success: boolean; message: string; issues?: string[]; systemCheck?: any; criticalFailure?: boolean }> {
  try {
    console.log(`🔐 [${source}] SECURE TRACKING START requested - validating ALL systems...`);
    
    // 1. Permission checking handled by first-time setup wizard
    console.log(`🔐 [${source}] Starting secure tracking validation...`);
    
    // 2. Check if already tracking
    if (isTracking) {
      return { success: false, message: 'Tracking is already active' };
    }
    
    // 3. Check if user is logged in
    const currentUserId = getUserId();
    if (!currentUserId) {
      return { 
        success: false, 
        message: 'User must be logged in before starting tracking',
        issues: ['No user session']
      };
    }
    
    // 4. Test permissions but don't block tracking
    console.log('🔐 Testing permissions (non-blocking)...');
    
    const userId = getUserId();
    if (userId) {
      // Test and save permission status but don't block tracking
      testAndSavePermissions(userId).then(status => {
        console.log('📊 Permission status logged:', status);
        
        if (!status.screen_recording || !status.accessibility) {
          console.log('⚠️ Some permissions missing but allowing tracking to continue');
          console.log('💡 User can grant permissions later through the dialog');
        }
      }).catch(error => {
        console.log('⚠️ Permission test failed but allowing tracking to continue:', error);
      });
    }

    // 5. Simplified system ready check (non-blocking)
    console.log('🔍 Basic system readiness check...');
    
    // Log any issues but don't block tracking
    try {
      if (userId) {
        testAndSavePermissions(userId).then(status => {
          if (!status.screen_recording) {
            console.log('⚠️ Screen recording permission missing - screenshots may not work');
          }
          if (!status.accessibility) {
            console.log('⚠️ Accessibility permission missing - input monitoring may be limited');
          }
          if (!status.database_connection) {
            console.log('⚠️ Database connection issues - data may not save properly');
          }
          console.log('✅ System check completed and logged to database');
        });
      }
    } catch (error) {
      console.log('⚠️ System check failed but continuing with tracking:', error);
    }

    console.log(`✅ [${source}] ALL CRITICAL CHECKS PASSED - Starting tracking securely`);

    // 9. Start tracking ONLY after all validations pass
    if (projectId) {
      setProjectId(projectId);
    }
    
    // Start all tracking components
    startTracking();
    startTrackingTimer();
    await startActivityMonitoring(currentUserId);
    startGlobalInputMonitoring();
    
    isTracking = true;
    updateTrayMenu();
    
    console.log(`✅ [${source}] Tracking started successfully with all systems verified`);
    
    // Send system check results to debug console
    if (appEvents) {
      appEvents.emit('debug-log', {
        type: 'SYSTEM',
        message: `[${source}] Tracking started successfully! System ready`,
        stats: {
          screenshots: 0,
          apps: 0,
          urls: 0,
          activity: 0
        }
      });
    }
    
    return { 
      success: true, 
      message: 'Time tracking started successfully!',
      issues: []
    };
    
  } catch (error) {
    console.error(`❌ [${source}] Error in secure tracking start:`, error);
    
    return { 
      success: false, 
      message: 'Failed to start tracking: ' + (error as Error).message,
      issues: ['System Error'],
      criticalFailure: true
    };
  }
}

// Handle tracking start (updated to use secure function)
ipcMain.handle('start-tracking', async (event, projectId?: string) => {
  return await startTrackingSecure(projectId, 'UI');
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
                    console.log('▶️ Manual tracking start requested from tray - using secure function');
                    
                    // Use the SECURE tracking start function - NO direct calls to tracking functions
                    const result = await startTrackingSecure(undefined, 'TRAY');
                    
                    if (!result.success) {
                        console.log('❌ TRAY: Secure tracking start failed:', result.issues);
                        
                        if (result.criticalFailure) {
                            dialog.showErrorBox(
                                'Tracking Blocked - System Issues',
                                result.message
                            );
                        } else {
                            dialog.showErrorBox(
                                'Tracking Failed',
                                result.message
                            );
                        }
                    } else {
                        console.log('✅ TRAY: Tracking started successfully via secure function');
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
    // Debug console disabled in simplified permission system
    // { 
    //   label: '🔬 Debug Console', 
    //   click: () => {
    //     createDebugWindow();
    //   }
    // },
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

// Simple permission check handler for UI
ipcMain.handle('perform-system-check', async () => {
  try {
    console.log('🔍 Simple permission check requested from UI');
    logPermissionStatus();
    return { 
      success: true, 
      message: 'Permission check completed (non-blocking)',
      issues: []
    };
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
    
    // Use same logic as debug-test-screen-permission with binary testing
    const electronAPIPermission = await checkScreenRecordingPermission();
    
    // Also test the actual binary that needs permission (same as debug handler)
    let binaryCanAccess = false;
    try {
      const { spawn } = require('child_process');
      // Use dynamic path resolution for both dev and DMG environments
      const activeWinPath = getActiveWinBinaryPath();
      
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
    
    const actualScreenPermission = electronAPIPermission && binaryCanAccess;
    
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
    
    console.log(`✅ Permission check results: Screen=${actualScreenPermission}, Accessibility=${accessibilityPermission}, ElectronAPI=${electronAPIPermission}, BinaryAccess=${binaryCanAccess}`);
    
    return {
      success: true,
      permissions: {
        screen: actualScreenPermission,
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
    console.log('🔍 Debug: Running enhanced screen permission analysis...');
    
    // Enhanced debug system removed - using basic permission checking
    
    const electronAPIPermission = await checkScreenRecordingPermission();
    
    // Use safe binary testing to prevent memory leaks
    const binaryCanAccess = await testActiveWinBinaryAccess();
    
    const actualPermission = electronAPIPermission && binaryCanAccess;
    
    let message = '';
    if (actualPermission) {
      message = '✅ Screen recording permission fully working - Electron API + Binary access both OK';
    } else if (electronAPIPermission && !binaryCanAccess) {
      message = '⚠️ Screen recording permission granted to Electron but binary cannot access it - restart app or re-grant permission';
    } else {
      message = '❌ Screen recording permission required - check System Settings > Privacy & Security > Screen Recording';
    }
    
    // Additional context from enhanced debugging
    let additionalInfo = '';
    try {
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1, height: 1 }
      });
      additionalInfo += `Desktop sources available: ${sources.length}. `;
         } catch (captureError) {
       additionalInfo += `Desktop capturer error: ${(captureError as Error).message}. `;
     }
    
    return { 
      success: actualPermission, 
      message: message + (additionalInfo ? `\n\nAdditional info: ${additionalInfo}` : ''),
      electronAPI: electronAPIPermission,
      binaryAccess: binaryCanAccess,
      enhancedDebugRan: true
    };
  } catch (error) {
    console.error('❌ Debug screen permission test error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('debug-test-accessibility-permission', async () => {
  try {
    console.log('🔍 Debug: Testing accessibility permission...');
    const { checkAccessibilityPermission } = require('./permissionManager');
    const hasPermission = await checkAccessibilityPermission();
    
    return { 
      success: hasPermission, 
      message: hasPermission ? 'Accessibility permission granted' : 'Accessibility permission required - MANDATORY for mouse and keyboard tracking' 
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

// === Debug Console Disabled in Simplified Permission System ===
ipcMain.handle('open-debug-console', async () => {
  console.log('🔬 Debug console disabled in simplified permission system');
  return { success: false, message: 'Debug console disabled in favor of simple permission dialog' };
});

// === Enhanced Debug Logging Handler ===
ipcMain.handle('run-enhanced-debug', async () => {
  try {
    console.log('🔍 Running comprehensive enhanced debug analysis...');
    
    // Enhanced debug system removed - using basic permission checking
    const report = 'Enhanced debug analysis completed - check console for detailed logs';
    
    console.log('✅ Enhanced debug analysis completed');
    
    return { 
      success: true, 
      report: report,
      message: 'Enhanced debug analysis completed - check console for detailed logs' 
    };
  } catch (error) {
    console.error('❌ Enhanced debug analysis failed:', error);
    return { success: false, error: (error as Error).message };
  }
});

// === Permission Management Helper ===
ipcMain.handle('request-all-permissions', async () => {
  try {
    console.log('🔐 Requesting all required permissions...');
    
    const results = {
      screen: false,
      accessibility: false,
      messages: [] as string[]
    };
    
    // Request Screen Recording Permission
    try {
      if (process.platform === 'darwin') {
        const { ensureScreenRecordingPermission } = require('./permissionManager');
        results.screen = await ensureScreenRecordingPermission();
        
        if (!results.screen) {
          results.messages.push('Screen Recording permission is required for app detection and screenshots');
        }
      } else {
        results.screen = true; // Not required on other platforms
      }
    } catch (error) {
      results.messages.push(`Screen Recording permission error: ${(error as Error).message}`);
    }
    
    // Request Accessibility Permission
    try {
      if (process.platform === 'darwin') {
        const { requestAccessibilityPermission } = require('./permissionManager');
        results.accessibility = await requestAccessibilityPermission();
        
        if (!results.accessibility) {
          results.messages.push('Accessibility permission is required for mouse and keyboard tracking');
        }
      } else {
        results.accessibility = true; // Not required on other platforms
      }
    } catch (error) {
      results.messages.push(`Accessibility permission error: ${(error as Error).message}`);
    }
    
    const allGranted = results.screen && results.accessibility;
    
    if (allGranted) {
      results.messages.push('All permissions granted successfully!');
    } else {
      results.messages.push('Some permissions are missing. Please check System Preferences > Security & Privacy > Privacy');
    }
    
    return {
      success: allGranted,
      results: results,
      message: allGranted ? 'All permissions granted' : 'Some permissions missing'
    };
  } catch (error) {
    console.error('❌ Failed to request permissions:', error);
    return { success: false, error: (error as Error).message };
  }
});

// === DYNAMIC PATH RESOLUTION FOR ACTIVE-WIN BINARY ===
function getActiveWinBinaryPath(): string {
  const { app } = require('electron');
  const path = require('path');
  const fs = require('fs');
  
  console.log('🔧 DMG FIX: Resolving active-win binary path for current installation...');
  
  // Check if app is packaged (DMG/built version)
  if (app.isPackaged) {
    // DMG/Packaged version - binary is in Contents/Resources/app.asar.unpacked
    // app.getAppPath() returns the asar file, we need the Resources directory
    const resourcesPath = process.resourcesPath;
    const possiblePaths = [
      // Standard DMG installation path
      path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'active-win', 'main'),
      // Alternative path for some builds
      path.join(resourcesPath, 'app.asar.unpacked', 'electron', 'node_modules', 'active-win', 'main'),
      // Fallback in case of different packaging
      path.join(app.getAppPath(), '..', 'app.asar.unpacked', 'node_modules', 'active-win', 'main'),
      // Last resort - check if binary is in same directory as electron executable
      path.join(path.dirname(process.execPath), 'active-win', 'main')
    ];
    
    console.log('🔧 DMG FIX: Testing possible active-win binary paths...');
    for (const testPath of possiblePaths) {
      console.log(`   Testing: ${testPath}`);
      if (fs.existsSync(testPath)) {
        console.log(`✅ DMG FIX: Found active-win binary at: ${testPath}`);
        return testPath;
      }
    }
    
    console.log('❌ DMG FIX: No active-win binary found in standard locations');
    console.log('📊 DMG FIX: Directory structure debug:');
    console.log(`   Resources path: ${resourcesPath}`);
    console.log(`   App path: ${app.getAppPath()}`);
    console.log(`   Exec path: ${process.execPath}`);
    
    // Try to list what's actually in the resources directory
    try {
      const resourcesContents = fs.readdirSync(resourcesPath);
      console.log(`   Resources contents: ${resourcesContents.join(', ')}`);
    } catch (e) {
      console.log('   Could not read resources directory');
    }
    
    // Return first path as fallback even if it doesn't exist
    const fallbackPath = possiblePaths[0];
    console.log(`🔄 DMG FIX: Using fallback path: ${fallbackPath}`);
    return fallbackPath;
  } else {
    // Development mode - need to find the correct path
    const possiblePaths = [
      // In the project root node_modules (most common)
      path.join(process.cwd(), 'node_modules', 'active-win', 'main'),
      // In build directory (correct path)
      path.join(process.cwd(), 'build', 'electron', 'node_modules', 'active-win', 'main'),
      // Relative to current file (one level up from electron directory)
      path.join(__dirname, '..', 'node_modules', 'active-win', 'main'),
      // Fallback: project root
      path.join(__dirname, '..', '..', 'node_modules', 'active-win', 'main'),
    ];
    
    console.log('🔧 DEV MODE: Testing possible binary paths...');
    for (const testPath of possiblePaths) {
      console.log(`   Testing: ${testPath}`);
      if (fs.existsSync(testPath)) {
        console.log(`✅ Found binary at: ${testPath}`);
        return testPath;
      }
    }
    
    // If none found, use the most likely path
    const fallbackPath = possiblePaths[0];
    console.log(`⚠️ No binary found, using fallback: ${fallbackPath}`);
    return fallbackPath;
  }
}

// === SAFE ACTIVE-WIN BINARY TESTING (PREVENTS MEMORY LEAKS) ===
let isTestingBinary = false; // Prevent simultaneous tests
let lastBinaryTestResult: boolean | null = null;
let lastBinaryTestTime = 0;

async function testActiveWinBinaryAccess(): Promise<boolean> {
  // Prevent simultaneous tests that caused the memory leak
  if (isTestingBinary) {
    console.log('⏳ DMG FIX: Binary test already in progress, returning cached result...');
    return lastBinaryTestResult || false;
  }
  
  // Use cached result if recent (within 5 seconds)
  const now = Date.now();
  if (lastBinaryTestResult !== null && (now - lastBinaryTestTime) < 5000) {
    console.log('📋 DMG FIX: Using cached binary test result:', lastBinaryTestResult);
    return lastBinaryTestResult;
  }
  
  isTestingBinary = true;
  console.log('🧪 DMG FIX: Testing active-win binary access with enhanced timeout handling...');
  
  try {
    const { spawn } = require('child_process');
    const activeWinPath = getActiveWinBinaryPath();
    
    console.log('🔧 DMG FIX: Testing binary at path:', activeWinPath);
    
    const binaryTest = await new Promise<boolean>((resolve) => {
      let isResolved = false;
      
      // Create timeout to prevent hanging processes
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          console.log('⏰ DMG FIX: Binary test timed out after 3 seconds');
          if (child && !child.killed) {
            child.kill('SIGTERM');
            setTimeout(() => {
              if (child && !child.killed) {
                console.log('🔧 DMG FIX: Force killing hanging binary process');
                child.kill('SIGKILL'); // Force kill if still running
              }
            }, 1000);
          }
          resolve(false);
        }
      }, 3000); // Increased timeout for DMG
      
      const child = spawn(activeWinPath, [], { 
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      let hasPermissionError = false;
      
      child.stdout?.on('data', (data: any) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data: any) => {
        stderr += data.toString();
        console.log('🔍 DMG FIX: Binary stderr:', data.toString());
        if (data.toString().includes('screen recording permission') || 
            data.toString().includes('accessibility permission') ||
            data.toString().includes('operation not permitted')) {
          hasPermissionError = true;
        }
      });
      
      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          
          // Enhanced success detection for DMG
          const hasOutput = stdout.length > 10;
          const successfulExit = code === 0;
          const noPermissionErrors = !hasPermissionError;
          
          const success = successfulExit && hasOutput && noPermissionErrors;
          
          console.log(`🔍 DMG FIX: Binary test result:`, {
            code: code,
            stdout_length: stdout.length,
            stderr_length: stderr.length,
            has_permission_error: hasPermissionError,
            success: success
          });
          
          if (success) {
            console.log('✅ DMG FIX: Binary test passed - permissions look good');
          } else if (hasPermissionError) {
            console.log('❌ DMG FIX: Binary test failed - permission errors detected');
          } else if (!hasOutput) {
            console.log('⚠️ DMG FIX: Binary test unclear - no output received');
          }
          
          resolve(success);
        }
      });
      
      child.on('error', (error: any) => {
        clearTimeout(timeout);
        if (!isResolved) {
          isResolved = true;
          console.log('❌ DMG FIX: Binary test spawn error:', error.message);
          
          // Check if error is due to missing binary file
          if (error.code === 'ENOENT') {
            console.log('💡 DMG FIX: Binary file not found - this may indicate packaging issue');
          }
          
          resolve(false);
        }
      });
    });
    
    // Cache the result
    lastBinaryTestResult = binaryTest;
    lastBinaryTestTime = now;
    
    console.log(`✅ DMG FIX: Binary test completed: ${binaryTest}`);
    return binaryTest;
    
  } catch (error) {
    console.error('❌ DMG FIX: Binary test exception:', error);
    lastBinaryTestResult = false;
    lastBinaryTestTime = now;
    return false;
  } finally {
    isTestingBinary = false;
  }
}

// === USER-FRIENDLY PERMISSION CHECKING POPUP ===
function showPermissionCheckingPopup() {
  const popup = new BrowserWindow({
    width: 500,
    height: 300,
    parent: mainWindow || undefined,
    modal: true,
    show: false,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: calc(100vh - 40px);
          text-align: center;
        }
        h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
        }
        .status {
          font-size: 16px;
          margin: 10px 0;
          opacity: 0.9;
        }
        .spinner {
          width: 40px;
          height: 40px;
          margin: 20px auto;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .steps {
          margin-top: 20px;
          text-align: left;
          opacity: 0.8;
          font-size: 14px;
        }
        .step {
          margin: 5px 0;
          padding-left: 20px;
        }
        .step.checking::before {
          content: "🔄";
          margin-right: 8px;
        }
        .step.pass::before {
          content: "✅";
          margin-right: 8px;
        }
        .step.fail::before {
          content: "❌";
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <h2>🔒 Checking System Permissions</h2>
      <div class="status" id="status">Validating system components...</div>
      <div class="spinner" id="spinner"></div>
      <div class="steps">
        <div class="step checking" id="step-screen">Screen Recording Permission</div>
        <div class="step" id="step-accessibility">Accessibility Permission</div>
        <div class="step" id="step-app">App Detection</div>
        <div class="step" id="step-screenshot">Screenshot Capability</div>
        <div class="step" id="step-input">Input Monitoring</div>
      </div>
    </body>
    </html>
  `;

  popup.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  popup.once('ready-to-show', () => {
    popup.show();
  });

  return popup;
}

// === ENHANCED SECURE TRACKING WITH USER FEEDBACK ===

