import { BrowserWindow, ipcMain, systemPreferences, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let setupWindow: BrowserWindow | null = null;
let isSetupComplete = false;

// Check if this is the first time running the app
export function isFirstTimeRun(): boolean {
  try {
    const configPath = path.join(__dirname, '../.setup-complete');
    return !fs.existsSync(configPath);
  } catch (error) {
    return true; // If we can't check, assume first time
  }
}

// Mark setup as complete
function markSetupComplete(): void {
  try {
    const configPath = path.join(__dirname, '../.setup-complete');
    fs.writeFileSync(configPath, JSON.stringify({
      completed: true,
      timestamp: new Date().toISOString(),
      version: '1.0.39'
    }));
    isSetupComplete = true;
  } catch (error) {
    console.error('❌ Could not mark setup as complete:', error);
  }
}

// Get correct active-win binary path for current environment
function getCorrectActiveWinBinaryPath(): string {
  const { app } = require('electron');
  
  console.log('🔧 SETUP: Resolving correct active-win binary path...');
  
  if (app.isPackaged) {
    // Packaged app - binary should be in Resources
    const resourcesPath = process.resourcesPath;
    const binaryPath = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'active-win', 'main');
    console.log('📦 PACKAGED: Using binary path:', binaryPath);
    return binaryPath;
  } else {
    // Development mode - need to find the correct path
    const possiblePaths = [
      // In the project root node_modules (most common)
      path.join(process.cwd(), 'node_modules', 'active-win', 'main'),
      // In build directory (correct path)
      path.join(process.cwd(), 'build', 'electron', 'node_modules', 'active-win', 'main'),
      // Relative to current file (one level up from electron directory)
      path.join(__dirname, '..', 'node_modules', 'active-win', 'main'),
      // Fallback: project root
      path.join(__dirname, '..', '..', 'node_modules', 'active-win', 'main'),
    ];
    
    console.log('🔧 DEV MODE: Testing possible binary paths...');
    for (const testPath of possiblePaths) {
      console.log(`   Testing: ${testPath}`);
      if (fs.existsSync(testPath)) {
        console.log(`✅ Found binary at: ${testPath}`);
        return testPath;
      }
    }
    
    // If none found, use the most likely path
    const fallbackPath = possiblePaths[0];
    console.log(`⚠️ No binary found, using fallback: ${fallbackPath}`);
    return fallbackPath;
  }
}

// Test if active-win binary actually works
async function testActiveWinBinary(): Promise<{ success: boolean; error?: string; appName?: string }> {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const binaryPath = getCorrectActiveWinBinaryPath();
    
    console.log('🧪 SETUP: Testing active-win binary at:', binaryPath);
    
    // Check if file exists first
    if (!fs.existsSync(binaryPath)) {
      console.log('❌ SETUP: Binary file does not exist');
      return resolve({ 
        success: false, 
        error: `Binary not found at: ${binaryPath}` 
      });
    }
    
    const timeout = setTimeout(() => {
      console.log('⏰ SETUP: Binary test timed out');
      if (child && !child.killed) {
        child.kill('SIGTERM');
      }
      resolve({ success: false, error: 'Binary test timed out' });
    }, 5000);
    
    const child = spawn(binaryPath, [], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data: any) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data: any) => {
      stderr += data.toString();
    });
    
    child.on('close', (code: number | null) => {
      clearTimeout(timeout);
      
      console.log(`🔍 SETUP: Binary test result - Code: ${code}, Stdout: ${stdout.length} chars, Stderr: ${stderr.length} chars`);
      
      if (code === 0 && stdout.length > 0) {
        // Try to parse the JSON output to get app name
        try {
          const result = JSON.parse(stdout);
          const appName = result.title || result.owner?.name || 'Unknown App';
          console.log(`✅ SETUP: Binary test passed - detected app: ${appName}`);
          resolve({ success: true, appName });
        } catch (e) {
          console.log(`✅ SETUP: Binary test passed - raw output: ${stdout.substring(0, 100)}`);
          resolve({ success: true, appName: 'Binary Working' });
        }
      } else if (stderr.includes('screen recording permission')) {
        console.log('❌ SETUP: Binary test failed - screen recording permission required');
        resolve({ success: false, error: 'Screen Recording permission required' });
      } else {
        console.log(`❌ SETUP: Binary test failed - Code: ${code}, Error: ${stderr}`);
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });
    
    child.on('error', (error: any) => {
      clearTimeout(timeout);
      console.log('❌ SETUP: Binary spawn error:', error.message);
      resolve({ success: false, error: error.message });
    });
  });
}

