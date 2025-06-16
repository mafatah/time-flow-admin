const fs = require('fs');
const path = require('path');

// Read the main.js file
const mainJsPath = path.join(__dirname, 'src', 'main.js');
let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');

// Check if functions already exist
if (mainJsContent.includes('function checkPlatformPermissions')) {
  console.log('✅ checkPlatformPermissions already exists');
} else {
  console.log('❌ checkPlatformPermissions missing, adding it...');
  
  // Find the location to insert (before checkMacScreenPermissions)
  const insertPoint = mainJsContent.indexOf('async function checkMacScreenPermissions()');
  
  if (insertPoint === -1) {
    console.error('❌ Could not find checkMacScreenPermissions function');
    process.exit(1);
  }
  
  const functionsToAdd = `
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
      console.log(\`⚠️ Unknown platform: \${platform}, assuming permissions OK\`);
      return true;
  }
}

// Test if app/URL capture works on this platform
async function testPlatformAppCapture() {
  try {
    const platform = process.platform;
    
    // First try active-win if available
    if (activeWin) {
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
        console.log(\`⚠️ App capture not supported on platform: \${platform}, but allowing basic functionality\`);
        return true; // Allow basic functionality even if platform is unknown
    }
  } catch (error) {
    console.log('⚠️ App capture test failed:', error.message);
    // Don't fail completely - allow basic functionality
    return true;
  }
}

`;
  
  // Insert the functions before checkMacScreenPermissions
  mainJsContent = mainJsContent.slice(0, insertPoint) + functionsToAdd + mainJsContent.slice(insertPoint);
  
  // Write back to file
  fs.writeFileSync(mainJsPath, mainJsContent);
  console.log('✅ Functions added successfully');
}

console.log('✅ Fix applied successfully! Please restart the desktop agent.'); 