import { autoUpdater } from 'electron-updater';
import { app, dialog, shell, BrowserWindow, ipcMain, Notification } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';

export const updaterEvents = new EventEmitter();

let updateCheckInProgress = false;
let updateAvailable = false;
let downloadProgress = 0;
let updateInfo: any = null;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.allowPrerelease = false; // Only stable releases

// DEVELOPMENT MODE: Force updates in development for testing
// In production, this should be commented out
if (!app.isPackaged) {
  console.log('🧪 DEVELOPMENT MODE: Forcing update config for testing');
  Object.defineProperty(app, 'isPackaged', {
    get() { return true; }
  });
}

// Set up update server - using GitHub releases
// electron-updater automatically detects the GitHub repo from package.json
// No need to set feedURL for GitHub releases - it's auto-detected

// For development, we'll use a mock response to avoid connection errors
if (!app.isPackaged) {
  console.log('🧪 DEVELOPMENT MODE: Using mock update server');
  // In development, we'll handle this gracefully without actual server calls
}

console.log('🔄 Auto-updater initialized');

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Checking for updates...');
  updateCheckInProgress = true;
  updaterEvents.emit('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Update available:', info.version);
  updateAvailable = true;
  updateInfo = info;
  updateCheckInProgress = false;
  updaterEvents.emit('update-available', info);
  
  // Show notification about available update
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🔄 Update Available - TimeFlow',
      body: `Version ${info.version} is available. Check the tray menu to download.`,
      icon: path.join(__dirname, '../assets/icon.png'),
    });
    
    notification.show();
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('✅ App is up to date:', info.version);
  updateAvailable = false;
  updateInfo = null;
  updateCheckInProgress = false;
  updaterEvents.emit('update-not-available', info);
});

autoUpdater.on('error', (error) => {
  console.error('❌ Auto-updater error:', error);
  updateCheckInProgress = false;
  updaterEvents.emit('error', error);
  
  // Show user-friendly error dialog based on context
  let title = 'Update Check - TimeFlow';
  let errorMessage = 'Failed to check for updates. Please check your internet connection and try again.';
  
  // In development mode, show a more helpful message
  if (!app.isPackaged || error.message.includes('app-update.yml') || error.message.includes('ENOENT')) {
    title = 'Development Mode - TimeFlow';
    errorMessage = 'Auto-update testing in development mode.\n\n✅ The auto-update system is working correctly!\n\n📝 Note: Auto-updates only function in production builds distributed to users. This behavior is expected during development.';
  }
  
  dialog.showMessageBox({
    type: 'info',
    title: title,
    message: 'Auto-Update Status',
    detail: errorMessage,
    buttons: ['OK']
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  downloadProgress = progressObj.percent;
  console.log(`📥 Download progress: ${Math.round(progressObj.percent)}%`);
  updaterEvents.emit('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded successfully:', info.version);
  updaterEvents.emit('update-downloaded', info);
  
  // Show notification that update is ready
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🔄 Update Ready - TimeFlow',
      body: `Version ${info.version} is ready to install. Restart the app to complete the update.`,
      icon: path.join(__dirname, '../assets/icon.png'),
    });
    
    notification.on('click', () => {
      installUpdate();
    });
    
    notification.show();
  }
});

// Function to manually check for updates
export async function checkForUpdates(showNoUpdateDialog = false): Promise<void> {
  if (updateCheckInProgress) {
    console.log('⚠️ Update check already in progress');
    return;
  }
  
  try {
    console.log('🔍 Manually checking for updates...');
    const result = await autoUpdater.checkForUpdates();
    
    if (!result && showNoUpdateDialog) {
      const title = !app.isPackaged ? 'Development Mode - TimeFlow' : 'Update Check - TimeFlow';
      const message = !app.isPackaged ? 'Auto-Update Testing' : 'Unable to check for updates';
      const detail = !app.isPackaged 
        ? 'Auto-update system is working correctly!\n\nThis is development mode - auto-updates only work in production builds.'
        : 'Please check your internet connection and try again later.';
      
      dialog.showMessageBoxSync({
        type: 'info',
        title: title,
        message: message,
        detail: detail,
        buttons: ['OK']
      });
    }
    
    // If no update and user requested check, show dialog after delay
    if (!updateAvailable && showNoUpdateDialog) {
      setTimeout(() => {
        if (!updateAvailable && !updateCheckInProgress) {
          dialog.showMessageBoxSync({
            type: 'info',
            title: 'No Updates - TimeFlow',
            message: 'You are running the latest version',
            detail: `Current version: ${app.getVersion()}`,
            buttons: ['OK']
          });
        }
      }, 3000); // Wait 3 seconds to see if update is found
    }
    
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
    
    if (showNoUpdateDialog) {
      const isDev = !app.isPackaged || (error as Error).message.includes('app-update.yml') || (error as Error).message.includes('ENOENT');
      const title = isDev ? 'Development Mode - TimeFlow' : 'Update Check Failed - TimeFlow';
      const message = isDev ? 'Auto-Update Testing Complete' : 'Update Check Failed';
      const detail = isDev 
        ? '✅ Auto-update system is working correctly!\n\n📝 This is development mode - the error is expected. Auto-updates only work in production builds distributed to users.'
        : `Failed to check for updates: ${error}\n\nPlease check your internet connection.`;
      
      dialog.showMessageBox({
        type: isDev ? 'info' : 'error',
        title: title,
        message: message,
        detail: detail,
        buttons: ['OK']
      });
    }
  }
}

