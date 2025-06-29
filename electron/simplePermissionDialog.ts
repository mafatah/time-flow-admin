import { BrowserWindow, dialog, shell, systemPreferences } from 'electron';
import { ensureScreenRecordingPermission, checkScreenRecordingPermission, ensureAccessibilityPermission, checkAccessibilityPermission, testScreenCapture } from './permissionManager';

// Store permission status in database
export interface PermissionStatus {
  user_id: string;
  screen_recording: boolean;
  accessibility: boolean;
  database_connection: boolean;
  screenshot_capability: boolean;
  last_checked: Date;
}

let permissionDialogWindow: BrowserWindow | null = null;

// Test and save permissions to database
export async function testAndSavePermissions(userId: string): Promise<PermissionStatus> {
  console.log('🔍 Testing and saving permissions for user:', userId);
  
  // Test Screen Recording permission first (non-intrusive check)
  console.log('🔍 Checking macOS Screen Recording permission...');
  const screenRecording = await checkScreenRecordingPermission();
  
  if (screenRecording) {
    console.log('✅ Screen Recording permission already granted');
  } else {
    console.log('❌ Screen Recording permission not granted');
  }
  
  // Test Accessibility permission
  console.log('🔍 Checking macOS Accessibility permission...');
  const accessibility = await checkAccessibilityPermission();
  
  if (accessibility) {
    console.log('✅ Accessibility permission already granted');
  } else {
    console.log('❌ Accessibility permission not granted');
  }
  
  // Test screenshot capability only if screen recording is granted
  let screenshotCapability = false;
  if (screenRecording) {
    console.log('🧪 Testing screen capture capability...');
    screenshotCapability = await testScreenCapture();
    
    if (screenshotCapability) {
      console.log('✅ Screen capture test passed: 1 sources available');
    } else {
      console.log('❌ Screen capture test failed');
    }
  } else {
    console.log('⏭️ Skipping screenshot test - Screen Recording permission required first');
  }
  
  // Test database connection
  let databaseConnection = false;
  try {
    // Import the secure configuration system used by the main app
    const { getSupabaseCredentials } = require('./secure-config');
    const config = getSupabaseCredentials();
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(config.url, config.key);
    
    // Try a simple database query to test connection (non-intrusive)
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    databaseConnection = !error && data !== null;
    
    if (error) {
      console.error('❌ Database permission test failed:', error.message || error);
    } else {
      console.log('✅ Database connection test passed');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
  
  const permissionStatus: PermissionStatus = {
    user_id: userId,
    screen_recording: screenRecording,
    accessibility: accessibility,
    database_connection: databaseConnection,
    screenshot_capability: screenshotCapability,
    last_checked: new Date()
  };
  
  console.log('📊 Permission test results:', permissionStatus);
  
  // Save permission status to system_checks table (only if database connection works)
  if (databaseConnection) {
    try {
      const { getSupabaseCredentials } = require('./secure-config');
      const config = getSupabaseCredentials();
      
      const { createClient } = require('@supabase/supabase-js');
      const supabaseForSaving = createClient(config.url, config.key);
      
      const { error: saveError } = await supabaseForSaving
        .from('system_checks')
        .insert({
          check_type: 'permission_check',
          status: 'completed',
          test_data: {
            screen_recording: screenRecording,
            accessibility: accessibility,
            database_connection: databaseConnection,
            screenshot_capability: screenshotCapability,
            platform: process.platform,
            timestamp: new Date().toISOString(),
            user_id: userId  // Store user_id in test_data instead of as column
          }
        });
      
      if (saveError) {
        console.log('⚠️ Could not save permission status to database:', saveError.message);
        console.log('⚠️ This is not critical - permissions were still tested');
      } else {
        console.log('✅ Permission status saved to system_checks table');
      }
    } catch (saveError) {
      console.log('⚠️ Error saving permission status:', saveError);
      console.log('⚠️ This is not critical - permissions were still tested');
    }
  } else {
    console.log('⚠️ Skipping permission save - database connection failed');
  }
  
  return permissionStatus;
}

// Show single friendly permission dialog after login
export async function showPostLoginPermissionDialog(userId: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    console.log('🎯 Showing post-login permission dialog for user:', userId);
    
    // First, test current permissions
    const permissionStatus = await testAndSavePermissions(userId);
    
    // Check if all critical permissions are granted
    const allGranted = permissionStatus.screen_recording && 
                      permissionStatus.accessibility && 
                      permissionStatus.database_connection;
    
    // Only show dialog if permissions are missing
    if (allGranted) {
      console.log('✅ All permissions already granted, no dialog needed');
      resolve(true);
      return;
    }
    
    console.log('📋 Showing permission dialog - some permissions missing');
    
    // Create the permission dialog
    permissionDialogWindow = new BrowserWindow({
      width: 500,
      height: 600,
      resizable: false,
      minimizable: false,
      maximizable: false,
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
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
        }
        
        .dialog-container {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          width: 100%;
          max-width: 450px;
        }
        
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        
        h1 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .subtitle {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 30px;
          line-height: 1.4;
        }
        
        .permission-list {
          margin: 20px 0;
          text-align: left;
        }
        
        .permission-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .permission-item:last-child {
          border-bottom: none;
        }
        
        .permission-icon {
          font-size: 20px;
          margin-right: 12px;
          width: 24px;
        }
        
        .permission-text {
          flex: 1;
        }
        
        .permission-name {
          font-weight: 600;
          font-size: 15px;
        }
        
        .permission-desc {
          font-size: 13px;
          opacity: 0.8;
          margin-top: 2px;
        }
        
        .permission-status {
          font-size: 20px;
          margin-left: 10px;
        }
        
        .status-granted { color: #4ade80; }
        .status-denied { color: #f87171; }
        .status-testing { animation: spin 1s linear infinite; }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .buttons {
          margin-top: 30px;
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 120px;
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
        
        .message {
          margin: 20px 0;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
          display: none;
        }
        
        .message.success {
          background: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }
        
        .message.error {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        
        .message.info {
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: #60a5fa;
        }
      </style>
    </head>
    <body>
      <div class="dialog-container">
        <div class="icon">🔒</div>
        <h1>Setup Required</h1>
        <div class="subtitle">TimeFlow needs a few permissions to track your activity accurately and securely.</div>
        
        <div class="permission-list">
          <div class="permission-item">
            <div class="permission-icon">📺</div>
            <div class="permission-text">
              <div class="permission-name">Screen Recording</div>
              <div class="permission-desc">For app detection & screenshots</div>
            </div>
            <div class="permission-status" id="screen-status">${permissionStatus.screen_recording ? '✅' : '❌'}</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-icon">♿</div>
            <div class="permission-text">
              <div class="permission-name">Accessibility</div>
              <div class="permission-desc">For activity monitoring</div>
            </div>
            <div class="permission-status" id="accessibility-status">${permissionStatus.accessibility ? '✅' : '❌'}</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-icon">🗄️</div>
            <div class="permission-text">
              <div class="permission-name">Database Connection</div>
              <div class="permission-desc">For saving your data</div>
            </div>
            <div class="permission-status" id="database-status">${permissionStatus.database_connection ? '✅' : '❌'}</div>
          </div>
          
          <div class="permission-item">
            <div class="permission-icon">📸</div>
            <div class="permission-text">
              <div class="permission-name">Screenshot Test</div>
              <div class="permission-desc">Verify capture works</div>
            </div>
            <div class="permission-status" id="screenshot-status">${permissionStatus.screenshot_capability ? '✅' : '❌'}</div>
          </div>
        </div>
        
        <div class="message" id="message"></div>
        
        <div class="buttons">
          <button class="btn btn-primary" id="grant-btn" onclick="grantPermissions()" ${allGranted ? 'style="display:none"' : ''}>
            Grant Permissions
          </button>
          <button class="btn btn-primary" id="retest-btn" onclick="retestPermissions()" style="display:none">
            Test Again
          </button>
          <button class="btn btn-primary" id="continue-btn" onclick="continueToApp()" ${allGranted ? '' : 'style="display:none"'}>
            Continue to App
          </button>
          <button class="btn btn-secondary" onclick="skipPermissions()">
            Skip for Now
          </button>
        </div>
      </div>
      
      <script>
        const { ipcRenderer } = require('electron');
        
        function showMessage(text, type = 'info') {
          const messageEl = document.getElementById('message');
          messageEl.textContent = text;
          messageEl.className = 'message ' + type;
          messageEl.style.display = 'block';
        }
        
        function updateStatus(id, granted) {
          const element = document.getElementById(id);
          element.textContent = granted ? '✅' : '❌';
          element.className = granted ? 'permission-status status-granted' : 'permission-status status-denied';
        }
        
        async function grantPermissions() {
          showMessage('Opening System Settings to grant permissions...', 'info');
          
          try {
            await ipcRenderer.invoke('open-system-settings');
            
            document.getElementById('grant-btn').style.display = 'none';
            document.getElementById('retest-btn').style.display = 'inline-block';
            
            showMessage('Please grant the permissions in System Settings, then click "Test Again"', 'info');
          } catch (error) {
            showMessage('Error opening system settings: ' + error.message, 'error');
          }
        }
        
        async function retestPermissions() {
          showMessage('Re-testing permissions...', 'info');
          
          // Show loading states
          document.getElementById('screen-status').textContent = '🔄';
          document.getElementById('accessibility-status').textContent = '🔄';
          document.getElementById('database-status').textContent = '🔄';
          document.getElementById('screenshot-status').textContent = '🔄';
          
          try {
            const result = await ipcRenderer.invoke('retest-permissions', '${userId}');
            
            updateStatus('screen-status', result.screen_recording);
            updateStatus('accessibility-status', result.accessibility);
            updateStatus('database-status', result.database_connection);
            updateStatus('screenshot-status', result.screenshot_capability);
            
            const allGranted = result.screen_recording && result.accessibility && result.database_connection;
            
            if (allGranted) {
              showMessage('✅ All permissions granted! You can now start tracking.', 'success');
              document.getElementById('retest-btn').style.display = 'none';
              document.getElementById('continue-btn').style.display = 'inline-block';
            } else {
              const missing = [];
              if (!result.screen_recording) missing.push('Screen Recording');
              if (!result.accessibility) missing.push('Accessibility');
              if (!result.database_connection) missing.push('Database Connection');
              
              showMessage('⚠️ Still missing: ' + missing.join(', ') + '. Please grant these permissions and test again.', 'error');
            }
          } catch (error) {
            showMessage('Error testing permissions: ' + error.message, 'error');
          }
        }
        
        function continueToApp() {
          ipcRenderer.invoke('permission-dialog-complete', true);
        }
        
        function skipPermissions() {
          showMessage('⚠️ Skipping permissions will limit TimeFlow functionality.', 'error');
          setTimeout(() => {
            ipcRenderer.invoke('permission-dialog-complete', false);
          }, 2000);
        }
        
        // Auto-show continue button if all permissions are already granted
        ${allGranted ? `
        showMessage("✅ All permissions are ready! Auto-continuing in 3 seconds...", "success");
        
        // Auto-close after 3 seconds when all permissions are granted
        let countdown = 3;
        const countdownInterval = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            showMessage("✅ All permissions are ready! Auto-continuing in " + countdown + " seconds...", "success");
          } else {
            clearInterval(countdownInterval);
            showMessage("✅ Starting TimeFlow...", "success");
            setTimeout(() => {
              ipcRenderer.invoke('permission-dialog-complete', true);
            }, 500);
          }
        }, 1000);
        ` : ''}
      </script>
    </body>
    </html>
    `;

    permissionDialogWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    permissionDialogWindow.once('ready-to-show', () => {
      permissionDialogWindow?.show();
    });
    
    permissionDialogWindow.on('closed', () => {
      permissionDialogWindow = null;
      resolve(false);
    });
    
    // Handle IPC messages from the dialog
    const { ipcMain } = require('electron');
    
    // Clean up any existing handlers to prevent duplicates
    cleanupIpcHandlers();
    
    // Register fresh handlers
    ipcMain.handle('open-system-settings', async () => {
      const { shell } = require('electron');
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy');
    });
    
    ipcMain.handle('retest-permissions', async (event: any, userId: string) => {
      return await testAndSavePermissions(userId);
    });
    
    ipcMain.handle('permission-dialog-complete', (event: any, granted: boolean) => {
      if (permissionDialogWindow) {
        permissionDialogWindow.close();
        permissionDialogWindow = null;
      }
      cleanupIpcHandlers();
      resolve(granted);
    });
  });
}

// Clean up IPC handlers
function cleanupIpcHandlers(): void {
  const { ipcMain } = require('electron');
  
  try {
    ipcMain.removeHandler('open-system-settings');
  } catch (e) {
    // Handler might not exist, that's fine
  }
  
  try {
    ipcMain.removeHandler('retest-permissions');
  } catch (e) {
    // Handler might not exist, that's fine
  }
  
  try {
    ipcMain.removeHandler('permission-dialog-complete');
  } catch (e) {
    // Handler might not exist, that's fine
  }
}

// Clean up function
export function cleanupPermissionDialog(): void {
  if (permissionDialogWindow) {
    permissionDialogWindow.close();
    permissionDialogWindow = null;
  }
  cleanupIpcHandlers();
} 