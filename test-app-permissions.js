// Test script to check permissions from within the Electron app
// Run this in the DevTools console of the Electron app

console.log('🔍 Testing permissions from Electron app...');

// Test if we can access the main process modules
if (typeof require !== 'undefined') {
  try {
    const { systemPreferences } = require('electron');
    
    console.log('📊 Permission Status Check:');
    
    // Test Screen Recording
    const screenStatus = systemPreferences.getMediaAccessStatus('screen');
    console.log('📺 Screen Recording:', screenStatus);
    
    // Test Accessibility
    const accessibilityStatus = systemPreferences.isTrustedAccessibilityClient(false);
    console.log('♿ Accessibility:', accessibilityStatus);
    
    // Test Camera
    const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
    console.log('📷 Camera:', cameraStatus);
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('- Screen Recording:', screenStatus === 'granted' ? '✅ GRANTED' : '❌ DENIED (' + screenStatus + ')');
    console.log('- Accessibility:', accessibilityStatus ? '✅ GRANTED' : '❌ DENIED');
    console.log('- Camera:', cameraStatus === 'granted' ? '✅ GRANTED' : '❌ DENIED (' + cameraStatus + ')');
    
    // Test active-win
    try {
      const activeWin = require('active-win');
      activeWin().then(result => {
        console.log('🖥️ Active Window Detection Test:');
        if (result && result.owner) {
          console.log('✅ App Detection Working:', result.owner.name);
          console.log('📝 Window Title:', result.title);
        } else {
          console.log('❌ App Detection Failed: No window detected');
        }
      }).catch(err => {
        console.log('❌ Active-Win Error:', err.message);
      });
    } catch (err) {
      console.log('❌ Active-Win Module Error:', err.message);
    }
    
  } catch (error) {
    console.log('❌ Error accessing Electron modules:', error.message);
  }
} else {
  console.log('❌ require() not available - run this in main process or with nodeIntegration enabled');
} 