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

  // In development, load from Vite dev server, in production load from file
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    const devUrl = 'http://localhost:8080';
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
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
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
