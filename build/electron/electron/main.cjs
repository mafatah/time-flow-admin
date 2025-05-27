"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const tracker_1 = require("./tracker.cjs");
const autoLaunch_1 = require("./autoLaunch.cjs");
const systemMonitor_1 = require("./systemMonitor.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const activityMonitor_1 = require("./activityMonitor.cjs");
const permissionManager_1 = require("./permissionManager.cjs");
const config_1 = require("./config.cjs");
// Debug environment variables
console.log('🔧 Environment variables at startup:');
console.log('   SCREENSHOT_INTERVAL_SECONDS:', process.env.SCREENSHOT_INTERVAL_SECONDS);
console.log('   Config screenshotIntervalSeconds:', config_1.screenshotIntervalSeconds);
let mainWindow = null;
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.cjs'),
        },
    });
    // In development, load from Vite dev server, in production load from file
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
        // Try multiple ports to find where Vite is running
        const tryPorts = [8080, 8081, 8082, 8083];
        let devUrl = 'http://localhost:8080';
        let foundPort = false;
        for (const port of tryPorts) {
            try {
                const testUrl = `http://localhost:${port}`;
                // Test if port is responding and serving Vite content
                await new Promise((resolve, reject) => {
                    const req = http_1.default.get(testUrl, (res) => {
                        if (res.statusCode === 200) {
                            let data = '';
                            res.on('data', chunk => {
                                data += chunk;
                            });
                            res.on('end', () => {
                                // Check if response contains Vite characteristics
                                if (data.includes('vite') || data.includes('__vite_dev__') || data.includes('react')) {
                                    devUrl = testUrl;
                                    foundPort = true;
                                    resolve();
                                }
                                else {
                                    reject(new Error(`Port ${port} not serving Vite content`));
                                }
                            });
                        }
                        else {
                            reject(new Error(`Port ${port} returned status ${res.statusCode}`));
                        }
                    });
                    req.on('error', reject);
                    req.setTimeout(2000, () => reject(new Error(`Timeout for port ${port}`)));
                });
                console.log(`Found Vite dev server on port ${port}`);
                break;
            }
            catch (e) {
                console.log(`Port ${port} not available:`, e instanceof Error ? e.message : 'Unknown error');
                continue;
            }
        }
        if (!foundPort) {
            console.warn('No Vite dev server found on any port, using default port 8080');
        }
        console.log('Loading UI from dev server:', devUrl);
        mainWindow.loadURL(devUrl)
            .then(() => {
            // Set initial hash route for HashRouter compatibility
            mainWindow?.webContents.executeJavaScript(`
          // Wait for React to load, then set initial route
          setTimeout(() => {
            if (window.location.hash === '' || window.location.hash === '#/') {
              window.location.hash = '#/';
            }
          }, 1000);
        `);
        })
            .catch(err => console.error('Failed to load UI from dev server:', err));
    }
    else {
        const indexPath = path_1.default.join(__dirname, '../../dist/index.html');
        console.log('Loading UI from:', indexPath);
        mainWindow.loadFile(indexPath)
            .then(() => {
            // Set initial hash route for HashRouter compatibility
            mainWindow?.webContents.executeJavaScript(`
          // Wait for React to load, then set initial route
          setTimeout(() => {
            if (window.location.hash === '' || window.location.hash === '#/') {
              window.location.hash = '#/';
            }
          }, 1000);
        `);
        })
            .catch(err => console.error('Failed to load UI:', err));
    }
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
}
electron_1.app.whenReady().then(async () => {
    await createWindow();
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
    // Auto-load desktop-agent config if it exists
    try {
        // Try multiple possible paths for the config file
        const possiblePaths = [
            path_1.default.join(__dirname, '../desktop-agent/config.json'),
            path_1.default.join(__dirname, '../../desktop-agent/config.json'),
            path_1.default.join(process.cwd(), 'desktop-agent/config.json'),
            path_1.default.join(electron_1.app.getAppPath(), 'desktop-agent/config.json')
        ];
        let configPath = '';
        let config = null;
        for (const testPath of possiblePaths) {
            console.log('🔍 Checking config path:', testPath);
            if (fs_1.default.existsSync(testPath)) {
                configPath = testPath;
                config = JSON.parse(fs_1.default.readFileSync(testPath, 'utf8'));
                console.log('📋 Found desktop-agent config at:', configPath);
                break;
            }
        }
        if (config && config.user_id && config.auto_start_tracking) {
            console.log('🚀 Auto-starting activity monitoring for user:', config.user_id);
            (0, tracker_1.setUserId)(config.user_id);
            (0, activityMonitor_1.startActivityMonitoring)(config.user_id);
        }
        else if (!config) {
            console.log('⚠️  No desktop-agent config found in any expected location');
        }
    }
    catch (error) {
        console.log('⚠️  Could not load desktop-agent config:', error);
    }
    (0, autoLaunch_1.setupAutoLaunch)().catch(err => console.error(err));
    (0, systemMonitor_1.initSystemMonitor)();
    (0, unsyncedManager_1.startSyncLoop)();
    electron_1.app.on('activate', async () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            await createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.ipcMain.on('set-user-id', (_e, id) => {
    (0, tracker_1.setUserId)(id);
    // Start always-on activity monitoring when user ID is set
    (0, activityMonitor_1.startActivityMonitoring)(id);
});
electron_1.ipcMain.on('start-tracking', () => void (0, tracker_1.startTracking)());
electron_1.ipcMain.on('stop-tracking', () => void (0, tracker_1.stopTracking)());
electron_1.ipcMain.on('sync-offline-data', () => void (0, tracker_1.syncOfflineData)());
electron_1.ipcMain.handle('load-session', () => (0, tracker_1.loadSession)());
electron_1.ipcMain.on('clear-session', () => (0, tracker_1.clearSavedSession)());
electron_1.ipcMain.on('trigger-activity-capture', () => (0, activityMonitor_1.triggerActivityCapture)());
electron_1.ipcMain.handle('trigger-direct-screenshot', async () => await (0, activityMonitor_1.triggerDirectScreenshot)());
// Add test mode for development
electron_1.ipcMain.on('start-test-mode', () => {
    console.log('🧪 Starting test mode - simulating user login...');
    const testUserId = 'test-user-12345';
    (0, tracker_1.setUserId)(testUserId);
    (0, activityMonitor_1.startActivityMonitoring)(testUserId);
    console.log('✅ Test mode started - activity monitoring should begin');
});
