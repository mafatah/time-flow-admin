import 'dotenv/config';
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { setUserId, setTaskId, startTracking, stopTracking, syncOfflineData, loadSession, clearSavedSession } from './tracker';
import { setupAutoLaunch } from './autoLaunch';
import { initSystemMonitor } from './systemMonitor';
import { startSyncLoop } from './unsyncedManager';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath).catch(err => console.error('Failed to load UI:', err));
}

app.whenReady().then(() => {
  createWindow();
  setupAutoLaunch().catch(err => console.error(err));
  initSystemMonitor();
  startSyncLoop();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('set-user-id', (_e, id) => setUserId(id));
ipcMain.on('set-task-id', (_e, id) => setTaskId(id));
ipcMain.on('start-tracking', () => void startTracking());
ipcMain.on('stop-tracking', () => void stopTracking());
ipcMain.on('sync-offline-data', () => void syncOfflineData());
ipcMain.handle('load-session', () => loadSession());
ipcMain.on('clear-session', () => clearSavedSession());
