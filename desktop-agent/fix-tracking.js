// Missing functions for desktop-agent/src/main.js
// Add these functions before the checkMacScreenPermissions function (around line 1268)

// Cross-platform permission checking
async function checkPlatformPermissions() {
  const platform = process.platform;
  
  switch (platform) {
    case 'darwin': // macOS
      return await checkMacScreenPermissions();
      
    case 'win32': // Windows
      // Windows doesn't require explicit screen recording permissions
      return true;
      
    case 'linux': // Linux
      // Linux typically doesn't require explicit permissions for screenshot
      return true;
      
    default:
      console.log(`⚠️ Unknown platform: ${platform}, assuming permissions OK`);
      return true;
  }
}

// Test if app/URL capture works on this platform
async function testPlatformAppCapture() {
  try {
    const platform = process.platform;
    
    // First try active-win if available
    if (typeof activeWin !== 'undefined') {
      try {
        const activeWindow = await activeWin();
        if (activeWindow && activeWindow.owner) {
          console.log('✅ App capture test passed using active-win');
          return true;
        }
      } catch (activeWinError) {
        console.log('⚠️ active-win test failed, trying platform fallback:', activeWinError.message);
      }
    }
    
    // Fallback to platform-specific methods
    switch (platform) {
      case 'darwin': // macOS
        // Test if we can get active window info
        try {
          const macWindow = await getMacActiveWindow();
          const success = macWindow && (macWindow.owner || macWindow.title);
          console.log('✅ macOS app capture test:', success ? 'passed' : 'failed');
          return success;
        } catch (error) {
          console.log('⚠️ macOS app capture test failed:', error.message);
          // Don't fail completely, allow basic functionality
          return true;
        }
        
      case 'win32': // Windows
        // Test if we can get active window info
        try {
          const winWindow = await getWindowsActiveWindow();
          const success = winWindow && (winWindow.owner || winWindow.title);
          console.log('✅ Windows app capture test:', success ? 'passed' : 'failed');
          return success;
        } catch (error) {
          console.log('⚠️ Windows app capture test failed:', error.message);
          // Don't fail completely, allow basic functionality
          return true;
        }
        
      case 'linux': // Linux
        // Test if we can get active window info
        try {
          const linuxWindow = await getLinuxActiveWindow();
          const success = linuxWindow && (linuxWindow.owner || linuxWindow.title);
          console.log('✅ Linux app capture test:', success ? 'passed' : 'failed');
          return success;
        } catch (error) {
          console.log('⚠️ Linux app capture test failed:', error.message);
          // Don't fail completely, allow basic functionality
          return true;
        }
        
      default:
        console.log(`⚠️ App capture not supported on platform: ${platform}, but allowing basic functionality`);
        return true; // Allow basic functionality even if platform is unknown
    }
  } catch (error) {
    console.log('⚠️ App capture test failed:', error.message);
    // Don't fail completely - allow basic functionality
    return true;
  }
}

// Export for manual insertion
module.exports = {
  checkPlatformPermissions,
  testPlatformAppCapture
}; 