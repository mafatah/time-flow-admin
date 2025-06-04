const { execSync } = require('child_process');

console.log('🧪 Testing Activity Tracking System');
console.log('==================================');

console.log('\n1. Testing Mouse Position Detection...');
try {
  if (process.platform === 'darwin') {
    const fs = require('fs');
    const path = require('path');
    const mousePosPath = path.join(__dirname, 'electron', 'get_mouse_pos');
    
    if (fs.existsSync(mousePosPath)) {
      const output = execSync(mousePosPath, { encoding: 'utf8' });
      console.log(`✅ Mouse position detection works: ${output.trim()}`);
    } else {
      console.log('❌ Mouse position binary not found');
    }
  }
} catch (error) {
  console.log(`❌ Mouse position detection failed: ${error.message}`);
}

console.log('\n2. Testing Activity Monitoring Components...');

// Check if activity monitor file exists and is properly structured
const fs = require('fs');
const path = require('path');

const activityMonitorPath = path.join(__dirname, 'electron', 'activityMonitor.ts');
if (fs.existsSync(activityMonitorPath)) {
  const content = fs.readFileSync(activityMonitorPath, 'utf8');
  
  const hasRecordRealActivity = content.includes('export function recordRealActivity');
  const hasResetMetrics = content.includes('export function resetActivityMetrics');
  const hasStartMonitoring = content.includes('export async function startActivityMonitoring');
  
  console.log(`✅ Activity Monitor Components:`);
  console.log(`   - recordRealActivity: ${hasRecordRealActivity ? '✅' : '❌'}`);
  console.log(`   - resetActivityMetrics: ${hasResetMetrics ? '✅' : '❌'}`);  
  console.log(`   - startActivityMonitoring: ${hasStartMonitoring ? '✅' : '❌'}`);
} else {
  console.log('❌ Activity monitor file not found');
}

console.log('\n3. Testing System Monitor Integration...');

const systemMonitorPath = path.join(__dirname, 'electron', 'systemMonitor.ts');
if (fs.existsSync(systemMonitorPath)) {
  const content = fs.readFileSync(systemMonitorPath, 'utf8');
  
  const hasRecordImport = content.includes('recordRealActivity');
  const hasInputMonitoring = content.includes('startInputMonitoring');
  const hasDetectMouse = content.includes('detectMouseMovement');
  
  console.log(`✅ System Monitor Components:`);
  console.log(`   - recordRealActivity import: ${hasRecordImport ? '✅' : '❌'}`);
  console.log(`   - Input monitoring: ${hasInputMonitoring ? '✅' : '❌'}`);
  console.log(`   - Mouse detection: ${hasDetectMouse ? '✅' : '❌'}`);
} else {
  console.log('❌ System monitor file not found');
}

console.log('\n🏁 Activity Tracking Test Complete!');
console.log('\nTo test in the running app:');
console.log('1. Move your mouse around');
console.log('2. Click the mouse');
console.log('3. Type on the keyboard');
console.log('4. Check the console logs for activity detection');
console.log('\nExpected behavior:');
console.log('- Mouse movements should increment');
console.log('- Mouse clicks should increment');
console.log('- Keystrokes should increment');
console.log('- Activity metrics reset every 10 minutes'); 