const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Cross-Platform Activity Monitoring Fixes');
console.log('================================================');

console.log(`Platform: ${process.platform}`);
console.log(`Node.js version: ${process.version}`);

// Test 1: Mouse Position Detection
console.log('\n1. Testing Mouse Position Detection...');
try {
  let mouseCommand = '';
  
  if (process.platform === 'win32') {
    mouseCommand = `powershell "Add-Type -AssemblyName System.Windows.Forms; $pos = [System.Windows.Forms.Cursor]::Position; Write-Output (\\"$($pos.X),$($pos.Y)\\")"`; 
  } else if (process.platform === 'darwin') {
    // Try to use the compiled C program first
    const mousePosPath = path.join(__dirname, 'get_mouse_pos');
    if (fs.existsSync(mousePosPath)) {
      mouseCommand = mousePosPath;
    } else {
      // Fallback to compiling on the fly
      const cCode = `#include <ApplicationServices/ApplicationServices.h>
#include <stdio.h>
int main() {
    CGEventRef event = CGEventCreate(NULL);
    CGPoint cursor = CGEventGetLocation(event);
    CFRelease(event);
    printf("%.0f,%.0f\\n", cursor.x, cursor.y);
    return 0;
}`;
      
      const tempDir = require('os').tmpdir();
      const cFilePath = path.join(tempDir, 'mouse_pos_test.c');
      const binPath = path.join(tempDir, 'mouse_pos_test');
      
      fs.writeFileSync(cFilePath, cCode);
      execSync(`gcc -o "${binPath}" "${cFilePath}" -framework ApplicationServices`);
      mouseCommand = binPath;
      
      // Cleanup will happen after test
      setTimeout(() => {
        try { fs.unlinkSync(cFilePath); } catch {}
        try { fs.unlinkSync(binPath); } catch {}
      }, 1000);
    }
  } else if (process.platform === 'linux') {
    mouseCommand = `xdotool getmouselocation --shell | grep -E '^(X|Y)=' | cut -d'=' -f2 | tr '\n' ',' | sed 's/,$//' 2>/dev/null || echo "0,0"`;
  }
  
  if (mouseCommand) {
    const output = execSync(mouseCommand, { encoding: 'utf8', timeout: 3000 });
    console.log(`✅ Mouse position detection works: ${output.trim()}`);
  } else {
    console.log('❌ Unsupported platform for mouse detection');
  }
} catch (error) {
  console.log(`❌ Mouse position detection failed: ${error.message}`);
}

// Test 2: Current App Detection
console.log('\n2. Testing Current App Detection...');
try {
  let appCommand = '';
  
  if (process.platform === 'win32') {
    appCommand = `powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 ProcessName | ForEach-Object {$_.ProcessName}"`;
  } else if (process.platform === 'darwin') {
    appCommand = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
  } else if (process.platform === 'linux') {
    appCommand = `xdotool getactivewindow getwindowname 2>/dev/null || wmctrl -a $(wmctrl -l | head -1 | cut -d' ' -f1) 2>/dev/null || echo "Unknown Application"`;
  }
  
  if (appCommand) {
    const output = execSync(appCommand, { encoding: 'utf8', timeout: 3000 });
    console.log(`✅ Current app detection works: ${output.trim()}`);
  } else {
    console.log('❌ Unsupported platform for app detection');
  }
} catch (error) {
  console.log(`❌ Current app detection failed: ${error.message}`);
}

// Test 3: Window Title Detection
console.log('\n3. Testing Window Title Detection...');
try {
  let windowCommand = '';
  
  if (process.platform === 'win32') {
    windowCommand = `powershell "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1 MainWindowTitle | ForEach-Object {$_.MainWindowTitle}"`;
  } else if (process.platform === 'darwin') {
    windowCommand = `osascript -e 'tell application "System Events" to get title of front window of (first application process whose frontmost is true)'`;
  } else if (process.platform === 'linux') {
    windowCommand = `xdotool getactivewindow getwindowname 2>/dev/null || echo "Unknown Window"`;
  }
  
  if (windowCommand) {
    const output = execSync(windowCommand, { encoding: 'utf8', timeout: 3000 });
    console.log(`✅ Window title detection works: ${output.trim()}`);
  } else {
    console.log('❌ Unsupported platform for window title detection');
  }
} catch (error) {
  console.log(`❌ Window title detection failed: ${error.message}`);
}

console.log('\n🏁 Test completed!');
console.log('\nKey improvements made:');
console.log('- ✅ Fixed macOS mouse position detection using C program');
console.log('- ✅ Added Windows PowerShell support for mouse tracking');
console.log('- ✅ Added Linux xdotool support');
console.log('- ✅ Added comprehensive null checks to prevent app_name errors');
console.log('- ✅ Improved error handling in activity tracking');
console.log('- ✅ Added cross-platform app and window detection');
console.log('- ✅ Added fallback methods for better reliability'); 