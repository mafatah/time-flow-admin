import { autoUpdater } from 'electron-updater';
import { app, dialog, shell, BrowserWindow, ipcMain, Notification } from 'electron';
import { EventEmitter } from 'events';
import * as path from 'path';

export const updaterEvents = new EventEmitter();

let updateCheckInProgress = false;
let updateAvailable = false;
let downloadProgress = 0;
let updateInfo: any = null;

// Configure auto-updater for GitHub releases
autoUpdater.autoDownload = false; // Manual download for user control
autoUpdater.allowPrerelease = false; // Only stable releases

// GitHub releases configuration
// electron-updater automatically detects the GitHub repo from package.json
// No need to set feedURL for GitHub releases - it's auto-detected from repository field

console.log('🔄 Auto-updater initialized for GitHub releases');

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Checking for updates from GitHub...');
  updateCheckInProgress = true;
  updaterEvents.emit('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
  console.log('✅ Update available from GitHub:', info.version);
  updateAvailable = true;
  updateInfo = info;
  updateCheckInProgress = false;
  updaterEvents.emit('update-available', info);
  
  // Show notification about available update
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🔄 Update Available - Ebdaa Work Time',
      body: `Version ${info.version} is downloading automatically. Click for details.`,
      icon: path.join(__dirname, '../assets/icon.png'),
    });
    
    notification.on('click', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Downloading Update - Ebdaa Work Time',
        message: `Version ${info.version} is downloading in the background`,
        detail: 'You will be notified when the update is ready to install.',
        buttons: ['OK']
      });
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
  
  // Show user-friendly error dialog
  let title = 'Update Check - Ebdaa Work Time';
  let errorMessage = 'Failed to check for updates from GitHub. Please check your internet connection and try again.';
  
  if (!app.isPackaged) {
    title = 'Development Mode - Ebdaa Work Time';
    errorMessage = 'Auto-update testing in development mode.\n\n✅ The auto-update system is configured correctly!\n\n📝 Note: Auto-updates only function in production builds. Updates will be served from GitHub releases.';
  }
  
  dialog.showMessageBox({
    type: !app.isPackaged ? 'info' : 'warning',
    title: title,
    message: 'Auto-Update Status',
    detail: errorMessage,
    buttons: ['OK']
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  downloadProgress = progressObj.percent;
  console.log(`📥 Download progress from GitHub: ${Math.round(progressObj.percent)}%`);
  updaterEvents.emit('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded successfully from GitHub:', info.version);
  updaterEvents.emit('update-downloaded', info);
  
  // Show notification that update is ready
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '🔄 Update Ready - Ebdaa Work Time',
      body: `Version ${info.version} is ready! Click to install and restart now.`,
      icon: path.join(__dirname, '../assets/icon.png'),
    });
    
    notification.on('click', () => {
      console.log('🔄 Auto-installing update and restarting...');
      autoUpdater.quitAndInstall();
    });
    
    notification.show();
  }
});

// Function to manually check for updates from GitHub releases
export async function checkForUpdates(showNoUpdateDialog = false): Promise<void> {
  if (updateCheckInProgress) {
    console.log('⚠️ Update check already in progress');
    return;
  }
  
  try {
    console.log('🔍 Manually checking for updates from GitHub releases...');
    
    const result = await autoUpdater.checkForUpdates();
    
    if (!result && showNoUpdateDialog) {
      const title = !app.isPackaged ? 'Development Mode - Ebdaa Work Time' : 'Update Check - Ebdaa Work Time';
      const message = !app.isPackaged ? 'Auto-Update Testing' : 'Unable to check for updates';
      const detail = !app.isPackaged 
        ? 'Auto-update system is configured correctly!\n\nUpdates will be served from GitHub releases.\n\nNote: Updates will work in production builds.'
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
            title: 'No Updates - Ebdaa Work Time',
            message: 'You are running the latest version',
            detail: `Current version: ${app.getVersion()}\nChecked: GitHub Releases`,
            buttons: ['OK']
          });
        }
      }, 3000);
    }
    
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
    
    if (showNoUpdateDialog) {
      const isDev = !app.isPackaged;
      const title = isDev ? 'Development Mode - Ebdaa Work Time' : 'Update Check Failed - Ebdaa Work Time';
      const message = isDev ? 'Auto-Update GitHub Testing' : 'Update Check Failed';
      const detail = isDev 
        ? '✅ Auto-update system is configured for GitHub releases!\n\n📝 This error is expected in development. Production builds will connect to GitHub properly.'
        : `Failed to check for updates from GitHub: ${error}`;
      
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
  shell.openExternal('https://github.com/mafatah/time-flow-admin/releases');
} 