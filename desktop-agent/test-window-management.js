const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createTestWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Window Management Test',
    show: false
  });

  // Load a simple HTML content
  mainWindow.loadURL(`data:text/html,
    <html>
      <head><title>Window Management Test</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Window Management Test</h1>
        <p>This window tests the dock/taskbar icon behavior.</p>
        <p><strong>Test Instructions:</strong></p>
        <ol>
          <li>Minimize this window</li>
          <li>Click the dock icon (macOS) or taskbar icon (Windows)</li>
          <li>The window should properly restore and come to front</li>
          <li>Try closing the window and reopening from dock/taskbar</li>
        </ol>
        <p><strong>Expected Result:</strong> Window should always restore and focus properly</p>
      </body>
    </html>
  `);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Test window ready');
  });

  // Handle window events (same as main app)
  mainWindow.on('minimize', () => {
    mainWindow.hide();
    console.log('📱 Window minimized and hidden');
  });

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow.hide();
    console.log('📱 Window hidden (prevented close)');
  });

  return mainWindow;
}

// Handle dock/taskbar icon clicks (same as main app)
app.on('activate', () => {
  if (mainWindow) {
    // Properly restore window when dock/taskbar icon is clicked
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    
    // Ensure window is brought to front on all platforms
    if (process.platform === 'darwin') {
      app.focus();
    }
    
    console.log('📱 Window activated from dock/taskbar click');
  }
});

app.on('window-all-closed', () => {
  // Keep app running to test dock/taskbar behavior
  console.log('📱 All windows closed but app still running');
});

app.whenReady().then(() => {
  console.log('🚀 Starting window management test...');
  createTestWindow();
});

// Handle second instance (same as main app)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    
    if (process.platform === 'darwin') {
      app.focus();
    }
    
    console.log('📱 Second instance detected - window activated');
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  console.log('✅ Single instance lock acquired');
} 