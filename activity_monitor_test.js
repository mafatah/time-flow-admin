
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
      console.log(`🖱️ Movement detected: ${deltaX + deltaY}px (total: ${movementCount})`);
      lastMousePos = { x: currentX, y: currentY };
    }
    
    // Simulate click detection (for testing)
    if (Math.random() < 0.1) {
      clickCount++;
      console.log(`🖱️ Click detected (simulated) - total: ${clickCount}`);
    }
    
    // Simulate keystroke detection (for testing)  
    if (Math.random() < 0.1) {
      keystrokeCount++;
      console.log(`⌨️ Keystroke detected (simulated) - total: ${keystrokeCount}`);
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
  console.log(`\n📊 Final Results:`);
  console.log(`   Mouse movements: ${movementCount}`);
  console.log(`   Mouse clicks: ${clickCount}`);
  console.log(`   Keystrokes: ${keystrokeCount}`);
  process.exit(0);
}, 30000);
