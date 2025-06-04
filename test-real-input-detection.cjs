const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing Real Input Detection');
console.log('==============================');

// Test 1: Create a simple AppleScript-based click detector
console.log('\n1. Creating macOS click detection script...');

const clickDetectorScript = `
on run
    tell application "System Events"
        -- Monitor for mouse clicks by checking if mouse button is down
        repeat 10 times
            delay 0.1
            if (button pressed of mouse state) then
                return "CLICK_DETECTED"
            end if
        end repeat
        return "NO_CLICK"
    end tell
end run
`;

try {
  fs.writeFileSync('temp_click_detector.scpt', clickDetectorScript);
  console.log('✅ Click detector script created');
} catch (error) {
  console.log('❌ Failed to create click detector:', error.message);
}

// Test 2: Create a keystroke detection using system events
console.log('\n2. Creating keystroke detection...');

const keystrokeScript = `
tell application "System Events"
    key down "a"
    delay 0.1
    key up "a"
end tell
`;

// Test 3: Test current mouse position detection
console.log('\n3. Testing current mouse position...');
try {
  const output = execSync('./electron/get_mouse_pos', { encoding: 'utf8' });
  console.log(`✅ Mouse position: ${output.trim()}`);
} catch (error) {
  console.log(`❌ Mouse position test failed: ${error.message}`);
}

// Test 4: Create a comprehensive activity monitor
console.log('\n4. Creating activity monitor script...');

const activityMonitorScript = `
const { execSync } = require('child_process');

let lastMousePos = { x: 0, y: 0 };
let clickCount = 0;
let keystrokeCount = 0;
let movementCount = 0;

function checkActivity() {
  try {
    // Get mouse position
    const pos = execSync('./electron/get_mouse_pos', { encoding: 'utf8' }).trim().split(',');
    const currentX = parseInt(pos[0]);
    const currentY = parseInt(pos[1]);
    
    // Check for movement
    const deltaX = Math.abs(currentX - lastMousePos.x);
    const deltaY = Math.abs(currentY - lastMousePos.y);
    
    if (deltaX + deltaY > 5) {
      movementCount++;
      console.log(\`🖱️ Movement detected: \${deltaX + deltaY}px (total: \${movementCount})\`);
      lastMousePos = { x: currentX, y: currentY };
    }
    
    // Simulate click detection (for testing)
    if (Math.random() < 0.1) {
      clickCount++;
      console.log(\`🖱️ Click detected (simulated) - total: \${clickCount}\`);
    }
    
    // Simulate keystroke detection (for testing)  
    if (Math.random() < 0.1) {
      keystrokeCount++;
      console.log(\`⌨️ Keystroke detected (simulated) - total: \${keystrokeCount}\`);
    }
    
  } catch (error) {
    console.log('Detection error:', error.message);
  }
}

// Run for 30 seconds
console.log('🔍 Monitoring activity for 30 seconds...');
console.log('Move your mouse, click, and type to test detection');

const interval = setInterval(checkActivity, 200);
setTimeout(() => {
  clearInterval(interval);
  console.log(\`\\n📊 Final Results:\`);
  console.log(\`   Mouse movements: \${movementCount}\`);
  console.log(\`   Mouse clicks: \${clickCount}\`);
  console.log(\`   Keystrokes: \${keystrokeCount}\`);
  process.exit(0);
}, 30000);
`;

try {
  fs.writeFileSync('activity_monitor_test.js', activityMonitorScript);
  console.log('✅ Activity monitor script created');
  
  console.log('\n🧪 You can now test real activity detection:');
  console.log('   node activity_monitor_test.js');
  
} catch (error) {
  console.log('❌ Failed to create activity monitor:', error.message);
}

console.log('\n✅ Real input detection test setup complete!');
console.log('The activity monitor will track real movements and simulate clicks/keystrokes for testing.');

// Cleanup
try {
  if (fs.existsSync('temp_click_detector.scpt')) {
    fs.unlinkSync('temp_click_detector.scpt');
  }
} catch (e) {
  // Silent cleanup
} 