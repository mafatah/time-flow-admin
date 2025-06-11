const { notarize } = require('@electron/notarize');

module.exports = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log('Starting notarization process...');
  
  return await notarize({
    tool: 'notarytool',
    appBundleId: 'com.ebdaadt.timetracker',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID || 'alshqawe66@gmail.com',
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD || 'aejg-aqwt-ryfs-ntuf',
    teamId: process.env.APPLE_TEAM_ID || '6GW49LK9V9',
  });
}; 