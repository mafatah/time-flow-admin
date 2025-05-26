const { app, BrowserWindow } = require('electron');

// Simple test to trigger screenshot via IPC
async function testScreenshot() {
  console.log('🧪 Testing screenshot functionality...');
  
  // Get the main window
  const windows = BrowserWindow.getAllWindows();
  if (windows.length === 0) {
    console.log('❌ No Electron windows found');
    return;
  }
  
  const mainWindow = windows[0];
  
  // Send IPC messages to trigger screenshot
  console.log('📸 Triggering screenshot via IPC...');
  
  // Set user ID first
  mainWindow.webContents.send('set-user-id', '189a8371-8aaf-4551-9b33-8fed7f4cee5d');
  
  // Wait a moment
  setTimeout(() => {
    // Trigger direct screenshot
    mainWindow.webContents.executeJavaScript(`
      if (window.electron && window.electron.invoke) {
        window.electron.invoke('trigger-direct-screenshot').then(() => {
          console.log('✅ Screenshot triggered successfully');
        }).catch(err => {
          console.error('❌ Screenshot failed:', err);
        });
      } else {
        console.log('❌ window.electron not available');
      }
    `);
    
    // Also trigger activity capture
    mainWindow.webContents.executeJavaScript(`
      if (window.electron && window.electron.send) {
        window.electron.send('trigger-activity-capture');
        console.log('✅ Activity capture triggered');
      }
    `);
  }, 1000);
}

// Run test after a delay
setTimeout(testScreenshot, 3000);

console.log('🚀 Screenshot test script loaded - will run in 3 seconds'); 