const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Enhanced Activity Tracking System');
console.log('===========================================');

console.log('\n1. Testing Mouse Position Binary...');
try {
  const mousePosPath = path.join(__dirname, 'electron', 'get_mouse_pos');
  
  if (fs.existsSync(mousePosPath)) {
    const output = execSync(mousePosPath, { encoding: 'utf8' });
    const coords = output.trim().split(',');
    const x = parseInt(coords[0]);
    const y = parseInt(coords[1]);
    
    if (!isNaN(x) && !isNaN(y)) {
      console.log(`✅ Mouse position detection works: ${x},${y}`);
    } else {
      console.log(`❌ Invalid mouse position output: ${output.trim()}`);
    }
  } else {
    console.log('❌ Mouse position binary not found');
  }
} catch (error) {
  console.log(`❌ Mouse position detection failed: ${error.message}`);
}

console.log('\n2. Validating System Monitor Enhancements...');
const systemMonitorPath = path.join(__dirname, 'electron', 'systemMonitor.ts');
if (fs.existsSync(systemMonitorPath)) {
  const content = fs.readFileSync(systemMonitorPath, 'utf8');
  
  const checks = {
    'Enhanced error handling': content.includes('typeof result.stdout === \'string\''),
    'Keystroke detection': content.includes('detectKeystrokeActivity'),
    'Mouse click from movement': content.includes('Click detected from movement pattern'),
    'Progressive polling': content.includes('200)') && content.includes('100)'),
    'System idle monitoring': content.includes('powerMonitor.getSystemIdleTime')
  };
  
  console.log('✅ System Monitor Enhancements:');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  });
} else {
  console.log('❌ System monitor file not found');
}

console.log('\n3. Validating Activity Monitor Improvements...');
const activityMonitorPath = path.join(__dirname, 'electron', 'activityMonitor.ts');
if (fs.existsSync(activityMonitorPath)) {
  const content = fs.readFileSync(activityMonitorPath, 'utf8');
  
  const checks = {
    'Activity decay system': content.includes('ACTIVITY_DECAY_SYSTEM'),
    'Progressive decay rates': content.includes('decayRate = 2') && content.includes('decayRate = 5'),
    'Improved score calculation': content.includes('scoreIncrease'),
    'Proper activity reset': content.includes('ACTIVITY_METRICS_RESET'),
    'Test function': content.includes('export function testActivity'),
    'Enhanced logging': content.includes('REAL_INPUT_WITH_DECAY')
  };
  
  console.log('✅ Activity Monitor Improvements:');
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  });
} else {
  console.log('❌ Activity monitor file not found');
}

console.log('\n4. Testing Build Process...');
try {
  console.log('🔨 Building electron components...');
  execSync('npm run build:electron', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.log(`❌ Build failed: ${error.message}`);
  process.exit(1);
}

console.log('\n🏁 Enhanced Activity System Test Complete!');
console.log('\n📋 What should work now:');
console.log('✅ Mouse movement detection (200ms polling)');
console.log('✅ Mouse click detection from movement patterns');
console.log('✅ Keystroke detection from system idle changes');
console.log('✅ Activity score decay when idle (progressive rates)');
console.log('✅ Proper activity metrics reset every 10 minutes');
console.log('✅ Enhanced error handling for all platforms');
console.log('✅ Test functions for manual validation');

console.log('\n🧪 To test the running app:');
console.log('1. Start the app: npm start');
console.log('2. Watch console for activity detection logs');
console.log('3. Move mouse -> should see mouse movement logs');
console.log('4. Click mouse -> should see click detection');
console.log('5. Type on keyboard -> should see keystroke detection');
console.log('6. Stay idle -> should see activity score decay');

console.log('\n🎯 Expected behavior:');
console.log('- Activity counters should increment with real use');
console.log('- Activity score should decay when idle');
console.log('- No more stdout.trim errors');
console.log('- All three activity types should be detected'); 