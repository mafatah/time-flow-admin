const { app, systemPreferences, desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');

async function testMacPermissions() {
  console.log('🍎 Testing macOS Screen Recording permissions...');
  console.log('===============================================');
  
  if (process.platform !== 'darwin') {
    console.log('❌ This test is only for macOS');
    process.exit(1);
  }
  
  try {
    // Check current permission status
    console.log('📋 Checking current permission status...');
    const status = systemPreferences.getMediaAccessStatus('screen');
    console.log(`   Current status: ${status}`);
    
    if (status === 'granted') {
      console.log('✅ Screen Recording permission is GRANTED');
      
      // Test actual screenshot capture
      console.log('\n📸 Testing screenshot capture...');
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1920, height: 1080 }
        });
        
        if (sources && sources.length > 0) {
          const screenshot = sources[0].thumbnail.toPNG();
          const testPath = path.join(__dirname, 'test-screenshot-mac.png');
          fs.writeFileSync(testPath, screenshot);
          console.log(`✅ Screenshot captured successfully!`);
          console.log(`   Saved to: ${testPath}`);
          console.log(`   File size: ${screenshot.length} bytes`);
          
          // Check if screenshot is not empty (black)
          if (screenshot.length < 1000) {
            console.log('⚠️  Warning: Screenshot file is very small, might be empty/black');
          } else {
            console.log('✅ Screenshot appears to have content');
          }
        } else {
          console.log('❌ No screen sources available');
        }
      } catch (captureError) {
        console.error('❌ Screenshot capture failed:', captureError.message);
      }
      
    } else if (status === 'denied') {
      console.log('❌ Screen Recording permission is DENIED');
      console.log('\n🔧 To fix this:');
      console.log('   1. Open System Preferences');
      console.log('   2. Go to Security & Privacy > Privacy');
      console.log('   3. Select "Screen Recording" from the left sidebar');
      console.log('   4. Find and enable "Electron" or "TimeFlow"');
      console.log('   5. Restart this application');
      
    } else if (status === 'restricted') {
      console.log('⚠️  Screen Recording permission is RESTRICTED');
      console.log('   This may be due to parental controls or enterprise policies');
      
    } else if (status === 'not-determined') {
      console.log('❓ Screen Recording permission is NOT DETERMINED');
      console.log('   Requesting permission...');
      
      try {
        const granted = await systemPreferences.askForMediaAccess('screen');
        if (granted) {
          console.log('✅ Permission granted!');
          // Rerun the test
          await testMacPermissions();
        } else {
          console.log('❌ Permission denied by user');
        }
      } catch (requestError) {
        console.error('❌ Permission request failed:', requestError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Permission check failed:', error.message);
  }
  
  console.log('\n===============================================');
  console.log('🏁 macOS permission test completed');
}

// Initialize Electron app
app.whenReady().then(async () => {
  await testMacPermissions();
  app.quit();
});

app.on('window-all-closed', () => {
  app.quit();
}); 