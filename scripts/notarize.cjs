const { notarize } = require('@electron/notarize');

exports.default = async function notarizeMacOS(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  
  console.log('🔐 Starting notarization process...');
  console.log(`📱 App: ${appName}`);
  console.log(`📁 Path: ${appOutDir}/${appName}.app`);

  try {
    await notarize({
      tool: 'notarytool',
      appBundleId: 'com.ebdaadt.timetracker',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID || 'alshqawe66@gmail.com',
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD || 'aejg-aqwt-ryfs-ntuf',
      teamId: process.env.APPLE_TEAM_ID || '6GW49LK9V9',
    });

    console.log('✅ Notarization completed successfully!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
}; 