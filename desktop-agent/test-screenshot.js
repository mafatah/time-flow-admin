const screenshot = require('screenshot-desktop');
const fs = require('fs');
const path = require('path');

async function testScreenshot() {
  console.log('🧪 Testing screenshot functionality...');
  
  try {
    console.log('📸 Attempting to capture screenshot...');
    const img = await screenshot({ format: 'png' });
    
    console.log('✅ Screenshot captured successfully!');
    console.log(`📊 Image size: ${img.length} bytes`);
    
    // Save test screenshot
    const testPath = path.join(__dirname, 'test-screenshot.png');
    fs.writeFileSync(testPath, img);
    console.log(`💾 Test screenshot saved to: ${testPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    
    if (error.message.includes('permission') || error.message.includes('access')) {
      console.log('🔒 This appears to be a permission issue.');
      console.log('📋 On macOS, you need to grant Screen Recording permission:');
      console.log('   1. Go to System Preferences > Security & Privacy > Privacy');
      console.log('   2. Select "Screen Recording" from the left sidebar');
      console.log('   3. Add and enable your terminal app or Electron app');
      console.log('   4. Restart the application');
    }
    
    return false;
  }
}

// Test screenshot functionality
testScreenshot().then(success => {
  if (success) {
    console.log('🎉 Screenshot test completed successfully!');
  } else {
    console.log('💥 Screenshot test failed - check permissions');
  }
  process.exit(success ? 0 : 1);
}); 