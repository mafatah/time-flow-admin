"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const tracker_1 = require("./tracker");
const autoLaunch_1 = require("./autoLaunch");
const systemMonitor_1 = require("./systemMonitor");
const unsyncedManager_1 = require("./unsyncedManager");
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
    });
    const indexPath = path_1.default.join(__dirname, '../dist/index.html');
    console.log('Loading UI from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => console.error('Failed to load UI:', err));
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
}
electron_1.app.whenReady().then(() => {
    createWindow();
    (0, autoLaunch_1.setupAutoLaunch)().catch(err => console.error(err));
    (0, systemMonitor_1.initSystemMonitor)();
    (0, unsyncedManager_1.startSyncLoop)();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.ipcMain.on('set-user-id', (_e, id) => (0, tracker_1.setUserId)(id));
electron_1.ipcMain.on('set-task-id', (_e, id) => (0, tracker_1.setTaskId)(id));
electron_1.ipcMain.on('start-tracking', () => void (0, tracker_1.startTracking)());
electron_1.ipcMain.on('stop-tracking', () => void (0, tracker_1.stopTracking)());
electron_1.ipcMain.on('sync-offline-data', () => void (0, tracker_1.syncOfflineData)());
electron_1.ipcMain.handle('load-session', () => (0, tracker_1.loadSession)());
electron_1.ipcMain.on('clear-session', () => (0, tracker_1.clearSavedSession)());
