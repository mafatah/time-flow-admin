// === PERFORMANCE OPTIMIZED VERSION - FIXES APPLE EVENTS LOOP ===

// Add event debouncing to prevent Apple Events loops
const EVENT_DEBOUNCE_MS = 200;
let lastEventTime = 0;
let eventDebounceTimeout = null;

// Debounced event handler wrapper
function debounceEvent(eventName, handler, delay = EVENT_DEBOUNCE_MS) {
  return function(...args) {
    const now = Date.now();
    
    // Clear any existing timeout
    if (eventDebounceTimeout) {
      clearTimeout(eventDebounceTimeout);
    }
    
    // Only execute if enough time has passed OR this is the first event
    if (now - lastEventTime > delay) {
      lastEventTime = now;
      handler.apply(this, args);
    } else {
      // Schedule execution for later
      eventDebounceTimeout = setTimeout(() => {
        lastEventTime = Date.now();
        handler.apply(this, args);
      }, delay);
    }
  };
}

// === PERFORMANCE OPTIMIZED TRAY CREATION ===
function createTrayOptimized() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(iconPath);
  
  // PERFORMANCE FIX: Debounced double-click handler
  const debouncedDoubleClick = debounceEvent('tray-double-click', () => {
    if (mainWindow) {
      console.log('📱 Tray double-click (debounced)');
      
      try {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        
        if (process.platform === 'darwin') {
          app.focus();
        }
        
        console.log('📱 Window activated from tray double-click');
      } catch (error) {
        console.error('❌ Error in tray double-click:', error);
      }
    }
  });
  
  tray.on('double-click', debouncedDoubleClick);
  
  // PERFORMANCE FIX: Throttled tray menu updates
  updateTrayMenuThrottled();
}

// === PERFORMANCE OPTIMIZED TRAY MENU UPDATES ===
let trayUpdateTimeout = null;
const TRAY_UPDATE_THROTTLE_MS = 500;

function updateTrayMenuThrottled() {
  if (trayUpdateTimeout) {
    clearTimeout(trayUpdateTimeout);
  }
  
  trayUpdateTimeout = setTimeout(() => {
    updateTrayMenuSafe();
  }, TRAY_UPDATE_THROTTLE_MS);
}

function updateTrayMenuSafe() {
  if (!tray) return;
  
  try {
    const isCurrentlyTracking = isTracking && !isPaused;
    const isPausing = isTracking && isPaused;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Ebdaa Work Time Agent`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: `Status: ${isCurrentlyTracking ? '🟢 Tracking' : isPausing ? '⏸️ Paused' : '⭕ Stopped'}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '📊 Open Dashboard',
        click: debounceEvent('open-dashboard', () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        })
      },
      { type: 'separator' },
      {
        label: '🔬 Debug Console',
        click: debounceEvent('debug-console', () => {
          createDebugWindow();
        })
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: debounceEvent('quit', () => {
          app.quit();
        })
      }
    ]);

    tray.setContextMenu(contextMenu);
    
    // Update tooltip (but don't do it too frequently)
    const tooltipStatus = isCurrentlyTracking ? 'Tracking' : isPausing ? 'Paused' : 'Stopped';
    tray.setToolTip(`Ebdaa Work Time: ${tooltipStatus}`);
    
  } catch (error) {
    console.error('❌ Error updating tray menu:', error);
  }
}

// === PERFORMANCE OPTIMIZED ACTIVATE EVENT ===
const debouncedActivate = debounceEvent('app-activate', () => {
  if (mainWindow) {
    console.log('📱 App activate event (debounced)');
    
    try {
      // Properly restore window when dock/taskbar icon is clicked
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      
      // Ensure window is brought to front on all platforms
      if (process.platform === 'darwin') {
        app.focus();
      }
      
      console.log('📱 Window activated from dock/taskbar click');
    } catch (error) {
      console.error('❌ Error in activate event:', error);
    }
  }
});

// === PERFORMANCE OPTIMIZED SECOND INSTANCE HANDLER ===
const debouncedSecondInstance = debounceEvent('second-instance', (event, commandLine, workingDirectory) => {
  console.log('🔔 Second Desktop Agent instance detected (debounced)');
  
  try {
    // Focus the existing window if it exists
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      
      // Ensure window is brought to front on all platforms
      if (process.platform === 'darwin') {
        app.focus();
      }
      
      // Show notification that desktop agent is already running
      const notification = new Notification({
        title: 'Ebdaa Work Time Agent',
        body: 'Desktop Agent is already running and has been brought to the front.',
        silent: false
      });
      notification.show();
    }
  } catch (error) {
    console.error('❌ Error in second instance handler:', error);
  }
});

// === PERFORMANCE MONITORING ===
function startPerformanceMonitoring() {
  const PERFORMANCE_CHECK_INTERVAL = 30000; // 30 seconds
  
  setInterval(() => {
    const usage = process.memoryUsage();
    const memoryMB = Math.round(usage.heapUsed / 1024 / 1024);
    
    console.log(`📊 Memory usage: ${memoryMB}MB`);
    
    // Alert if memory usage is excessive
    if (memoryMB > 500) {
      console.warn('⚠️ High memory usage detected:', memoryMB + 'MB');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🧹 Garbage collection forced');
      }
    }
  }, PERFORMANCE_CHECK_INTERVAL);
}

// === EXPORT PERFORMANCE FIXES ===
module.exports = {
  createTrayOptimized,
  updateTrayMenuThrottled,
  debouncedActivate,
  debouncedSecondInstance,
  startPerformanceMonitoring,
  debounceEvent
};

console.log('✅ Performance optimizations loaded'); 