// Show the first-time setup wizard
export async function showFirstTimeSetup(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('🎯 SETUP: Creating first-time setup wizard...');
    
    setupWindow = new BrowserWindow({
      width: 600,
      height: 700,
      resizable: false,
      minimizable: false,
      maximizable: false,
      closable: false, // Cannot be closed until setup is complete
      alwaysOnTop: true,
      center: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      titleBarStyle: 'hiddenInset'
    });

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          height: 100vh;
          overflow: hidden;
        }
        
        .container {
          padding: 40px;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 40px;
        }
        
        .permission-list {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 30px;
          margin: 20px 0;
          width: 100%;
          max-width: 500px;
        }
        
        .permission-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .permission-item:last-child {
          border-bottom: none;
        }
        
        .permission-info {
          display: flex;
          align-items: center;
          text-align: left;
        }
        
        .permission-icon {
          font-size: 24px;
          margin-right: 15px;
        }
        
        .permission-text {
          flex: 1;
        }
        
        .permission-title {
          font-weight: 600;
          font-size: 16px;
        }
        
        .permission-desc {
          font-size: 14px;
          opacity: 0.8;
          margin-top: 2px;
        }
        
        .permission-status {
          font-size: 24px;
          min-width: 30px;
        }
        
        .status-checking {
          animation: spin 1s linear infinite;
        }
        
        .status-granted {
          color: #4ade80;
        }
        
        .status-denied {
          color: #f87171;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .buttons {
          margin-top: 30px;
          display: flex;
          gap: 15px;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .status-message {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          font-size: 14px;
        }
        
        .error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .success {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          margin-top: 20px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: #4ade80;
          transition: width 0.3s ease;
          width: 0%;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎯</div>
        <h1>Welcome to TimeFlow!</h1>
        <div class="subtitle">Let's set up your system for accurate time tracking</div>
        
        <div class="permission-list">
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-icon">📺</div>
              <div class="permission-text">
                <div class="permission-title">Screen Recording</div>
                <div class="permission-desc">For app detection and screenshots</div>
              </div>
            </div>
            <div class="permission-status" id="screen-status">🔄</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-icon">♿</div>
              <div class="permission-text">
                <div class="permission-title">Accessibility</div>
                <div class="permission-desc">For mouse and keyboard tracking</div>
              </div>
            </div>
            <div class="permission-status" id="accessibility-status">⏳</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-icon">🖥️</div>
              <div class="permission-text">
                <div class="permission-title">App Detection</div>
                <div class="permission-desc">Binary functionality test</div>
              </div>
            </div>
            <div class="permission-status" id="app-status">⏳</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-icon">📸</div>
              <div class="permission-text">
                <div class="permission-title">Screenshot Test</div>
                <div class="permission-desc">Capture capability verification</div>
              </div>
            </div>
            <div class="permission-status" id="screenshot-status">⏳</div>
          </div>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" id="progress"></div>
        </div>
        
        <div class="status-message" id="status-message" style="display: none;"></div>
        
        <div class="buttons">
          <button class="btn btn-primary" id="start-setup" onclick="startSetup()">
            🚀 Start Setup
          </button>
          <button class="btn btn-secondary" id="open-settings" onclick="openSystemSettings()" style="display: none;">
            ⚙️ Open System Settings
          </button>
          <button class="btn btn-primary" id="complete-setup" onclick="completeSetup()" style="display: none;" disabled>
            ✅ Complete Setup
          </button>
        </div>
      </div>
      
      <script>
        const { ipcRenderer } = require('electron');
        
        let permissionResults = {
          screen: false,
          accessibility: false,
          appDetection: false,
          screenshot: false
        };
        
        function updateStatus(id, status, text) {
          const element = document.getElementById(id);
          if (status === 'checking') {
            element.textContent = '🔄';
            element.className = 'permission-status status-checking';
          } else if (status === 'granted') {
            element.textContent = '✅';
            element.className = 'permission-status status-granted';
          } else if (status === 'denied') {
            element.textContent = '❌';
            element.className = 'permission-status status-denied';
          }
        }
        
        function updateProgress() {
          const total = Object.keys(permissionResults).length;
          const granted = Object.values(permissionResults).filter(Boolean).length;
          const percentage = (granted / total) * 100;
          document.getElementById('progress').style.width = percentage + '%';
          
          if (percentage === 100) {
            document.getElementById('complete-setup').disabled = false;
            document.getElementById('complete-setup').style.display = 'block';
            showMessage('🎉 All systems ready! Auto-completing setup...', 'success');
            
            // Auto-complete setup after 2 seconds when all systems are ready
            setTimeout(() => {
              console.log('🚀 Auto-completing setup since all systems are ready');
              completeSetup();
            }, 2000);
          }
        }
        
        function showMessage(text, type = 'info') {
          const messageEl = document.getElementById('status-message');
          messageEl.textContent = text;
          messageEl.className = 'status-message ' + type;
          messageEl.style.display = 'block';
        }
        
        async function startSetup() {
          document.getElementById('start-setup').style.display = 'none';
          showMessage('🔍 Checking system permissions and capabilities...', 'info');
          
          // Test Screen Recording Permission
          updateStatus('screen-status', 'checking');
          try {
            const screenResult = await ipcRenderer.invoke('setup-test-screen-permission');
            if (screenResult.success) {
              updateStatus('screen-status', 'granted');
              permissionResults.screen = true;
            } else {
              updateStatus('screen-status', 'denied');
              showMessage('❌ Screen Recording permission required. Click "Open System Settings" to grant it.', 'error');
              document.getElementById('open-settings').style.display = 'block';
            }
          } catch (error) {
            updateStatus('screen-status', 'denied');
            showMessage('❌ Error checking screen permission: ' + error.message, 'error');
          }
          
          // Test Accessibility Permission
          updateStatus('accessibility-status', 'checking');
          try {
            const accessibilityResult = await ipcRenderer.invoke('setup-test-accessibility-permission');
            if (accessibilityResult.success) {
              updateStatus('accessibility-status', 'granted');
              permissionResults.accessibility = true;
            } else {
              updateStatus('accessibility-status', 'denied');
              showMessage('❌ Accessibility permission required. Click "Open System Settings" to grant it.', 'error');
              document.getElementById('open-settings').style.display = 'block';
            }
          } catch (error) {
            updateStatus('accessibility-status', 'denied');
            showMessage('❌ Error checking accessibility permission: ' + error.message, 'error');
          }
          
          // Test App Detection Binary
          updateStatus('app-status', 'checking');
          try {
            const appResult = await ipcRenderer.invoke('setup-test-app-detection');
            if (appResult.success) {
              updateStatus('app-status', 'granted');
              permissionResults.appDetection = true;
              showMessage('✅ App detection working: ' + (appResult.appName || 'Binary functional'), 'success');
            } else {
              updateStatus('app-status', 'denied');
              showMessage('❌ App detection failed: ' + (appResult.error || 'Unknown error'), 'error');
            }
          } catch (error) {
            updateStatus('app-status', 'denied');
            showMessage('❌ Error testing app detection: ' + error.message, 'error');
          }
          
          // Test Screenshot Capability
          updateStatus('screenshot-status', 'checking');
          try {
            const screenshotResult = await ipcRenderer.invoke('setup-test-screenshot');
            if (screenshotResult.success) {
              updateStatus('screenshot-status', 'granted');
              permissionResults.screenshot = true;
            } else {
              updateStatus('screenshot-status', 'denied');
              showMessage('❌ Screenshot test failed: ' + (screenshotResult.error || 'Unknown error'), 'error');
            }
          } catch (error) {
            updateStatus('screenshot-status', 'denied');
            showMessage('❌ Error testing screenshot: ' + error.message, 'error');
          }
          
          updateProgress();
        }
        
        function openSystemSettings() {
          ipcRenderer.invoke('setup-open-system-settings');
        }
        
        function completeSetup() {
          console.log('🔄 Attempting to complete setup...');
          showMessage('⏳ Completing setup...', 'info');
          
          ipcRenderer.invoke('setup-complete').then((result) => {
            console.log('✅ Setup completion result:', result);
            if (result && result.success) {
              showMessage('✅ Setup completed successfully!', 'success');
            } else {
              console.error('❌ Setup completion failed:', result);
              showMessage('❌ Setup completion failed. Trying alternative method...', 'error');
              
              // Fallback: try to close window directly
              setTimeout(() => {
                try {
                  window.close();
                } catch (e) {
                  console.log('Could not close window:', e);
                }
              }, 1000);
            }
          }).catch((error) => {
            console.error('❌ Setup completion error:', error);
            showMessage('❌ Setup completion error. Closing window...', 'error');
            
            // Fallback: try to close window directly
            setTimeout(() => {
              try {
                window.close();
              } catch (e) {
                console.log('Could not close window:', e);
              }
            }, 1000);
          });
        }
        
        // Auto-refresh permissions every 3 seconds if some are missing
        setInterval(async () => {
          if (!permissionResults.screen || !permissionResults.accessibility) {
            // Re-test failed permissions
            if (!permissionResults.screen) {
              const screenResult = await ipcRenderer.invoke('setup-test-screen-permission');
              if (screenResult.success) {
                updateStatus('screen-status', 'granted');
                permissionResults.screen = true;
                updateProgress();
              }
            }
            
            if (!permissionResults.accessibility) {
              const accessibilityResult = await ipcRenderer.invoke('setup-test-accessibility-permission');
              if (accessibilityResult.success) {
                updateStatus('accessibility-status', 'granted');
                permissionResults.accessibility = true;
                updateProgress();
              }
            }
          }
        }, 3000);
      </script>
    </body>
    </html>
    `;

    setupWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

    setupWindow.once('ready-to-show', () => {
      setupWindow!.show();
      console.log('🎯 SETUP: First-time setup wizard shown');
    });

    setupWindow.on('closed', () => {
      setupWindow = null;
      if (!isSetupComplete) {
        console.log('❌ SETUP: Setup window closed before completion');
        resolve(false);
      }
    });

    // Setup IPC handlers
    ipcMain.handle('setup-test-screen-permission', async () => {
      try {
        if (process.platform === 'darwin') {
          const status = systemPreferences.getMediaAccessStatus('screen');
          return { success: status === 'granted' };
        }
        return { success: true }; // Not required on other platforms
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('setup-test-accessibility-permission', async () => {
      try {
        if (process.platform === 'darwin') {
          const hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
          return { success: hasPermission };
        }
        return { success: true }; // Not required on other platforms
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('setup-test-app-detection', async () => {
      try {
        const result = await testActiveWinBinary();
        return result;
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('setup-test-screenshot', async () => {
      try {
        const { desktopCapturer } = require('electron');
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }
        });
        return { success: sources.length > 0 };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('setup-open-system-settings', async () => {
      try {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('setup-complete', async () => {
      try {
        markSetupComplete();
        if (setupWindow) {
          setupWindow.close();
        }
        console.log('✅ SETUP: First-time setup completed successfully');
        resolve(true);
        return { success: true };
      } catch (error) {
        console.error('❌ SETUP: Error completing setup:', error);
        resolve(false);
        return { success: false, error: (error as Error).message };
      }
    });
  });
}

// Cleanup function
export function cleanupSetupWizard(): void {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.close();
  }
  setupWindow = null;
  
  // Remove IPC handlers
  ipcMain.removeAllListeners('setup-test-screen-permission');
  ipcMain.removeAllListeners('setup-test-accessibility-permission');
  ipcMain.removeAllListeners('setup-test-app-detection');
  ipcMain.removeAllListeners('setup-test-screenshot');
  ipcMain.removeAllListeners('setup-open-system-settings');
  ipcMain.removeAllListeners('setup-complete');
  
  console.log('🧹 SETUP: Setup wizard cleaned up');
} 