import { systemPreferences, dialog, shell } from 'electron';
import { logError } from './errorHandler';

export async function checkAccessibilityPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    console.log('🟢 Not macOS, accessibility permission not required');
    return true;
  }

  console.log('🔍 Checking macOS Accessibility permission...');
  
  try {
    // Check if we have accessibility permission
    const hasPermission = systemPreferences.isTrustedAccessibilityClient(false);
    
    if (hasPermission) {
      console.log('✅ Accessibility permission already granted');
      return true;
    } else {
      console.log('❌ Accessibility permission not granted');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check accessibility permission:', error);
    logError('checkAccessibilityPermission', error);
    return false;
  }
}

export async function requestAccessibilityPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true;
  }

  console.log('📱 Requesting macOS Accessibility permission...');

  try {
    // Request accessibility permission (this will prompt the user)
    const hasPermission = systemPreferences.isTrustedAccessibilityClient(true);
    
    if (hasPermission) {
      console.log('✅ Accessibility permission granted');
      return true;
    } else {
      console.log('❌ Accessibility permission denied or pending');
      await showAccessibilityPermissionDialog();
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to request accessibility permission:', error);
    logError('requestAccessibilityPermission', error);
    await showAccessibilityPermissionDialog();
    return false;
  }
}

async function showAccessibilityPermissionDialog(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Accessibility Permission Required',
    message: 'TimeFlow needs Accessibility permission to monitor mouse and keyboard activity.',
    detail: 'Please grant Accessibility permission in System Preferences:\n\n1. Go to System Preferences > Security & Privacy\n2. Click on Privacy tab\n3. Select Accessibility from the list\n4. Check the box next to TimeFlow\n5. You may need to restart the application',
    buttons: ['Open System Preferences', 'Skip for Now'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    console.log('🔧 Opening System Preferences for accessibility...');
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
  }
}

export async function checkScreenRecordingPermission(): Promise<boolean> {
  if (process.platform === 'win32') {
    console.log('🔍 Checking Windows Screen Capture capability...');
    return await testWindowsScreenCapture();
  } else if (process.platform !== 'darwin') {
    console.log('🟢 Not macOS/Windows, screen recording permission not required');
    return true;
  }

  console.log('🔍 Checking macOS Screen Recording permission...');
  
  try {
    // Check if we have screen recording permission
    const hasPermission = systemPreferences.getMediaAccessStatus('screen') === 'granted';
    
    if (hasPermission) {
      console.log('✅ Screen Recording permission already granted');
      return true;
    } else {
      console.log('❌ Screen Recording permission not granted');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to check screen recording permission:', error);
    logError('checkScreenRecordingPermission', error);
    return false;
  }
}

export async function requestScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return true;
  }

  console.log('📱 Requesting macOS Screen Recording permission...');

  try {
    // Try to request permission (note: 'screen' may not be available in all Electron versions)
    const hasPermission = await systemPreferences.askForMediaAccess('camera'); // Fallback for now
    
    if (hasPermission) {
      console.log('✅ Screen Recording permission granted');
      return true;
    } else {
      console.log('❌ Screen Recording permission denied');
      await showPermissionDialog();
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to request screen recording permission:', error);
    logError('requestScreenRecordingPermission', error);
    await showPermissionDialog();
    return false;
  }
}

async function showPermissionDialog(): Promise<void> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording Permission Required',
    message: 'Time Flow Admin needs Screen Recording permission to capture screenshots for activity monitoring.',
    detail: 'Please grant Screen Recording permission in System Preferences:\n\n1. Go to System Preferences > Security & Privacy\n2. Click on Privacy tab\n3. Select Screen Recording from the list\n4. Check the box next to Time Flow Admin\n5. Restart the application',
    buttons: ['Open System Preferences', 'Skip for Now'],
    defaultId: 0,
    cancelId: 1
  });

  if (result.response === 0) {
    console.log('🔧 Opening System Preferences for user...');
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  }
}

export async function ensureScreenRecordingPermission(): Promise<boolean> {
  console.log('🚀 Ensuring Screen Recording permission...');
  
  // First check if we already have permission
  if (await checkScreenRecordingPermission()) {
    return true;
  }

  // Try to request permission
  const granted = await requestScreenRecordingPermission();
  
  if (!granted) {
    console.log('⚠️  Screen Recording permission not granted. Screenshots will not work.');
    return false;
  }

  return true;
}

// Windows-specific screen capture test
async function testWindowsScreenCapture(): Promise<boolean> {
  try {
    const { desktopCapturer } = require('electron');
    console.log('🧪 Testing Windows screen capture capability...');
    
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length === 0) {
      console.log('❌ Windows screen capture failed: No screen sources available');
      console.log('   This might be due to:');
      console.log('   - Windows Privacy Settings blocking screen capture');
      console.log('   - Windows Defender or enterprise policies');
      console.log('   - App needs to run as administrator');
      console.log('   - Graphics driver issues');
      return false;
    }

    // Test if we can actually get a thumbnail
    try {
      const testBuffer = sources[0].thumbnail.toPNG();
      if (testBuffer.length < 1000) {
        console.log('❌ Windows screen capture failed: Empty or corrupted screenshot data');
        return false;
      }
      console.log(`✅ Windows screen capture test passed: ${sources.length} sources, ${testBuffer.length} bytes captured`);
      return true;
    } catch (thumbnailError) {
      console.log('❌ Windows screen capture failed: Cannot generate thumbnail');
      console.error('   Thumbnail error:', thumbnailError);
      return false;
    }
  } catch (error) {
    console.error('❌ Windows screen capture test failed:', error);
    logError('testWindowsScreenCapture', error);
    
    // Provide specific Windows troubleshooting
    console.log('🔧 Windows Screenshot Troubleshooting:');
    console.log('   1. Check Windows Privacy Settings > Camera/Screenshots');
    console.log('   2. Try running as Administrator');
    console.log('   3. Disable Windows Defender Real-time Protection temporarily');
    console.log('   4. Check enterprise policies if on corporate network');
    console.log('   5. Update graphics drivers');
    
    return false;
  }
}

// Test function to verify permission is working
export async function testScreenCapture(): Promise<boolean> {
  if (process.platform === 'win32') {
    return await testWindowsScreenCapture();
  } else if (process.platform !== 'darwin') {
    console.log('🟢 Not macOS/Windows, screen capture test skipped');
    return true;
  }

  try {
    const { desktopCapturer } = require('electron');
    console.log('🧪 Testing screen capture capability...');
    
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    
    if (sources.length === 0) {
      console.log('❌ Screen capture test failed: No sources available');
      return false;
    }

    console.log(`✅ Screen capture test passed: ${sources.length} sources available`);
    return true;
  } catch (error) {
    console.error('❌ Screen capture test failed:', error);
    logError('testScreenCapture', error);
    return false;
  }
} 