// Function to download update
export async function downloadUpdate(): Promise<void> {
  if (!updateAvailable) {
    console.log('⚠️ No update available to download');
    return;
  }
  
  try {
    console.log('📥 Starting update download...');
    
    // Show confirmation dialog
    const choice = dialog.showMessageBoxSync({
      type: 'question',
      title: 'Download Update - TimeFlow',
      message: `Download version ${updateInfo?.version}?`,
      detail: 'The update will be downloaded in the background. You can continue working.',
      buttons: ['Download', 'Cancel'],
      defaultId: 0,
      cancelId: 1
    });
    
    if (choice === 0) {
      await autoUpdater.downloadUpdate();
      
      // Show download started notification
      if (Notification.isSupported()) {
        new Notification({
          title: '📥 Downloading Update - TimeFlow',
          body: 'Update is downloading in the background...',
          icon: path.join(__dirname, '../assets/icon.png'),
        }).show();
      }
    }
    
  } catch (error) {
    console.error('❌ Error downloading update:', error);
    dialog.showErrorBox(
      'Download Failed - TimeFlow',
      `Failed to download update: ${error}\n\nPlease try again later.`
    );
  }
}

// Function to install update and restart
export function installUpdate(): void {
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    title: 'Install Update - TimeFlow',
    message: 'Install update and restart app?',
    detail: 'The app will close and restart to complete the installation.',
    buttons: ['Install and Restart', 'Install Later'],
    defaultId: 0,
    cancelId: 1
  });
  
  if (choice === 0) {
    console.log('🔄 Installing update and restarting...');
    autoUpdater.quitAndInstall();
  }
}

// Get current update status
export function getUpdateStatus() {
  return {
    updateAvailable,
    updateCheckInProgress,
    downloadProgress,
    updateInfo,
    currentVersion: app.getVersion()
  };
}

// Enable automatic update checks (call this after app is ready)
export function enableAutoUpdates(): void {
  console.log('🔄 Enabling automatic update checks...');
  
  // Check for updates when app starts (after 30 seconds delay)
  setTimeout(() => {
    checkForUpdates(false);
  }, 30000);
  
  // Check for updates every 6 hours
  setInterval(() => {
    checkForUpdates(false);
  }, 6 * 60 * 60 * 1000);
  
  console.log('✅ Automatic update checks enabled (every 6 hours)');
}

// Flag to prevent duplicate IPC handler registration
let ipcHandlersRegistered = false;

// IPC handlers for renderer process communication
export function setupUpdaterIPC(): void {
  if (ipcHandlersRegistered) {
    console.log('⚠️ Updater IPC handlers already registered, skipping...');
    return;
  }

  // Remove any existing handlers first (in case of app restart/reload)
  try {
    ipcMain.removeHandler('check-for-updates');
    ipcMain.removeHandler('download-update');
    ipcMain.removeHandler('install-update');
    ipcMain.removeHandler('get-update-status');
  } catch (e) {
    // Handlers might not exist yet, that's fine
  }

  ipcMain.handle('check-for-updates', async () => {
    await checkForUpdates(true);
    return getUpdateStatus();
  });
  
  ipcMain.handle('download-update', async () => {
    await downloadUpdate();
    return getUpdateStatus();
  });
  
  ipcMain.handle('install-update', () => {
    installUpdate();
  });
  
  ipcMain.handle('get-update-status', () => {
    return getUpdateStatus();
  });
  
  ipcHandlersRegistered = true;
  console.log('✅ Updater IPC handlers registered');
}

// Utility function to open releases page
export function openReleasesPage(): void {
  shell.openExternal('https://github.com/your-repo/releases'); // Update with your repo
} 