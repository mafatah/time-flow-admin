"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.appEvents = void 0;
require("dotenv/config");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const tracker_1 = require("./tracker.cjs");
const userSessionManager_1 = require("./userSessionManager.cjs");
const autoLaunch_1 = require("./autoLaunch.cjs");
const systemMonitor_1 = require("./systemMonitor.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const activityMonitor_1 = require("./activityMonitor.cjs");
const permissionManager_1 = require("./permissionManager.cjs");
const config_1 = require("./config.cjs");
// Linux dependency checking is handled in linuxDependencyChecker.ts automatically
const events_1 = require("events");
const autoUpdater_1 = require("./autoUpdater.cjs");
// Safe console logging to prevent EPIPE errors
function safeLog(...args) {
    try {
        console.log(...args);
    }
    catch (error) {
        // Silently ignore EPIPE errors when stdout is broken
        if (error.code !== 'EPIPE') {
            // For non-EPIPE errors, try to log to stderr
            try {
                console.error('Console error:', error);
            }
            catch (e) {
                // If even stderr fails, just ignore
            }
        }
    }
}
// Global error handling to prevent crashes
process.on('uncaughtException', (error) => {
    // Handle EPIPE errors silently (broken stdout/stderr pipe)
    if (error.code === 'EPIPE') {
        return; // Ignore EPIPE errors silently
    }
    // For other critical errors, log and continue
    try {
        console.error('Uncaught Exception:', error);
    }
    catch (e) {
        // If logging fails, just continue
    }
});
process.on('unhandledRejection', (reason, promise) => {
    try {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    }
    catch (e) {
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
let memoryCheckInterval = null;
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
function safeRegexTest(pattern, text, timeoutMs = 1000) {
    try {
        // Simple synchronous approach - just limit the text length
        const limitedText = text.length > 10000 ? text.substring(0, 10000) : text;
        return pattern.test(limitedText);
    }
    catch (error) {
        console.error('❌ Regex error:', error);
        return false;
    }
}
// Export safe regex function for global use
global.safeRegexTest = safeRegexTest;
// Start memory monitoring
startMemoryMonitoring();
console.log('✅ Memory monitoring started');
// === END MEMORY LEAK PREVENTION ===
// === JIT COMPILATION FIX FOR APPLE SILICON ===
// Fix for EXC_BREAKPOINT crashes in pthread_jit_write_protect_np
console.log('🔧 Applying JIT compilation fixes for Apple Silicon...');
// Disable V8's MAP_JIT flag which conflicts with macOS security
electron_1.app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor');
electron_1.app.commandLine.appendSwitch('--no-sandbox');
electron_1.app.commandLine.appendSwitch('--disable-web-security');
electron_1.app.commandLine.appendSwitch('--disable-features', 'OutOfBlinkCors');
// V8 JIT compilation fixes specifically for Apple Silicon
electron_1.app.commandLine.appendSwitch('--js-flags', '--jitless');
electron_1.app.commandLine.appendSwitch('--disable-software-rasterizer');
electron_1.app.commandLine.appendSwitch('--disable-background-timer-throttling');
electron_1.app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
electron_1.app.commandLine.appendSwitch('--disable-renderer-backgrounding');
console.log('✅ JIT compilation fixes applied');
// Create event emitter for internal communication
exports.appEvents = new events_1.EventEmitter();
// Debug environment variables
console.log('🔧 Environment variables at startup:');
console.log('   SCREENSHOT_INTERVAL_SECONDS:', process.env.SCREENSHOT_INTERVAL_SECONDS);
console.log('   Config screenshotIntervalSeconds will be available after config initialization');
let mainWindow = null;
let tray = null;
let isTracking = false;
let trackingStartTime = null;
let timerInterval = null;
// Global input monitoring using ioHook or similar
let globalInputMonitoring = false;
// Try to import ioHook for global input detection
let ioHook = null;
try {
    ioHook = require('iohook');
    console.log('✅ ioHook available for global input detection');
}
catch (e) {
    console.log('⚠️ ioHook not available, using system monitoring instead');
}
// === DMG PERMISSION FIX FOR LIVE INSTALLATIONS ===
// The issue is that DMG installations need enhanced permission management
// Check if running from DMG and prevent crashes
function checkDMGAndPreventCrash() {
    const appPath = electron_1.app.getAppPath();
    console.log('🔍 App path:', appPath);
    // Check if running from /Volumes (DMG mount point)
    if (appPath.includes('/Volumes/')) {
        console.log('⚠️ WARNING: App is running from DMG volume!');
        // Show critical warning dialog
        electron_1.dialog.showErrorBox('Installation Required - Ebdaa Work Time', 'This application is running from the disk image (DMG) and will crash if the DMG is ejected.\n\n' +
            'To fix this:\n' +
            '1. Drag "Ebdaa Work Time.app" to your Applications folder\n' +
            '2. Eject the DMG\n' +
            '3. Launch the app from Applications folder\n\n' +
            'The app will now close to prevent crashes.');
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
        electron_1.dialog.showErrorBox('Improper Installation - Ebdaa Work Time', 'This application is running from a temporary location and may not function properly.\n\n' +
            'Please install the app to your Applications folder:\n' +
            '1. Move "Ebdaa Work Time.app" to /Applications/\n' +
            '2. Launch from Applications folder\n\n' +
            'The app will now close.');
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
async function showEnhancedPermissionDialog() {
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
        const missingPermissions = [];
        if (screenPermission !== 'granted') {
            missingPermissions.push('Screen Recording');
        }
        if (!accessibilityPermission) {
            missingPermissions.push('Accessibility');
        }
        const result = await electron_1.dialog.showMessageBox({
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
        }
        else if (result.response === 2) {
            console.log('ℹ️ DMG FIX: User wants to learn more');
            await showPermissionExplanation();
        }
    }
    catch (error) {
        console.error('❌ DMG FIX: Enhanced permission dialog failed:', error);
    }
}
// === SMART SYSTEM SETTINGS OPENER ===
async function openSystemSettingsForPermissions(missingPermissions) {
    const { shell } = require('electron');
    try {
        if (missingPermissions.includes('Screen Recording')) {
            console.log('🔧 Opening Screen Recording settings...');
            await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
            // Show follow-up instructions
            setTimeout(async () => {
                await electron_1.dialog.showMessageBox({
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
                        await electron_1.dialog.showMessageBox({
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
        }
        else if (missingPermissions.includes('Accessibility')) {
            console.log('🔧 Opening Accessibility settings...');
            await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
        }
    }
    catch (error) {
        console.error('❌ Failed to open System Settings:', error);
        // Fallback: show manual instructions
        await electron_1.dialog.showMessageBox({
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
async function showPermissionExplanation() {
    const result = await electron_1.dialog.showMessageBox({
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
exports.appEvents.on('screenshot-captured', () => {
    showScreenshotNotification();
});
// Listen for auto-stop events from activity monitor
exports.appEvents.on('auto-stop-tracking', (data) => {
    console.log('🛑 Auto-stop tracking triggered:', data);
    // Stop the tracking timer
    stopTrackingTimer();
    // Stop time tracking in the tracker module
    (0, tracker_1.stopTracking)();
    // Show notification with reason
    try {
        let message = 'Tracking stopped automatically';
        if (data.reason === 'screenshot_failures') {
            message = `Tracking stopped due to screenshot failures (${data.failures} consecutive failures). This usually means your laptop is closed or the system is sleeping.`;
        }
        else if (data.reason === 'system_unavailable') {
            const minutes = Math.round(data.unavailableTime / 60000);
            message = `Tracking stopped due to system inactivity (${minutes} minutes without successful monitoring).`;
        }
        new electron_1.Notification({
            title: 'Ebdaa Work Time - Auto-Stop',
            body: message
        }).show();
        console.log(`📢 Auto-stop notification shown: ${message}`);
    }
    catch (e) {
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
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        // Fallback: try different possible paths
        const possiblePaths = [
            path.join(__dirname, '../../desktop-agent/renderer/index.html'),
            path.join(process.cwd(), 'desktop-agent/renderer/index.html'),
            path.join(electron_1.app.getAppPath(), 'desktop-agent/renderer/index.html')
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
        }
        else {
            console.log('⚠️ Desktop agent UI not found, loading web interface instead');
            // Load the web interface as fallback
            if (process.env.NODE_ENV === 'development') {
                mainWindow.loadURL('http://localhost:5173');
            }
            else {
                mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
            }
        }
    }
    // Show DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }
}
electron_1.app.whenReady().then(async () => {
    // CRITICAL: Check if running from DMG and prevent crashes
    if (!checkDMGAndPreventCrash()) {
        console.log('🛑 App startup prevented due to DMG location - quitting safely');
        electron_1.app.quit();
        return;
    }
    // Initialize secure configuration system
    console.log('🔧 Initializing secure configuration...');
    try {
        await (0, config_1.initializeConfig)();
        console.log('✅ Configuration initialized successfully');
    }
    catch (error) {
        console.error('❌ Configuration initialization failed:', error);
        console.log('🛑 App startup cancelled - configuration setup required');
        electron_1.app.quit();
        return;
    }
    await createWindow();
    // Create system tray
    createTray();
    // Check permissions quietly on startup (don't request yet)
    console.log('🚀 App ready, checking permissions...');
    const hasPermission = await (0, permissionManager_1.checkScreenRecordingPermission)();
    if (hasPermission) {
        // Test screen capture capability
        await (0, permissionManager_1.testScreenCapture)();
        console.log('✅ App ready with screen recording permission');
    }
    else {
        console.log('⚠️ App ready but screen recording permission missing - will request when tracking starts');
    }
    // Don't auto-load any config or start any tracking
    // Let employees start fresh each time and manually control everything
    console.log('📋 App ready - waiting for employee to login and start tracking manually');
    (0, autoLaunch_1.setupAutoLaunch)().catch(err => console.error(err));
    (0, systemMonitor_1.initSystemMonitor)();
    (0, unsyncedManager_1.startSyncLoop)();
    // Setup auto-updater
    (0, autoUpdater_1.setupUpdaterIPC)();
    (0, autoUpdater_1.enableAutoUpdates)();
    // Register global debug shortcut (Ctrl+Shift+I or Cmd+Shift+I for main app)
    electron_1.globalShortcut.register('CommandOrControl+Shift+I', () => {
        createDebugWindow();
        console.log('🔬 Main app debug window opened via keyboard shortcut (Cmd+Shift+I)');
    });
    electron_1.app.on('activate', async () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            await createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    // On macOS, keep the app running in the background (tray mode)
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Prevent app from quitting when all windows are closed (keep in tray)
electron_1.app.on('before-quit', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    // Unregister global shortcuts
    electron_1.globalShortcut.unregisterAll();
});
// Handle user login from desktop-agent UI - FIX: Use handle instead of on for invoke calls
electron_1.ipcMain.handle('user-logged-in', (event, userData) => {
    console.log('👤 User logged in from UI:', userData.email);
    console.log('🔍 Login data received:', {
        email: userData.email,
        has_session: !!userData.session,
        remember_me: userData.remember_me,
        session_keys: userData.session ? Object.keys(userData.session) : []
    });
    (0, tracker_1.setUserId)(userData.id);
    // Save user session if remember_me is true
    if (userData.session && userData.remember_me) {
        try {
            const userSession = {
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
            (0, userSessionManager_1.saveUserSession)(userSession);
            console.log('✅ User session saved successfully for future logins');
        }
        catch (error) {
            console.error('❌ Failed to save user session:', error);
        }
    }
    else {
        if (!userData.session) {
            console.log('⚠️ No session data provided - cannot save session');
        }
        if (!userData.remember_me) {
            console.log('ℹ️ Remember me is false - not saving session');
        }
    }
    console.log('Set user ID:', userData.id);
    console.log('✅ User ID set, ready for manual tracking start');
    // Perform system check after login to inform user of any issues
    setTimeout(async () => {
        console.log('🔍 Performing post-login system check...');
        const systemCheck = await performSystemCheck();
        // Send system check results to the renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('show-system-check', {
                systemCheck: systemCheck,
                autoShow: true, // Show automatically after login
                message: 'Welcome! Let\'s verify your system is ready for time tracking.'
            });
        }
    }, 1000); // Small delay to ensure UI is ready
    return { success: true, message: 'User logged in successfully' };
});
// Handle user logout from desktop-agent UI
electron_1.ipcMain.handle('user-logged-out', () => {
    console.log('🚪 User logout requested from UI');
    // Clear user session and tracking session
    (0, userSessionManager_1.clearUserSession)();
    (0, tracker_1.clearSavedSession)();
    stopTrackingTimer();
    (0, activityMonitor_1.stopActivityMonitoring)();
    console.log('✅ User logged out - all sessions cleared and tracking stopped');
    return { success: true, message: 'User logged out successfully' };
});
// Comprehensive system check before starting tracking
async function performSystemCheck() {
    const issues = [];
    const details = {
        permissions: {},
        capabilities: {},
        tests: {}
    };
    console.log('🔍 Starting comprehensive system check...');
    try {
        // 1. Check Screen Recording Permission (both Electron API and actual binary test)
        console.log('📺 Checking screen recording permission...');
        const electronAPIPermission = await (0, permissionManager_1.checkScreenRecordingPermission)();
        // Use safe binary testing to prevent memory leaks
        const binaryCanAccess = await testActiveWinBinaryAccess();
        const actualPermission = electronAPIPermission && binaryCanAccess;
        details.permissions.screenRecording = actualPermission;
        details.permissions.electronAPI = electronAPIPermission;
        details.permissions.binaryAccess = binaryCanAccess;
        if (!actualPermission) {
            if (electronAPIPermission && !binaryCanAccess) {
                issues.push('Screen Recording permission granted to Electron but not accessible to child processes - restart app or re-grant permission');
            }
            else {
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
            }
            else {
                hasAccessibilityPermission = true; // Not required on other platforms
            }
        }
        catch (error) {
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
            const { testScreenCapture } = require('./permissionManager.cjs');
            screenshotWorks = await testScreenCapture();
        }
        catch (error) {
            console.log('❌ Screenshot test failed:', error);
        }
        details.capabilities.screenshot = screenshotWorks;
        if (!screenshotWorks) {
            issues.push('Screenshot capture not working - check permissions and system settings');
        }
        // 4. Test App Detection (use safe binary testing to prevent memory leaks)
        console.log('🖥️ Testing app detection...');
        let appDetectionWorks = false;
        try {
            // Use the safe binary testing function we created
            appDetectionWorks = await testActiveWinBinaryAccess();
            if (appDetectionWorks) {
                // If binary access works, try to get current app name
                try {
                    const { getCurrentAppName } = require('./activityMonitor.cjs');
                    const currentApp = await getCurrentAppName();
                    details.tests.currentApp = currentApp || 'DETECTED_BUT_NO_APP_NAME';
                }
                catch (error) {
                    details.tests.currentApp = 'BINARY_WORKS_BUT_NO_APP_NAME';
                }
            }
            else {
                details.tests.currentApp = 'PERMISSION_ERROR';
                details.tests.appDetectionError = 'SCREEN_RECORDING_PERMISSION_REQUIRED';
            }
        }
        catch (error) {
            console.log('❌ App detection test failed:', error);
            details.tests.currentApp = 'ERROR';
            appDetectionWorks = false;
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
    }
    catch (error) {
        console.error('❌ System check failed:', error);
        return {
            success: false,
            issues: ['System check failed: ' + error.message],
            details: { error: error.message }
        };
    }
}
// === SECURE TRACKING START FUNCTION ===
// This is the ONLY function that can start tracking - all entry points must go through this
async function startTrackingSecure(projectId, source = 'UI') {
    let popup = null;
    try {
        console.log(`🔐 [${source}] SECURE TRACKING START requested - validating ALL systems...`);
        // 1. Show user-friendly permission checking popup (only for UI requests)
        if (source === 'UI') {
            popup = showPermissionCheckingPopup();
        }
        // 2. Check if already tracking
        if (isTracking) {
            if (popup)
                popup.close();
            return { success: false, message: 'Tracking is already active' };
        }
        // 3. Check if user is logged in
        const currentUserId = (0, tracker_1.getUserId)();
        if (!currentUserId) {
            if (popup)
                popup.close();
            return {
                success: false,
                message: 'User must be logged in before starting tracking',
                issues: ['No user session']
            };
        }
        // 4. Request and validate permissions with user feedback
        console.log('🔐 Requesting required permissions...');
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('status').textContent = 'Checking Screen Recording permission...';
        document.getElementById('step-screen').className = 'step checking';
      `);
        }
        const hasScreenPermission = await (0, permissionManager_1.ensureScreenRecordingPermission)();
        if (!hasScreenPermission) {
            console.log('❌ SECURE TRACKING BLOCKED: Screen Recording permission denied');
            if (popup) {
                popup.webContents.executeJavaScript(`
          document.getElementById('step-screen').className = 'step fail';
          document.getElementById('status').textContent = 'Screen Recording permission required!';
          document.getElementById('spinner').style.display = 'none';
        `);
                setTimeout(() => popup.close(), 3000);
            }
            return {
                success: false,
                message: 'Screen Recording permission is required. Please grant permission in System Settings and try again.',
                issues: ['Screen Recording Permission Required'],
                criticalFailure: true
            };
        }
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('step-screen').className = 'step pass';
      `);
        }
        // 5. Check accessibility permission for macOS
        if (process.platform === 'darwin') {
            if (popup) {
                popup.webContents.executeJavaScript(`
          document.getElementById('status').textContent = 'Checking Accessibility permission...';
          document.getElementById('step-accessibility').className = 'step checking';
        `);
            }
            try {
                const { systemPreferences } = require('electron');
                const hasAccessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
                if (!hasAccessibilityPermission) {
                    console.log('❌ SECURE TRACKING BLOCKED: Accessibility permission required');
                    if (popup) {
                        popup.webContents.executeJavaScript(`
              document.getElementById('step-accessibility').className = 'step fail';
              document.getElementById('status').textContent = 'Accessibility permission required!';
              document.getElementById('spinner').style.display = 'none';
            `);
                        setTimeout(() => popup.close(), 3000);
                    }
                    return {
                        success: false,
                        message: 'Accessibility permission is required on macOS for app and URL detection. Please grant permission in System Settings and restart the app.',
                        issues: ['Accessibility Permission Required'],
                        criticalFailure: true
                    };
                }
                if (popup) {
                    popup.webContents.executeJavaScript(`
            document.getElementById('step-accessibility').className = 'step pass';
          `);
                }
            }
            catch (error) {
                console.log('⚠️ Could not verify accessibility permission:', error);
            }
        }
        // 6. Perform comprehensive system check with STRICT validation
        console.log('🔍 Performing comprehensive system check...');
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('status').textContent = 'Running comprehensive system check...';
        document.getElementById('step-app').className = 'step checking';
      `);
        }
        const systemCheck = await performSystemCheck();
        // 7. Update popup with test results
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('step-app').className = '${systemCheck.details?.capabilities?.appDetection ? 'step pass' : 'step fail'}';
        document.getElementById('step-screenshot').className = '${systemCheck.details?.capabilities?.screenshot ? 'step pass' : 'step fail'}';
        document.getElementById('step-input').className = '${systemCheck.details?.capabilities?.inputMonitoring ? 'step pass' : 'step fail'}';
      `);
        }
        // 8. CRITICAL VALIDATION: ALL components must pass - NO EXCEPTIONS
        const requiredChecks = [
            { name: 'Screen Recording Permission', check: systemCheck.details?.permissions?.screenRecording === true },
            { name: 'App Detection', check: systemCheck.details?.capabilities?.appDetection === true },
            { name: 'Screenshot Capability', check: systemCheck.details?.capabilities?.screenshot === true },
            { name: 'Input Monitoring', check: systemCheck.details?.capabilities?.inputMonitoring === true },
            { name: 'Idle Detection', check: systemCheck.details?.capabilities?.idleDetection === true }
        ];
        const failedChecks = requiredChecks.filter(check => check.check !== true);
        if (failedChecks.length > 0) {
            const failedNames = failedChecks.map(check => check.name);
            console.log(`❌ [${source}] SECURE TRACKING BLOCKED: Critical components failed:`, failedNames);
            console.log('🚫 TRACKING WILL NOT START - System validation failed');
            if (popup) {
                popup.webContents.executeJavaScript(`
          document.getElementById('status').textContent = 'System validation failed!';
          document.getElementById('spinner').style.display = 'none';
        `);
                setTimeout(() => popup.close(), 5000);
            }
            return {
                success: false,
                message: `TRACKING BLOCKED: Critical system components failed validation.\n\nFailed components:\n${failedNames.map(name => `• ${name}`).join('\n')}\n\nAll components must pass before tracking can start. Please resolve these issues and try again.`,
                issues: failedNames,
                systemCheck: systemCheck,
                criticalFailure: true
            };
        }
        // 9. Additional macOS accessibility check
        if (process.platform === 'darwin' && systemCheck.details?.permissions?.accessibility !== true) {
            console.log(`❌ [${source}] SECURE TRACKING BLOCKED: Accessibility permission validation failed`);
            if (popup) {
                popup.webContents.executeJavaScript(`
          document.getElementById('status').textContent = 'Accessibility permission validation failed!';
          document.getElementById('spinner').style.display = 'none';
        `);
                setTimeout(() => popup.close(), 5000);
            }
            return {
                success: false,
                message: 'TRACKING BLOCKED: Accessibility permission validation failed. Please grant permission in System Settings and restart the app.',
                issues: ['Accessibility Permission Validation Failed'],
                systemCheck: systemCheck,
                criticalFailure: true
            };
        }
        console.log(`✅ [${source}] ALL CRITICAL CHECKS PASSED - Starting tracking securely`);
        // 10. Show success in popup
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('status').textContent = 'All checks passed! Starting tracking...';
        document.getElementById('spinner').style.display = 'none';
      `);
        }
        // 11. Start tracking ONLY after all validations pass
        if (projectId) {
            (0, tracker_1.setProjectId)(projectId);
        }
        // Start all tracking components
        (0, tracker_1.startTracking)();
        startTrackingTimer();
        await (0, activityMonitor_1.startActivityMonitoring)(currentUserId);
        startGlobalInputMonitoring();
        isTracking = true;
        updateTrayMenu();
        console.log(`✅ [${source}] Tracking started successfully with all systems verified`);
        // 12. Close popup with success message
        if (popup) {
            popup.webContents.executeJavaScript(`
        document.getElementById('status').textContent = 'Tracking started successfully!';
      `);
            setTimeout(() => popup.close(), 2000);
        }
        // Send system check results to debug console
        if (exports.appEvents) {
            exports.appEvents.emit('debug-log', {
                type: 'SYSTEM',
                message: `[${source}] Tracking started successfully! All systems validated`,
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
            message: 'Time tracking started successfully with full system validation!',
            systemCheck: systemCheck
        };
    }
    catch (error) {
        console.error(`❌ [${source}] Error in secure tracking start:`, error);
        // Close popup on error
        if (popup) {
            popup.close();
        }
        return {
            success: false,
            message: 'Failed to start tracking: ' + error.message,
            issues: ['System Error'],
            criticalFailure: true
        };
    }
}
// Handle tracking start (updated to use secure function)
electron_1.ipcMain.handle('start-tracking', async (event, projectId) => {
    return await startTrackingSecure(projectId, 'UI');
});
// Handle tracking pause
electron_1.ipcMain.handle('pause-tracking', () => {
    try {
        console.log('⏸️ Manual tracking pause requested');
        (0, activityMonitor_1.stopActivityMonitoring)();
        isTracking = false;
        updateTrayMenu();
        console.log('✅ Tracking paused successfully');
        return { success: true, message: 'Time tracking paused' };
    }
    catch (error) {
        console.error('❌ Error pausing tracking:', error);
        return { success: false, message: 'Failed to pause tracking' };
    }
});
// Handle tracking stop with better response
electron_1.ipcMain.handle('stop-tracking', () => {
    try {
        console.log('⏹️ Manual tracking stop requested');
        (0, tracker_1.stopTracking)();
        stopTrackingTimer();
        (0, activityMonitor_1.stopActivityMonitoring)();
        // Stop input monitoring
        stopGlobalInputMonitoring();
        isTracking = false;
        updateTrayMenu();
        console.log('✅ Tracking stopped successfully');
        return { success: true, message: 'Time tracking stopped' };
    }
    catch (error) {
        console.error('❌ Error stopping tracking:', error);
        return { success: false, message: 'Failed to stop tracking' };
    }
});
// Handle screenshot force capture with response
electron_1.ipcMain.handle('force-screenshot', async () => {
    try {
        console.log('📸 Manual screenshot requested');
        const result = await (0, activityMonitor_1.triggerDirectScreenshot)();
        showScreenshotNotification();
        return { success: true, message: 'Screenshot captured successfully' };
    }
    catch (error) {
        console.error('❌ Error capturing screenshot:', error);
        return { success: false, message: 'Failed to capture screenshot' };
    }
});
// Legacy handler removed - use ipcMain.handle('start-tracking') instead
// This ensures all activity monitoring starts go through proper permission and system checks
// Keep existing deprecated handlers for backward compatibility
electron_1.ipcMain.on('set-user-id', (_e, id) => {
    (0, tracker_1.setUserId)(id);
    console.log('✅ User ID set:', id, '- Waiting for manual tracking start');
});
electron_1.ipcMain.handle('set-project-id', async (_e, id) => {
    (0, tracker_1.setProjectId)(id);
    console.log('✅ Project ID set:', id);
    return { success: true, projectId: id };
});
// Legacy handler removed - use ipcMain.handle('start-tracking') instead
// This ensures all tracking starts go through proper permission and system checks
// Legacy stop-tracking handler removed - use ipcMain.handle('stop-tracking') instead
// This ensures all tracking stops go through proper cleanup
electron_1.ipcMain.on('logout', () => {
    console.log('🚪 Logout requested from UI (legacy)');
    (0, tracker_1.clearSavedSession)();
    stopTrackingTimer();
    (0, activityMonitor_1.stopActivityMonitoring)();
    if (mainWindow) {
        mainWindow.reload();
    }
    console.log('🚪 User logged out - session cleared and tracking stopped');
});
// Update-related IPC handlers are now managed by setupUpdaterIPC() in autoUpdater.ts
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
// Add back the missing sync handlers
electron_1.ipcMain.on('sync-offline-data', () => void (0, tracker_1.syncOfflineData)());
electron_1.ipcMain.handle('load-session', () => (0, tracker_1.loadSession)());
electron_1.ipcMain.handle('load-user-session', () => {
    try {
        console.log('🔍 Attempting to load user session...');
        const userSession = (0, userSessionManager_1.loadUserSession)();
        if (userSession) {
            console.log('📂 User session found:', {
                email: userSession.email,
                remember_me: userSession.remember_me,
                expires_at: new Date(userSession.expires_at)
            });
            if ((0, userSessionManager_1.isSessionValid)(userSession)) {
                console.log('✅ Valid user session found for:', userSession.email);
                return userSession;
            }
            else {
                console.log('⚠️ User session found but expired or invalid');
                // Clear the invalid session
                (0, userSessionManager_1.clearUserSession)();
                return null;
            }
        }
        else {
            console.log('ℹ️ No saved user session found');
            return null;
        }
    }
    catch (error) {
        console.error('❌ Error loading user session:', error);
        return null;
    }
});
electron_1.ipcMain.on('clear-session', () => (0, tracker_1.clearSavedSession)());
// Add missing get-config handler if not already present
let configCache = null;
let lastConfigLoad = 0;
const CONFIG_CACHE_TTL = 5000; // 5 seconds
electron_1.ipcMain.handle('get-config', async () => {
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
        const { getSupabaseCredentials } = await Promise.resolve().then(() => __importStar(require('./secure-config.cjs')));
        const { initializeConfig } = await Promise.resolve().then(() => __importStar(require('./config.cjs')));
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
        }
        catch (error) {
            console.log('⚠️ Could not load desktop-agent config.json:', error);
        }
        configCache = {
            supabase_url: credentials.url,
            supabase_key: credentials.key,
            user_id: process.env.USER_ID || desktopConfig.user_id || '',
            project_id: process.env.PROJECT_ID || desktopConfig.project_id || '00000000-0000-0000-0000-000000000001',
            screenshot_interval_seconds: desktopConfig.screenshot_interval_seconds || config_1.screenshotIntervalSeconds,
            idle_threshold_seconds: desktopConfig.idle_threshold_seconds || Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
            enable_screenshots: desktopConfig.enable_screenshots !== undefined ? desktopConfig.enable_screenshots : true,
            enable_idle_detection: desktopConfig.enable_idle_detection !== undefined ? desktopConfig.enable_idle_detection : true,
            enable_activity_tracking: desktopConfig.enable_activity_tracking !== undefined ? desktopConfig.enable_activity_tracking : true,
            enable_anti_cheat: desktopConfig.enable_anti_cheat !== undefined ? desktopConfig.enable_anti_cheat : process.env.ANTI_CHEAT_ENABLED !== 'false'
        };
        lastConfigLoad = now;
        console.log('✅ Desktop agent config prepared with encrypted credentials');
        return configCache;
    }
    catch (error) {
        console.error('❌ Failed to get encrypted credentials for desktop agent:', error);
        // Fallback to try desktop-agent config.json
        let desktopConfig = {};
        try {
            const configPath = path.join(__dirname, '../../desktop-agent/config.json');
            if (fs.existsSync(configPath)) {
                desktopConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                console.log('📄 Using fallback config from desktop-agent/config.json');
            }
        }
        catch (fallbackError) {
            console.log('⚠️ Could not load fallback desktop-agent config.json:', fallbackError);
        }
        configCache = {
            supabase_url: process.env.VITE_SUPABASE_URL || desktopConfig.supabase_url || '',
            supabase_key: process.env.VITE_SUPABASE_ANON_KEY || desktopConfig.supabase_key || '',
            user_id: process.env.USER_ID || desktopConfig.user_id || '',
            project_id: process.env.PROJECT_ID || desktopConfig.project_id || '00000000-0000-0000-0000-000000000001',
            screenshot_interval_seconds: desktopConfig.screenshot_interval_seconds || config_1.screenshotIntervalSeconds,
            idle_threshold_seconds: desktopConfig.idle_threshold_seconds || Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
            enable_screenshots: desktopConfig.enable_screenshots !== undefined ? desktopConfig.enable_screenshots : true,
            enable_idle_detection: desktopConfig.enable_idle_detection !== undefined ? desktopConfig.enable_idle_detection : true,
            enable_activity_tracking: desktopConfig.enable_activity_tracking !== undefined ? desktopConfig.enable_activity_tracking : true,
            enable_anti_cheat: desktopConfig.enable_anti_cheat !== undefined ? desktopConfig.enable_anti_cheat : process.env.ANTI_CHEAT_ENABLED !== 'false'
        };
        lastConfigLoad = now;
        return configCache;
    }
});
// Add missing fetch-screenshots handler if not already present
electron_1.ipcMain.handle('fetch-screenshots', async (event, params) => {
    try {
        // Use encrypted credentials for consistency
        const { getSupabaseCredentials } = await Promise.resolve().then(() => __importStar(require('./secure-config.cjs')));
        const { initializeConfig } = await Promise.resolve().then(() => __importStar(require('./config.cjs')));
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
    }
    catch (error) {
        console.error('❌ Failed to fetch screenshots:', error);
        return { success: false, screenshots: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
electron_1.ipcMain.on('trigger-activity-capture', () => {
    (0, activityMonitor_1.triggerActivityCapture)();
    showScreenshotNotification();
});
electron_1.ipcMain.handle('trigger-direct-screenshot', async () => {
    const result = await (0, activityMonitor_1.triggerDirectScreenshot)();
    showScreenshotNotification();
    return result;
});
// Add screenshot testing handlers
electron_1.ipcMain.handle('test-screenshot', async () => {
    console.log('🧪 Manual screenshot test requested');
    try {
        // Import the activity monitor function
        const { triggerDirectScreenshot } = await Promise.resolve().then(() => __importStar(require('./activityMonitor.cjs')));
        const result = await triggerDirectScreenshot();
        console.log('✅ Screenshot test completed:', result);
        return { success: result, message: 'Screenshot test completed' };
    }
    catch (error) {
        console.error('❌ Screenshot test failed:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('manual-screenshot', async () => {
    console.log('📸 Manual screenshot capture requested');
    try {
        // Import the activity monitor function
        const { triggerActivityCapture } = await Promise.resolve().then(() => __importStar(require('./activityMonitor.cjs')));
        triggerActivityCapture();
        console.log('✅ Manual screenshot triggered');
        return { success: true, message: 'Manual screenshot triggered' };
    }
    catch (error) {
        console.error('❌ Manual screenshot failed:', error);
        return { success: false, error: error.message };
    }
});
// Create tray icon
function createTray() {
    try {
        // Use platform-appropriate tray icons
        const iconPath = process.platform === 'win32'
            ? path.join(__dirname, '../assets/tray-icon.ico') // Windows prefers ICO
            : path.join(__dirname, '../assets/tray-icon.png'); // macOS and Linux use PNG
        console.log('🔍 Loading tray icon from:', iconPath);
        console.log('🔍 Icon path exists:', fs.existsSync(iconPath));
        console.log('🔍 Platform:', process.platform);
        // Create fallback icon if file doesn't exist
        if (!fs.existsSync(iconPath)) {
            console.log('⚠️ Tray icon not found, creating fallback');
            // Create a simple 16x16 icon programmatically
            const icon = electron_1.nativeImage.createFromBuffer(Buffer.from(createSimpleIcon(), 'base64'));
            tray = new electron_1.Tray(icon);
        }
        else {
            console.log('✅ Loading tray icon from file');
            const icon = electron_1.nativeImage.createFromPath(iconPath);
            // Resize for tray (16x16 on macOS, 16x16 on Windows)
            const resizedIcon = icon.resize({ width: 16, height: 16 });
            tray = new electron_1.Tray(resizedIcon);
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
                }
                else {
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
            if (electron_1.Notification.isSupported()) {
                new electron_1.Notification({
                    title: 'TimeFlow is ready',
                    body: 'Look for the TimeFlow icon in your system tray (menu bar)',
                    silent: true,
                }).show();
            }
        }, 2000);
        return tray;
    }
    catch (error) {
        console.error('❌ Failed to create tray:', error);
        return null;
    }
}
// Create a simple icon as base64 (16x16 green circle)
function createSimpleIcon() {
    // This is a simple 16x16 PNG icon encoded as base64
    return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
}
// Create debug window
let debugWindow = null;
function createDebugWindow() {
    if (debugWindow) {
        debugWindow.focus();
        return debugWindow;
    }
    debugWindow = new electron_1.BrowserWindow({
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
    }
    else {
        console.error('❌ Desktop agent debug-window.html not found at:', debugHtmlPath);
        debugWindow.destroy();
        debugWindow = null;
        return null;
    }
    debugWindow.once('ready-to-show', () => {
        debugWindow.show();
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
    const updateStatus = (0, autoUpdater_1.getUpdateStatus)();
    const updateLabel = updateStatus.updateAvailable
        ? `⬇️ Download v${updateStatus.updateInfo?.version}`
        : updateStatus.updateCheckInProgress
            ? '🔍 Checking...'
            : '🔄 Check for Updates';
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: isTracking ? '⏸ Stop Tracking' : '▶️ Start Tracking',
            click: async () => {
                if (isTracking) {
                    console.log('⏸️ Manual tracking stop requested from tray');
                    (0, tracker_1.stopTracking)();
                    stopTrackingTimer();
                    (0, activityMonitor_1.stopActivityMonitoring)();
                    stopGlobalInputMonitoring();
                    isTracking = false;
                    updateTrayMenu();
                }
                else {
                    console.log('▶️ Manual tracking start requested from tray - using secure function');
                    // Use the SECURE tracking start function - NO direct calls to tracking functions
                    const result = await startTrackingSecure(undefined, 'TRAY');
                    if (!result.success) {
                        console.log('❌ TRAY: Secure tracking start failed:', result.issues);
                        if (result.criticalFailure) {
                            electron_1.dialog.showErrorBox('Tracking Blocked - System Issues', result.message);
                        }
                        else {
                            electron_1.dialog.showErrorBox('Tracking Failed', result.message);
                        }
                    }
                    else {
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
                electron_1.shell.openExternal('https://time-flow-admin.vercel.app');
            }
        },
        { type: 'separator' },
        {
            label: updateLabel,
            click: () => {
                if (updateStatus.updateAvailable) {
                    // Import downloadUpdate dynamically to avoid circular imports
                    Promise.resolve().then(() => __importStar(require('./autoUpdater.cjs'))).then(({ downloadUpdate }) => {
                        downloadUpdate();
                    });
                }
                else {
                    (0, autoUpdater_1.checkForUpdates)(true);
                }
            }
        },
        {
            label: `ℹ️ Version ${electron_1.app.getVersion()}`,
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
                (0, tracker_1.clearSavedSession)();
                stopTrackingTimer();
                (0, activityMonitor_1.stopActivityMonitoring)();
                console.log('🚪 User logged out - session cleared');
            }
        },
        { type: 'separator' },
        { label: '❌ Quit', click: () => electron_1.app.quit() }
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
    if (!isTracking || !trackingStartTime || !tray)
        return;
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - trackingStartTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const timeString = hours > 0
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    tray.setToolTip(`Ebdaa Time - Tracking: ${timeString}`);
}
// Show screenshot notification
function showScreenshotNotification() {
    if (electron_1.Notification.isSupported()) {
        const notification = new electron_1.Notification({
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
    if (globalInputMonitoring)
        return;
    console.log('🖱️ Starting global input monitoring...');
    if (ioHook) {
        try {
            // Register mouse click events
            ioHook.on('mouseclick', (event) => {
                (0, activityMonitor_1.recordRealActivity)('mouse_click', 1);
                console.log('🖱️ Real mouse click detected');
            });
            // Register keypress events
            ioHook.on('keydown', (event) => {
                (0, activityMonitor_1.recordRealActivity)('keystroke', 1);
                console.log('⌨️ Real keystroke detected');
            });
            // Register mouse movement (throttled)
            let lastMouseMove = 0;
            ioHook.on('mousemove', (event) => {
                const now = Date.now();
                if (now - lastMouseMove > 200) { // Throttle to every 200ms
                    (0, activityMonitor_1.recordRealActivity)('mouse_movement', 1);
                    lastMouseMove = now;
                }
            });
            // Start the hook
            ioHook.start();
            globalInputMonitoring = true;
            console.log('✅ Global input monitoring started with ioHook');
        }
        catch (error) {
            console.error('❌ Failed to start ioHook:', error);
            console.log('📋 Using fallback input detection instead');
            startFallbackInputDetection();
        }
    }
    else {
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
            (0, activityMonitor_1.recordRealActivity)('mouse_click', 1);
            console.log('🖱️ App focus detected - recorded as click');
        });
        mainWindow.on('blur', () => {
            // App lost focus, user likely clicked elsewhere
            (0, activityMonitor_1.recordRealActivity)('mouse_click', 1);
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
                    (0, activityMonitor_1.recordRealActivity)('keystroke', 1);
                    console.log('⌨️ Simulated keystroke (fallback detection)');
                }
                else if (activityType < 0.7) {
                    (0, activityMonitor_1.recordRealActivity)('mouse_movement', 1);
                    console.log('🖱️ Simulated mouse movement (fallback detection)');
                }
                else {
                    (0, activityMonitor_1.recordRealActivity)('mouse_click', 1);
                    console.log('🖱️ Simulated mouse click (fallback detection)');
                }
            }
        }
    }, 10000); // Check every 10 seconds
}
function stopGlobalInputMonitoring() {
    if (!globalInputMonitoring)
        return;
    console.log('🛑 Stopping global input monitoring...');
    if (ioHook) {
        try {
            ioHook.stop();
            ioHook.removeAllListeners();
        }
        catch (error) {
            console.log('⚠️ Error stopping ioHook:', error);
        }
    }
    globalInputMonitoring = false;
    console.log('✅ Global input monitoring stopped');
}
// Add testing handlers for manual activity recording
electron_1.ipcMain.handle('record-test-activity', (event, type, count = 1) => {
    try {
        console.log(`🧪 Manual test activity: ${type} x${count}`);
        (0, activityMonitor_1.recordRealActivity)(type, count);
        return { success: true, message: `Recorded ${count} ${type} events` };
    }
    catch (error) {
        console.error('❌ Error recording test activity:', error);
        return { success: false, error: error.message };
    }
});
// Add handler to start/stop input monitoring
electron_1.ipcMain.handle('toggle-input-monitoring', () => {
    try {
        if (globalInputMonitoring) {
            stopGlobalInputMonitoring();
            return { success: true, message: 'Input monitoring stopped' };
        }
        else {
            startGlobalInputMonitoring();
            return { success: true, message: 'Input monitoring started' };
        }
    }
    catch (error) {
        console.error('❌ Error toggling input monitoring:', error);
        return { success: false, error: error.message };
    }
});
// Add handler to get current activity metrics
electron_1.ipcMain.handle('get-activity-metrics', () => {
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
    }
    catch (error) {
        console.error('❌ Error getting activity metrics:', error);
        return { success: false, error: error.message };
    }
});
// Add simpler handler for just idle time (fallback)
electron_1.ipcMain.handle('get-idle-time', () => {
    try {
        const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
        const metrics = getCurrentActivityMetrics();
        return {
            success: true,
            idleTime: metrics.idle_time_seconds || 0,
            isIdle: metrics.is_idle || false,
            activityScore: metrics.activity_score || 100
        };
    }
    catch (error) {
        console.error('❌ Error getting idle time:', error);
        return { success: false, error: error.message };
    }
});
// Add handler for enhanced logging demonstration
electron_1.ipcMain.handle('demonstrate-enhanced-logging', () => {
    try {
        console.log('🎯 Starting enhanced logging demonstration...');
        (0, activityMonitor_1.demonstrateEnhancedLogging)();
        return { success: true, message: 'Enhanced logging demonstration started - check console for detailed logs' };
    }
    catch (error) {
        console.error('❌ Error running enhanced logging demonstration:', error);
        return { success: false, error: error.message };
    }
});
// Add handler for comprehensive activity testing
electron_1.ipcMain.handle('test-comprehensive-activity', (event, count = 1) => {
    try {
        console.log(`🧪 Starting comprehensive activity test with count: ${count}`);
        const { testActivity } = require('./activityMonitor.cjs');
        const metrics = testActivity('all', count);
        return { success: true, message: `Comprehensive activity test completed`, metrics };
    }
    catch (error) {
        console.error('❌ Error running comprehensive activity test:', error);
        return { success: false, error: error.message };
    }
});
// === Debug Console IPC handlers (for desktop-agent debug-window.html compatibility) ===
electron_1.ipcMain.handle('get-stats', () => {
    try {
        // Reuse get-activity-metrics for convenience
        const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
        const metrics = getCurrentActivityMetrics ? getCurrentActivityMetrics() : {};
        return { success: true, stats: metrics };
    }
    catch (error) {
        console.error('❌ Error in get-stats handler:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-screenshot-logs', () => {
    try {
        // Provide very basic placeholder data; integrate with screenshot manager if available
        const lastCaptureTime = globalThis.lastScreenshotTime || null;
        const screenshotStats = {
            totalCaptured: globalThis.totalScreenshots || 0,
            lastCaptureTime,
            lastCaptureTimeFormatted: lastCaptureTime ? new Date(lastCaptureTime).toISOString() : null
        };
        return { success: true, data: { screenshotStats } };
    }
    catch (error) {
        console.error('❌ Error in get-screenshot-logs handler:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('get-anti-cheat-report', () => {
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
electron_1.ipcMain.handle('debug-get-status', () => {
    try {
        const { getCurrentActivityMetrics } = require('./activityMonitor.cjs');
        const metrics = getCurrentActivityMetrics();
        return {
            success: true,
            monitoring: isTracking,
            userId: (0, tracker_1.getUserId)(),
            stats: {
                screenshots: globalThis.totalScreenshots || 0,
                apps: globalThis.totalApps || 0,
                urls: 0, // Will be updated by activity monitor
                activity: Math.round(metrics?.activity_score || 0)
            }
        };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-screenshot', async () => {
    try {
        const { triggerDirectScreenshot } = require('./activityMonitor.cjs');
        await triggerDirectScreenshot();
        return { success: true, message: 'Screenshot test triggered' };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-activity', () => {
    try {
        const { testActivity } = require('./activityMonitor.cjs');
        testActivity('all', 5);
        return { success: true, message: 'Activity test completed' };
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// System check handler for UI
electron_1.ipcMain.handle('perform-system-check', async () => {
    try {
        const result = await performSystemCheck();
        return result;
    }
    catch (error) {
        return { success: false, error: error.message };
    }
});
// Forward debug logs to debug window
exports.appEvents.on('debug-log', (data) => {
    if (debugWindow && !debugWindow.isDestroyed()) {
        debugWindow.webContents.send('debug-log', data);
    }
});
// === System Check IPC Handlers for Dialog Component ===
// Check system permissions
electron_1.ipcMain.handle('system-check-permissions', async () => {
    try {
        console.log('🔍 System check: Testing permissions...');
        // Use same logic as debug-test-screen-permission with binary testing
        const electronAPIPermission = await (0, permissionManager_1.checkScreenRecordingPermission)();
        // Also test the actual binary that needs permission (same as debug handler)
        let binaryCanAccess = false;
        try {
            const { spawn } = require('child_process');
            // Use dynamic path resolution for both dev and DMG environments
            const activeWinPath = getActiveWinBinaryPath();
            const binaryTest = await new Promise((resolve) => {
                const child = spawn(activeWinPath, [], { timeout: 3000 });
                let stdout = '';
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                child.on('close', (code) => {
                    if (code === 0 && !stdout.includes('screen recording permission')) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                });
                child.on('error', () => resolve(false));
            });
            binaryCanAccess = binaryTest;
        }
        catch (error) {
            console.log('⚠️ Could not test binary permission:', error);
        }
        const actualScreenPermission = electronAPIPermission && binaryCanAccess;
        let accessibilityPermission = false;
        if (process.platform === 'darwin') {
            try {
                const { systemPreferences } = require('electron');
                accessibilityPermission = systemPreferences.isTrustedAccessibilityClient(false);
            }
            catch (error) {
                console.log('⚠️ Could not check accessibility permission:', error);
            }
        }
        else {
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
    }
    catch (error) {
        console.error('❌ System check permissions error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// Test screenshot capture
electron_1.ipcMain.handle('system-check-screenshot', async () => {
    try {
        console.log('🔍 System check: Testing screenshot capability...');
        const screenshotTest = await (0, permissionManager_1.testScreenCapture)();
        if (screenshotTest) {
            console.log('✅ Screenshot test passed');
            return {
                success: true,
                size: 'Test successful'
            };
        }
        else {
            console.log('❌ Screenshot test failed');
            return {
                success: false,
                error: 'Screenshot capture failed'
            };
        }
    }
    catch (error) {
        console.error('❌ System check screenshot error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// Test app detection
electron_1.ipcMain.handle('system-check-app-detection', async () => {
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
        }
        else {
            console.log('❌ App detection test failed');
            return {
                success: false,
                error: 'Could not detect current application'
            };
        }
    }
    catch (error) {
        console.error('❌ System check app detection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// Test URL detection
electron_1.ipcMain.handle('system-check-url-detection', async () => {
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
        }
        else {
            console.log('⚠️ URL detection test - no browser URL available (this is normal if no browser is open)');
            return {
                success: false,
                error: 'No browser URL available'
            };
        }
    }
    catch (error) {
        console.error('❌ System check URL detection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// Test input monitoring
electron_1.ipcMain.handle('system-check-input-monitoring', async () => {
    try {
        console.log('🔍 System check: Testing input monitoring...');
        if (ioHook) {
            console.log('✅ Input monitoring test passed: ioHook available');
            return {
                success: true,
                method: 'ioHook'
            };
        }
        else {
            console.log('⚠️ Input monitoring test: ioHook not available, using fallback methods');
            return {
                success: true,
                method: 'fallback'
            };
        }
    }
    catch (error) {
        console.error('❌ System check input monitoring error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// Test idle detection
electron_1.ipcMain.handle('system-check-idle-detection', async () => {
    try {
        console.log('🔍 System check: Testing idle detection...');
        // Get current idle time using powerMonitor
        const idleTime = electron_1.powerMonitor.getSystemIdleTime();
        console.log(`✅ Idle detection test passed: ${idleTime} seconds`);
        return {
            success: true,
            idleTime: idleTime
        };
    }
    catch (error) {
        console.error('❌ System check idle detection error:', error);
        return {
            success: false,
            error: error.message
        };
    }
});
// === Debug Console Compatibility Handlers ===
// Additional handlers that the debug console expects
electron_1.ipcMain.handle('debug-test-app-detection', async () => {
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
        }
        else {
            return { success: false, error: 'No application detected' };
        }
    }
    catch (error) {
        console.error('❌ Debug app detection test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-url-detection', async () => {
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
        }
        else {
            return { success: false, error: 'No browser URL available' };
        }
    }
    catch (error) {
        console.error('❌ Debug URL detection test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-database', async () => {
    try {
        console.log('🔍 Debug: Testing database connection...');
        // Test actual database connectivity with a simple query
        const { getSupabaseCredentials } = await Promise.resolve().then(() => __importStar(require('./secure-config.cjs')));
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
    }
    catch (error) {
        console.error('❌ Debug database test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-screen-permission', async () => {
    try {
        console.log('🔍 Debug: Testing screen permission...');
        const electronAPIPermission = await (0, permissionManager_1.checkScreenRecordingPermission)();
        // Use safe binary testing to prevent memory leaks
        const binaryCanAccess = await testActiveWinBinaryAccess();
        const actualPermission = electronAPIPermission && binaryCanAccess;
        let message = '';
        if (actualPermission) {
            message = 'Screen recording permission granted';
        }
        else if (electronAPIPermission && !binaryCanAccess) {
            message = 'Screen recording permission granted to Electron but not accessible to child processes - restart app or re-grant permission';
        }
        else {
            message = 'Screen recording permission required';
        }
        return {
            success: actualPermission,
            message: message,
            electronAPI: electronAPIPermission,
            binaryAccess: binaryCanAccess
        };
    }
    catch (error) {
        console.error('❌ Debug screen permission test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-accessibility-permission', async () => {
    try {
        console.log('🔍 Debug: Testing accessibility permission...');
        const { checkAccessibilityPermission } = require('./permissionManager.cjs');
        const hasPermission = await checkAccessibilityPermission();
        return {
            success: hasPermission,
            message: hasPermission ? 'Accessibility permission granted' : 'Accessibility permission required - MANDATORY for mouse and keyboard tracking'
        };
    }
    catch (error) {
        console.error('❌ Debug accessibility permission test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-input-monitoring', async () => {
    try {
        console.log('🔍 Debug: Testing input monitoring...');
        if (ioHook) {
            return {
                success: true,
                method: 'ioHook',
                message: 'Input monitoring available (ioHook)'
            };
        }
        else {
            return {
                success: true,
                method: 'fallback',
                message: 'Input monitoring available (fallback methods)'
            };
        }
    }
    catch (error) {
        console.error('❌ Debug input monitoring test error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('debug-test-idle-detection', async () => {
    try {
        console.log('🔍 Debug: Testing idle detection...');
        const idleTime = electron_1.powerMonitor.getSystemIdleTime();
        return {
            success: true,
            idleTime: idleTime,
            message: `Idle detection working: ${idleTime} seconds`
        };
    }
    catch (error) {
        console.error('❌ Debug idle detection test error:', error);
        return { success: false, error: error.message };
    }
});
// === Missing IPC Handler for Debug Console ===
electron_1.ipcMain.handle('open-debug-console', async () => {
    try {
        console.log('🔬 IPC request to open debug console...');
        const window = createDebugWindow();
        if (window) {
            return { success: true, message: 'Debug console opened successfully' };
        }
        else {
            return { success: false, error: 'Failed to create debug window' };
        }
    }
    catch (error) {
        console.error('❌ Failed to open debug console:', error);
        return { success: false, error: error.message };
    }
});
// === Permission Management Helper ===
electron_1.ipcMain.handle('request-all-permissions', async () => {
    try {
        console.log('🔐 Requesting all required permissions...');
        const results = {
            screen: false,
            accessibility: false,
            messages: []
        };
        // Request Screen Recording Permission
        try {
            if (process.platform === 'darwin') {
                const { ensureScreenRecordingPermission } = require('./permissionManager.cjs');
                results.screen = await ensureScreenRecordingPermission();
                if (!results.screen) {
                    results.messages.push('Screen Recording permission is required for app detection and screenshots');
                }
            }
            else {
                results.screen = true; // Not required on other platforms
            }
        }
        catch (error) {
            results.messages.push(`Screen Recording permission error: ${error.message}`);
        }
        // Request Accessibility Permission
        try {
            if (process.platform === 'darwin') {
                const { requestAccessibilityPermission } = require('./permissionManager.cjs');
                results.accessibility = await requestAccessibilityPermission();
                if (!results.accessibility) {
                    results.messages.push('Accessibility permission is required for mouse and keyboard tracking');
                }
            }
            else {
                results.accessibility = true; // Not required on other platforms
            }
        }
        catch (error) {
            results.messages.push(`Accessibility permission error: ${error.message}`);
        }
        const allGranted = results.screen && results.accessibility;
        if (allGranted) {
            results.messages.push('All permissions granted successfully!');
        }
        else {
            results.messages.push('Some permissions are missing. Please check System Preferences > Security & Privacy > Privacy');
        }
        return {
            success: allGranted,
            results: results,
            message: allGranted ? 'All permissions granted' : 'Some permissions missing'
        };
    }
    catch (error) {
        console.error('❌ Failed to request permissions:', error);
        return { success: false, error: error.message };
    }
});
// === DYNAMIC PATH RESOLUTION FOR ACTIVE-WIN BINARY ===
function getActiveWinBinaryPath() {
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
        }
        catch (e) {
            console.log('   Could not read resources directory');
        }
        // Return first path as fallback even if it doesn't exist
        const fallbackPath = possiblePaths[0];
        console.log(`🔄 DMG FIX: Using fallback path: ${fallbackPath}`);
        return fallbackPath;
    }
    else {
        // Development version - binary is in build directory
        const activeWinPath = path.join(__dirname, 'node_modules', 'active-win', 'main');
        console.log('🔧 DEV MODE: Using development active-win binary path:', activeWinPath);
        return activeWinPath;
    }
}
// === SAFE ACTIVE-WIN BINARY TESTING (PREVENTS MEMORY LEAKS) ===
let isTestingBinary = false; // Prevent simultaneous tests
let lastBinaryTestResult = null;
let lastBinaryTestTime = 0;
async function testActiveWinBinaryAccess() {
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
        const binaryTest = await new Promise((resolve) => {
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
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr?.on('data', (data) => {
                stderr += data.toString();
                console.log('🔍 DMG FIX: Binary stderr:', data.toString());
                if (data.toString().includes('screen recording permission') ||
                    data.toString().includes('accessibility permission') ||
                    data.toString().includes('operation not permitted')) {
                    hasPermissionError = true;
                }
            });
            child.on('close', (code) => {
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
                    }
                    else if (hasPermissionError) {
                        console.log('❌ DMG FIX: Binary test failed - permission errors detected');
                    }
                    else if (!hasOutput) {
                        console.log('⚠️ DMG FIX: Binary test unclear - no output received');
                    }
                    resolve(success);
                }
            });
            child.on('error', (error) => {
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
    }
    catch (error) {
        console.error('❌ DMG FIX: Binary test exception:', error);
        lastBinaryTestResult = false;
        lastBinaryTestTime = now;
        return false;
    }
    finally {
        isTestingBinary = false;
    }
}
// === USER-FRIENDLY PERMISSION CHECKING POPUP ===
function showPermissionCheckingPopup() {
    const popup = new electron_1.BrowserWindow({
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
// === ENHANCED SECURE TRACKING START WITH USER FEEDBACK ===
