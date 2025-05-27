import 'dotenv/config';
import { app, BrowserWindow, ipcMain, powerMonitor, screen, nativeImage, shell, Menu } from 'electron';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { setUserId, startTracking, stopTracking, syncOfflineData, loadSession, clearSavedSession } from './tracker';
import { setupAutoLaunch } from './autoLaunch';
import { initSystemMonitor } from './systemMonitor';
import { startSyncLoop } from './unsyncedManager';
import { startActivityMonitoring, stopActivityMonitoring, triggerActivityCapture, triggerDirectScreenshot } from './activityMonitor';
import { ensureScreenRecordingPermission, testScreenCapture } from './permissionManager';
import { screenshotIntervalSeconds } from './config';

// Debug environment variables
console.log('🔧 Environment variables at startup:');
console.log('   SCREENSHOT_INTERVAL_SECONDS:', process.env.SCREENSHOT_INTERVAL_SECONDS);
console.log('   Config screenshotIntervalSeconds:', screenshotIntervalSeconds);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
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
    // Try multiple ports to find where Vite is running
    const tryPorts = [8080, 8081, 8082, 8083];
    let devUrl = 'http://localhost:8080';
    let foundPort = false;
    
    for (const port of tryPorts) {
      try {
        const testUrl = `http://localhost:${port}`;
        
        // Test if port is responding and serving Vite content
        await new Promise<void>((resolve, reject) => {
          const req = http.get(testUrl, (res: http.IncomingMessage) => {
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
                } else {
                  reject(new Error(`Port ${port} not serving Vite content`));
                }
              });
            } else {
              reject(new Error(`Port ${port} returned status ${res.statusCode}`));
            }
          });
          req.on('error', reject);
          req.setTimeout(2000, () => reject(new Error(`Timeout for port ${port}`)));
        });
        
        console.log(`Found Vite dev server on port ${port}`);
        break;
      } catch (e) {
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

app.whenReady().then(async () => {
  await createWindow();
  
  // Request screen recording permission on startup
  console.log('🚀 App ready, checking permissions...');
  const hasPermission = await ensureScreenRecordingPermission();
  
  if (hasPermission) {
    // Test screen capture capability
    await testScreenCapture();
    console.log('✅ App ready with screen recording permission');
  } else {
    console.log('⚠️  App ready but screen recording permission missing');
  }
  
  // Auto-load desktop-agent config if it exists
  try {
    // Try multiple possible paths for the config file
    const possiblePaths = [
      path.join(__dirname, '../desktop-agent/config.json'),
      path.join(__dirname, '../../desktop-agent/config.json'),
      path.join(process.cwd(), 'desktop-agent/config.json'),
      path.join(app.getAppPath(), 'desktop-agent/config.json')
    ];
    
    let configPath = '';
    let config: any = null;
    
    for (const testPath of possiblePaths) {
      console.log('🔍 Checking config path:', testPath);
      if (fs.existsSync(testPath)) {
        configPath = testPath;
        config = JSON.parse(fs.readFileSync(testPath, 'utf8'));
        console.log('📋 Found desktop-agent config at:', configPath);
        break;
      }
    }
    
    if (config && config.user_id && config.auto_start_tracking) {
      console.log('🚀 Auto-starting activity monitoring for user:', config.user_id);
      setUserId(config.user_id);
      startActivityMonitoring(config.user_id);
    } else if (!config) {
      console.log('⚠️  No desktop-agent config found in any expected location');
    }
  } catch (error) {
    console.log('⚠️  Could not load desktop-agent config:', error);
  }
  
  setupAutoLaunch().catch(err => console.error(err));
  initSystemMonitor();
  startSyncLoop();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('set-user-id', (_e, id) => {
  setUserId(id);
  // Start always-on activity monitoring when user ID is set
  startActivityMonitoring(id);
});
ipcMain.on('start-tracking', () => void startTracking());
ipcMain.on('stop-tracking', () => void stopTracking());
ipcMain.on('sync-offline-data', () => void syncOfflineData());
ipcMain.handle('load-session', () => loadSession());
ipcMain.on('clear-session', () => clearSavedSession());
ipcMain.on('trigger-activity-capture', () => triggerActivityCapture());
ipcMain.handle('trigger-direct-screenshot', async () => await triggerDirectScreenshot());

// Add test mode for development
ipcMain.on('start-test-mode', () => {
  console.log('🧪 Starting test mode - simulating user login...');
  const testUserId = 'test-user-12345';
  setUserId(testUserId);
  startActivityMonitoring(testUserId);
  console.log('✅ Test mode started - activity monitoring should begin');
});
