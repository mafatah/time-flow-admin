const { notarize } = require('@electron/notarize');
const fs = require('fs');
const path = require('path');

const notarizeApp = async (params) => {
  console.log('🍎 Starting macOS notarization process...');
  
  // Only notarize on macOS when building for production
  if (process.platform !== 'darwin') {
    console.log('⚠️  Skipping notarization - not on macOS');
    return;
  }

  if (!params.electronPlatformName || params.electronPlatformName !== 'darwin') {
    console.log('⚠️  Skipping notarization - not building for macOS');
    return;
  }

  const appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  
  if (!fs.existsSync(appPath)) {
    console.error('❌ App bundle not found at:', appPath);
    throw new Error('App bundle not found for notarization');
  }

  console.log('📍 App path:', appPath);

  // Apple credentials from environment
  const appleId = process.env.APPLE_ID || 'alshqawe66@gmail.com';
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID || '6GW49LK9V9';

  if (!appleIdPassword) {
    console.error('❌ Missing Apple ID password');
    console.error('💡 Set APPLE_APP_SPECIFIC_PASSWORD or APPLE_PASSWORD environment variable');
    throw new Error('Apple ID password required for notarization');
  }

  try {
    console.log('🔐 Notarizing with Apple ID:', appleId);
    console.log('👥 Team ID:', teamId);
    
    await notarize({
      appBundleId: 'com.ebdaadt.timetracker',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPassword,
      teamId: teamId,
    });

    console.log('✅ macOS app notarization completed successfully!');
    
    // Create notarization log
    const logPath = path.join(params.outDir, 'notarization.log');
    const logContent = `
Notarization completed successfully
===================================
Date: ${new Date().toISOString()}
App: ${appPath}
Apple ID: ${appleId}
Team ID: ${teamId}
Bundle ID: com.ebdaadt.timetracker
Status: SUCCESS
`;
    
    fs.writeFileSync(logPath, logContent);
    console.log('📝 Notarization log saved to:', logPath);
    
  } catch (error) {
    console.error('❌ Notarization failed:', error.message);
    
    // Create error log
    const errorLogPath = path.join(params.outDir, 'notarization-error.log');
    const errorLogContent = `
Notarization failed
==================
Date: ${new Date().toISOString()}
App: ${appPath}
Apple ID: ${appleId}
Team ID: ${teamId}
Error: ${error.message}
Stack: ${error.stack}
`;
    
    fs.writeFileSync(errorLogPath, errorLogContent);
    console.log('📝 Error log saved to:', errorLogPath);
    
    throw error;
  }
};

module.exports = notarizeApp; 