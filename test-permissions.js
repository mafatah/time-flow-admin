const { systemPreferences } = require('electron');

console.log('🔍 Testing permissions from Electron app perspective...');

// Test Screen Recording permission
const screenStatus = systemPreferences.getMediaAccessStatus('screen');
console.log('📺 Screen Recording status:', screenStatus);

// Test Accessibility permission  
const accessibilityStatus = systemPreferences.isTrustedAccessibilityClient(false);
console.log('♿ Accessibility status:', accessibilityStatus);

// Test Camera permission
const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
console.log('📷 Camera status:', cameraStatus);

// Test Microphone permission
const micStatus = systemPreferences.getMediaAccessStatus('microphone');
console.log('🎤 Microphone status:', micStatus);

console.log('\n📊 Permission Summary:');
console.log('- Screen Recording:', screenStatus === 'granted' ? '✅ GRANTED' : '❌ DENIED');
console.log('- Accessibility:', accessibilityStatus ? '✅ GRANTED' : '❌ DENIED');
console.log('- Camera:', cameraStatus === 'granted' ? '✅ GRANTED' : '❌ DENIED');
console.log('- Microphone:', micStatus === 'granted' ? '✅ GRANTED' : '❌ DENIED'); 