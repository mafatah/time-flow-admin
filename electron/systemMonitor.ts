import { dialog, powerMonitor, app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { stopTracking, startTracking, loadSession } from './tracker';
import { stopActivityMonitoring, startActivityMonitoring, recordRealActivity } from './activityMonitor';
import { GlobalKeyboardListener, IGlobalKeyEvent } from 'node-global-key-listener';
const { screen } = require('electron');

// Track system state
let wasSystemSuspended = false;
let suspendTime: number | null = null;
let inputMonitoringActive = false;

// Track input events for activity detection
let lastMousePosition = { x: 0, y: 0, lastUpdateTime: 0 };
let mouseMoveThreshold = 5; // Lower threshold for better detection
let inputCheckInterval: NodeJS.Timeout | null = null;

// node-global-key-listener instances
let keyListener: GlobalKeyboardListener | null = null;

// Debounce tracking for unified input events
let lastKeystrokeTime = 0;
const KEYSTROKE_DEBOUNCE_MS = 200; // milliseconds

// macOS-specific tracking
let lastMouseDownTime = 0;
let lastKeyPressTime = 0;
let consecutiveIdleChecks = 0;

// Windows-specific tracking
let winLastMouseDown = false;
let winLastKeyDown = false;
let winLastMouseClickTime = 0;
let winLastKeyPressTime = 0;
let winClickCheckInterval: NodeJS.Timeout | null = null;
let winKeyCheckInterval: NodeJS.Timeout | null = null;
let winTestingSimulationInterval: NodeJS.Timeout | null = null;

// Helper to check if event name is a mouse button OR keyboard input
function isInputEvent(name: string | undefined, vKey: number): boolean {
  if (!name) return false;
  const n = name.toUpperCase();
  // Count ALL input as unified activity: mouse buttons, keyboard keys, etc.
  return (
    n.includes('MOUSE') ||  // Any mouse event
    (vKey >= 0 && vKey <= 255) // Any key/button event
  );
}

// Cross-platform mouse button detection
function isMouseButtonEvent(name: string | undefined, vKey: number): boolean {
  if (!name) return false;
  const n = name.toUpperCase();
  
  // macOS mouse button names
  if (n === 'MOUSE LEFT' || n === 'MOUSE RIGHT' || n === 'MOUSE MIDDLE') {
    return true;
  }
  
  // Windows mouse button names (might be different)
  if (n.includes('MOUSE BUTTON') || n.includes('MOUSE BTN')) {
    return true;
  }
  
  // Windows virtual key codes for mouse buttons
  if (process.platform === 'win32') {
    // VK_LBUTTON = 0x01, VK_RBUTTON = 0x02, VK_MBUTTON = 0x04
    if (vKey === 0x01 || vKey === 0x02 || vKey === 0x04) {
      return true;
    }
  }
  
  // macOS sometimes uses vKey 0 for mouse buttons
  if (process.platform === 'darwin' && vKey === 0 && n.includes('MOUSE')) {
    return true;
  }
  
  return false;
}

export function initSystemMonitor() {
  console.log('🔌 Initializing CROSS-PLATFORM system monitor (node-global-key-listener)...');
  console.log('🔥 LATEST VERSION WITH CROSS-PLATFORM UNIFIED INPUT DETECTION ACTIVE 🔥');
  console.log(`🌐 Current Platform: ${process.platform} (${process.arch})`);
  
  // Platform compatibility check
  if (process.platform !== 'darwin' && process.platform !== 'win32' && process.platform !== 'linux') {
    console.warn(`⚠️ WARNING: Platform '${process.platform}' may not be fully supported. Supported platforms: macOS (darwin), Windows (win32), Linux (linux)`);
  } else {
    console.log(`✅ Platform '${process.platform}' is officially supported!`);
  }
  
  // NUCLEAR OPTION: Kill all legacy detection systems
  killAllLegacyDetection();
  
  startInputMonitoring();

  // Handle system suspend (laptop closed, sleep mode)
  powerMonitor.on('suspend', () => {
    console.log('💤 System suspended (laptop closed or sleep mode)');
    wasSystemSuspended = true;
    suspendTime = Date.now();
    
    if (loadSession()) {
      console.log('⏰ Stopping tracking due to system suspend');
      stopTracking();
      stopActivityMonitoring();
    }
    
    stopInputMonitoring();
  });

  // Handle system resume (laptop opened, wake up)
  powerMonitor.on('resume', () => {
    console.log('🔆 System resumed');
    const suspendDuration = suspendTime ? Date.now() - suspendTime : 0;
    const suspendMinutes = Math.round(suspendDuration / 60000);
    
    console.log(`⏱️ System was suspended for ${suspendMinutes} minutes`);
    
    wasSystemSuspended = false;
    suspendTime = null;
    
    startInputMonitoring();
    
    const session = loadSession();
    if (session) {
      console.log('🔄 System resumed - tracking will need to be manually restarted with proper validation');
      console.log('⚠️  Auto-resume disabled to ensure all components are validated before tracking starts');
      console.log('✅ Manual restart required - this prevents bypassing permission checks and system validation');
      // NOTE: User must manually start tracking to ensure system validation
      // This prevents bypassing permission checks and system validation
      // NO AUTOMATIC TRACKING START - all starts must go through startTrackingSecure()
    }
  });

  powerMonitor.on('on-ac', () => {
    console.log('🔌 AC power connected');
  });

  powerMonitor.on('on-battery', () => {
    console.log('🔋 Running on battery power');
  });

  powerMonitor.on('shutdown', () => {
    console.log('🚪 System shutdown detected');
    stopInputMonitoring();
    if (loadSession()) {
      stopTracking();
      stopActivityMonitoring();
    }
  });

  powerMonitor.on('lock-screen', () => {
    console.log('🔒 Screen locked');
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('🔓 Screen unlocked');
  });

  powerMonitor.on('thermal-state-change', (state: string) => {
    console.log('🌡️ Thermal state changed:', state);
    if (state === 'critical') {
      console.log('⚠️ System thermal state is critical - monitoring may be affected');
    }
  });

  app.on('browser-window-blur', () => {
    console.log('👁️ App lost focus');
  });

  app.on('browser-window-focus', () => {
    console.log('👁️ App gained focus');
  });

  console.log('✅ UNIFIED system monitor initialized');
}

function startInputMonitoring() {
  if (inputMonitoringActive) return;
  
  console.log("🚀🚀🚀 [CROSS_PLATFORM_LISTENER_ACTIVE] CROSS-PLATFORM input monitoring is starting NOW. 🚀🚀🚀");
  console.log(`🎧 Starting CROSS-PLATFORM ${process.platform} input monitoring...`);
  console.log(`🌐 Platform: ${process.platform} | Architecture: ${process.arch} | Node: ${process.version}`);
  inputMonitoringActive = true;
  
  try {
    // 1. Mouse position monitoring (existing reliable method)
    inputCheckInterval = setInterval(async () => {
      if (!inputMonitoringActive) return;
      try {
        await detectMouseMovement();
      } catch (error) {
        if (Math.random() < 0.01) { // Reduce logging frequency
          console.log('⚠️ Mouse movement detection error (normal):', (error as Error).message);
        }
      }
    }, 200); // Poll mouse position every 200ms

    // 2. BOTH Keyboard AND Mouse Click detection using node-global-key-listener
    if (!keyListener) {
      keyListener = new GlobalKeyboardListener();

      keyListener.addListener((e: IGlobalKeyEvent, down: { [key: string]: boolean }) => {
        if (!inputMonitoringActive) return;
        const now = Date.now();
        // RAW EVENT LOGGING - VERY IMPORTANT
        // console.log(`[RAW_INPUT_EVENT] state: ${e.state}, vKey: ${e.vKey}, name: ${e.name}, type: ${(e as any).type}`);
        
        if (e.state === "UP") { // Process on key/button release
          // console.log(`[DEBUG_PROCESSING] Processing UP event: vKey=${e.vKey}, name=${e.name}, isInputEvent=${isInputEvent(e.name, e.vKey)}, platform=${process.platform}`);
          
          // UNIFIED INPUT DETECTION - Both keyboard and mouse clicks
          if (isInputEvent(e.name, e.vKey)) {
            const timeSinceLastInput = now - lastKeystrokeTime;
            // console.log(`[DEBUG_DEBOUNCE] Time since last input: ${timeSinceLastInput}ms, debounce threshold: ${KEYSTROKE_DEBOUNCE_MS}ms`);
            
            if (timeSinceLastInput > KEYSTROKE_DEBOUNCE_MS) {
              const eventName = e.name ? e.name.toUpperCase() : "";
              // console.log(`[DEBUG_CLASSIFICATION] Event name (uppercase): "${eventName}", vKey: ${e.vKey}, platform: ${process.platform}`);
              
              // Cross-platform mouse button detection
              if (isMouseButtonEvent(e.name, e.vKey)) {
                // Record as mouse click
                recordRealActivity('mouse_click', 1);
                lastKeystrokeTime = now;
                // console.log(`🖱️ 🎯 CROSS-PLATFORM MOUSE CLICK detected (vKey: ${e.vKey}, name: ${e.name}, platform: ${process.platform}) - recorded as mouse_click 🎯`);
              } else {
                // Record keyboard events
                recordRealActivity('keystroke', 1);
                lastKeystrokeTime = now;
                // console.log(`⌨️ 🎯 CROSS-PLATFORM KEYSTROKE detected (vKey: ${e.vKey}, name: ${e.name}, platform: ${process.platform}) - recorded as keystroke 🎯`);
              }
            } else {
              // console.log(`[DEBUG_DEBOUNCE] Event SKIPPED due to debouncing (${timeSinceLastInput}ms < ${KEYSTROKE_DEBOUNCE_MS}ms)`);
            }
          } else {
            // console.log(`❌ IGNORED EVENT (vKey: ${e.vKey}, name: ${e.name}) - not recognized as input by isInputEvent()`);
          }
        }
      });
      console.log('✅ UNIFIED input listener (node-global-key-listener) started for BOTH keyboard and mouse.');
    }
    
    // Log that monitoring has started
    console.log('   🖱️ Mouse movements: 200ms polling');
    console.log('   ⌨️🖱️ Keystrokes & Mouse clicks: node-global-key-listener events');

  } catch (error) {
    console.error('❌ Failed to start SIMPLIFIED input monitoring:', error);
    // Fallback or further error handling if node-global-key-listener fails
    if (keyListener) {
      keyListener.kill();
      keyListener = null;
    }
  }
}

function detectMouseMovement() {
  try {
    // Commented out to reduce log noise during debugging
    // console.log('[DEBUG_MOUSE_MOVE] detectMouseMovement called.');
    
    // Platform-specific position detection
    let currentX = 0, currentY = 0;
    // console.log(`[DEBUG_MOUSE_MOVE] Platform: ${process.platform}. Attempting to get cursor position via Electron API.`);
    
    try {
      const point = screen.getCursorScreenPoint();
      currentX = point.x;
      currentY = point.y;
      // console.log(`[DEBUG_MOUSE_MOVE] Electron API: currentX=${currentX}, currentY=${currentY}`);
    } catch (error) {
      // console.error('[DEBUG_MOUSE_MOVE] Electron screen module is not available.');
      return; // Exit if we can't get cursor position
    }
    
    if (process.platform !== 'darwin' && process.platform !== 'win32' && process.platform !== 'linux') {
      // console.log(`[DEBUG_MOUSE_MOVE] Platform not supported for mouse movement: ${process.platform}`);
      return;
    }

    // Calculate movement distance
    const deltaX = currentX - lastMousePosition.x;
    const deltaY = currentY - lastMousePosition.y;
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // console.log(`[DEBUG_MOUSE_MOVE] lastX=${lastMousePosition.x}, lastY=${lastMousePosition.y}, totalMovement=${totalMovement}, threshold=${mouseMoveThreshold}`);

    // Only record significant movements
    if (totalMovement >= mouseMoveThreshold) {
      const movementCount = Math.floor(totalMovement / 10); // 1 movement per 10 pixels
      recordRealActivity('mouse_movement', movementCount);
      
      // Update last position
      lastMousePosition.x = currentX;
      lastMousePosition.y = currentY;
    } else {
      // console.log(`[DEBUG_MOUSE_MOVE] No significant movement: ${totalMovement}px`); // This can be noisy, leave commented for now
    }

  } catch (error: any) {
    // console.error('[DEBUG_MOUSE_MOVE] Error in detectMouseMovement:', error.message, error.stack);
  }
}

function stopInputMonitoring() {
  if (!inputMonitoringActive) return;
  
  console.log('🛑 Stopping UNIFIED input monitoring...');
  inputMonitoringActive = false;
  
  if (inputCheckInterval) {
    clearInterval(inputCheckInterval);
    inputCheckInterval = null;
  }
  
  if (keyListener) {
    try {
      keyListener.kill();
      console.log('✅ node-global-key-listener stopped.');
    } catch (err) {
      console.error('Error stopping node-global-key-listener:', err);
    }
    keyListener = null;
  }
  
  // Clear any remaining Windows-specific intervals if they were used
  if (winClickCheckInterval) {
    clearInterval(winClickCheckInterval);
    winClickCheckInterval = null;
  }
  if (winKeyCheckInterval) {
    clearInterval(winKeyCheckInterval);
    winKeyCheckInterval = null;
  }
  
  console.log('✅ UNIFIED input monitoring stopped');
}

function killAllLegacyDetection() {
  console.log('💥 NUCLEAR SHUTDOWN: Killing ALL legacy detection systems...');
  
  // MEMORY LEAK FIX: Force garbage collection first
  if (global.gc) {
    global.gc();
    console.log('✅ Forced garbage collection before cleanup');
  }
  
  // Clear ALL possible intervals that might be running legacy code
  for (let i = 1; i < 9999; i++) {
    clearInterval(i);
    clearTimeout(i);
  }
  
  // Additional memory cleanup
  if (global.gc) {
    setTimeout(() => {
      if (global.gc) {
        global.gc();
        console.log('✅ Post-cleanup garbage collection');
      }
    }, 1000);
  }
  
  // Disable any global AppleScript execution
  if ((global as any).legacyInputDetection) {
    (global as any).legacyInputDetection.stop?.();
    delete (global as any).legacyInputDetection;
  }
  
  // Override any legacy functions that might still be active
  if ((global as any).startMouseTracking) {
    (global as any).startMouseTracking = () => { console.log('🚫 Legacy mouse tracking BLOCKED'); };
  }
  if ((global as any).startKeyboardTracking) {
    (global as any).startKeyboardTracking = () => { console.log('🚫 Legacy keyboard tracking BLOCKED'); };
  }
  
  // BLOCK ALL APPLESCRIPT INPUT DETECTION
  const originalExec = require('child_process').exec;
  const originalExecSync = require('child_process').execSync;
  const util = require('util');
  
  // Override exec functions to block AppleScript input detection
  require('child_process').exec = function(command: string, ...args: any[]) {
    if (typeof command === 'string' && command.includes('osascript') && 
        (command.includes('button pressed') || command.includes('mouse state') || 
         command.includes('keys pressed') || command.includes('key down'))) {
      console.log('🚫 BLOCKED legacy AppleScript input detection:', command.substring(0, 50) + '...');
      return originalExec('echo "BLOCKED"', ...args);
    }
    return originalExec(command, ...args);
  };
  
  require('child_process').execSync = function(command: string, ...args: any[]) {
    if (typeof command === 'string' && command.includes('osascript') && 
        (command.includes('button pressed') || command.includes('mouse state') || 
         command.includes('keys pressed') || command.includes('key down'))) {
      console.log('🚫 BLOCKED legacy AppleScript input detection:', command.substring(0, 50) + '...');
      return 'BLOCKED';
    }
    return originalExecSync(command, ...args);
  };
  
  console.log('✅ ALL legacy detection systems terminated');
}
