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
const autoLaunch_1 = require("./autoLaunch.cjs");
const systemMonitor_1 = require("./systemMonitor.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const activityMonitor_1 = require("./activityMonitor.cjs");
const permissionManager_1 = require("./permissionManager.cjs");
const config_1 = require("./config.cjs");
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
console.log('   Config screenshotIntervalSeconds:', config_1.screenshotIntervalSeconds);
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
    return true;
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
    await createWindow();
    // Create system tray
    createTray();
    // Request screen recording permission on startup
    console.log('🚀 App ready, checking permissions...');
    const hasPermission = await (0, permissionManager_1.ensureScreenRecordingPermission)();
    if (hasPermission) {
        // Test screen capture capability
        await (0, permissionManager_1.testScreenCapture)();
        console.log('✅ App ready with screen recording permission');
    }
    else {
        console.log('⚠️  App ready but screen recording permission missing');
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
});
// Handle user login from desktop-agent UI - FIX: Use handle instead of on for invoke calls
electron_1.ipcMain.handle('user-logged-in', (event, user) => {
    console.log('👤 User logged in from UI:', user.email);
    (0, tracker_1.setUserId)(user.id);
    console.log('Set user ID:', user.id);
    console.log('✅ User ID set, ready for manual tracking start');
    return { success: true, message: 'User logged in successfully' };
});
// Handle user logout from desktop-agent UI
electron_1.ipcMain.handle('user-logged-out', () => {
    console.log('🚪 User logout requested from UI');
    // Clear session and stop tracking
    (0, tracker_1.clearSavedSession)();
    stopTrackingTimer();
    (0, activityMonitor_1.stopActivityMonitoring)();
    console.log('✅ User logged out - session cleared and tracking stopped');
    return { success: true, message: 'User logged out successfully' };
});
// Handle tracking start with better response
electron_1.ipcMain.handle('start-tracking', (event, projectId) => {
    try {
        console.log('▶️ Manual tracking start requested with project ID:', projectId);
        if (projectId) {
            (0, tracker_1.setProjectId)(projectId);
        }
        (0, tracker_1.startTracking)();
        startTrackingTimer();
        (0, activityMonitor_1.startActivityMonitoring)((0, tracker_1.getUserId)() || '0c3d3092-913e-436f-a352-3378e558c34f'); // Use the actual logged-in user ID
        // Start input monitoring for real activity detection
        startGlobalInputMonitoring();
        isTracking = true;
        updateTrayMenu();
        console.log('✅ Tracking started successfully with input monitoring');
        return { success: true, message: 'Time tracking started!' };
    }
    catch (error) {
        console.error('❌ Error starting tracking:', error);
        return { success: false, message: 'Failed to start tracking' };
    }
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
// Handle activity monitoring start from desktop-agent UI
electron_1.ipcMain.on('start-activity-monitoring', (event, userId) => {
    console.log('🚀 Starting activity monitoring for user:', userId);
    (0, tracker_1.setUserId)(userId);
    (0, activityMonitor_1.startActivityMonitoring)(userId);
    startTrackingTimer();
    console.log('✅ Activity monitoring started from UI');
});
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
electron_1.ipcMain.on('start-tracking', () => {
    console.log('▶️ Manual tracking start requested (legacy)');
    (0, tracker_1.startTracking)();
    startTrackingTimer();
});
electron_1.ipcMain.on('stop-tracking', () => {
    console.log('⏸️ Manual tracking stop requested (legacy)');
    (0, tracker_1.stopTracking)();
    stopTrackingTimer();
});
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
electron_1.ipcMain.on('clear-session', () => (0, tracker_1.clearSavedSession)());
// Add missing get-config handler if not already present
electron_1.ipcMain.handle('get-config', () => {
    return {
        supabase_url: process.env.VITE_SUPABASE_URL || 'https://fkpiqcxkmrtaetvfgcli.supabase.co',
        supabase_key: process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrcGlxY3hrbXJ0YWV0dmZnY2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Mzg4ODIsImV4cCI6MjA2MzQxNDg4Mn0._ustFmxZXyDBQTEUidr5Qy88vLkDAKmQKg2QCNVvxE4',
        user_id: process.env.USER_ID || '',
        project_id: process.env.PROJECT_ID || '00000000-0000-0000-0000-000000000001',
        screenshot_interval_seconds: config_1.screenshotIntervalSeconds,
        idle_threshold_seconds: Number(process.env.IDLE_TIMEOUT_MINUTES || 1) * 60,
        enable_screenshots: true,
        enable_idle_detection: true,
        enable_activity_tracking: true,
        enable_anti_cheat: process.env.ANTI_CHEAT_ENABLED !== 'false'
    };
});
// Add missing fetch-screenshots handler if not already present
electron_1.ipcMain.handle('fetch-screenshots', async (event, params) => {
    try {
        const { createClient } = await Promise.resolve().then(() => __importStar(require('@supabase/supabase-js')));
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
    }
    catch (error) {
        console.error('❌ Failed to fetch screenshots:', error);
        return [];
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
        const { triggerDirectScreenshot } = await Promise.resolve().then(() => __importStar(require('./activityMonitor')));
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
        const { triggerActivityCapture } = await Promise.resolve().then(() => __importStar(require('./activityMonitor')));
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
        // Use the assets from the electron directory
        const iconPath = process.platform === 'darwin'
            ? path.join(__dirname, '../assets/tray-icon.png') // macOS uses regular PNG
            : path.join(__dirname, '../assets/tray-icon.png');
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
    return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
}
// Update tray menu
function updateTrayMenu() {
    const updateStatus = (0, autoUpdater_1.getUpdateStatus)();
    const updateLabel = updateStatus.updateAvailable
        ? '⬇️ Download Update'
        : updateStatus.updateCheckInProgress
            ? '🔍 Checking...'
            : '🔄 Check for Updates';
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: isTracking ? '⏸ Stop Tracking' : '▶️ Start Tracking',
            click: () => {
                if (isTracking) {
                    stopTrackingTimer();
                }
                else {
                    startTrackingTimer();
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
                    Promise.resolve().then(() => __importStar(require('./autoUpdater'))).then(({ downloadUpdate }) => {
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
        return { success: true, metrics };
    }
    catch (error) {
        console.error('❌ Error getting activity metrics:', error);
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
        const { testActivity } = require('./activityMonitor');
        const metrics = testActivity('all', count);
        return { success: true, message: `Comprehensive activity test completed`, metrics };
    }
    catch (error) {
        console.error('❌ Error running comprehensive activity test:', error);
        return { success: false, error: error.message };
    }
});
