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
            title: 'TimeFlow - Auto-Stop',
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
    // Create the employee desktop app window
    mainWindow = new electron_1.BrowserWindow({
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
electron_1.ipcMain.on('set-user-id', (_e, id) => {
    (0, tracker_1.setUserId)(id);
    // Don't auto-start activity monitoring - wait for explicit start command
    console.log('✅ User ID set:', id, '- Waiting for manual tracking start');
});
electron_1.ipcMain.on('start-tracking', () => {
    console.log('▶️ Manual tracking start requested');
    (0, tracker_1.startTracking)();
    startTrackingTimer();
});
electron_1.ipcMain.on('stop-tracking', () => {
    console.log('⏸️ Manual tracking stop requested');
    (0, tracker_1.stopTracking)();
    stopTrackingTimer();
});
electron_1.ipcMain.on('sync-offline-data', () => void (0, tracker_1.syncOfflineData)());
electron_1.ipcMain.handle('load-session', () => (0, tracker_1.loadSession)());
electron_1.ipcMain.on('clear-session', () => (0, tracker_1.clearSavedSession)());
electron_1.ipcMain.on('logout', () => {
    console.log('🚪 Logout requested from UI');
    // Clear session and stop tracking
    (0, tracker_1.clearSavedSession)();
    stopTrackingTimer();
    (0, activityMonitor_1.stopActivityMonitoring)();
    // Reload the window to show login screen
    if (mainWindow) {
        mainWindow.reload();
    }
    console.log('🚪 User logged out - session cleared and tracking stopped');
});
// Add missing get-config handler
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
// Add missing fetch-screenshots handler
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
// Handle user login from desktop-agent UI
electron_1.ipcMain.on('user-logged-in', (event, user) => {
    console.log('👤 User logged in from UI:', user.email);
    (0, tracker_1.setUserId)(user.id);
    console.log('✅ User ID set, ready for manual tracking start');
});
// Handle activity monitoring start from desktop-agent UI
electron_1.ipcMain.on('start-activity-monitoring', (event, userId) => {
    console.log('🚀 Starting activity monitoring for user:', userId);
    (0, tracker_1.setUserId)(userId);
    (0, activityMonitor_1.startActivityMonitoring)(userId);
    startTrackingTimer();
    console.log('✅ Activity monitoring started from UI');
});
// Create tray icon
function createTray() {
    // Use the assets from the electron directory
    const iconPath = process.platform === 'darwin'
        ? path.join(__dirname, '../assets/tray-icon.png') // macOS uses regular PNG
        : path.join(__dirname, '../assets/tray-icon.png');
    console.log('🔍 Loading tray icon from:', iconPath);
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
    // Create context menu
    updateTrayMenu();
    // Handle click events
    tray.on('click', () => {
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
    return tray;
}
// Create a simple icon as base64 (16x16 green circle)
function createSimpleIcon() {
    // This is a simple 16x16 PNG icon encoded as base64
    return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQLwcJCG1sLwUKwsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQsLGwsLBQ';
}
// Update tray menu
function updateTrayMenu() {
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
        {
            label: '📸 Take Screenshot',
            click: () => {
                (0, activityMonitor_1.triggerActivityCapture)();
                showScreenshotNotification();
            }
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
        tray.setToolTip('TimeFlow - Not tracking');
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
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    tray.setToolTip(`TimeFlow - Tracking: ${timeString}`);
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
