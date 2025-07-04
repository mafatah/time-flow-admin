# Window Management Fixes

## Issue Description
The app would sometimes not open properly when clicking the dock icon (macOS) or taskbar icon (Windows) while the timer was in progress. Users could only open the app from the tray icon menu.

## Root Cause
The `app.on('activate')` event handler was not properly focusing the window when the dock/taskbar icon was clicked. It only called `mainWindow.show()` without:
1. Restoring the window if it was minimized
2. Focusing the window to bring it to the front
3. Ensuring the app gains focus on macOS

## Fixes Applied

### 1. Enhanced Activate Event Handler
**File:** `desktop-agent/src/main.js`

**Before:**
```javascript
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
```

**After:**
```javascript
app.on('activate', () => {
  if (mainWindow) {
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
  }
});
```

### 2. Added Tray Double-Click Handler
**File:** `desktop-agent/src/main.js`

Added a double-click handler to the tray icon that provides the same behavior as the dock/taskbar icon:

```javascript
// Add double-click handler to show window (same as dock icon)
tray.on('double-click', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
    
    if (process.platform === 'darwin') {
      app.focus();
    }
    
    console.log('📱 Window activated from tray double-click');
  }
});
```

### 3. Improved Second Instance Handler
**File:** `desktop-agent/src/main.js`

Enhanced the second instance handler to ensure proper window restoration:

```javascript
// Updated to ensure proper show/focus order
mainWindow.show();
mainWindow.focus();

// Ensure window is brought to front on all platforms
if (process.platform === 'darwin') {
  app.focus();
}
```

### 4. Added Better Logging
Added console logging to track window management events for easier debugging:
- Window minimized and hidden
- Window closed/hidden when tracking active
- Window activated from dock/taskbar click
- Window activated from tray double-click

## Testing

### Manual Testing
1. Start the desktop agent
2. Begin timer tracking
3. Minimize the window
4. Click the dock icon (macOS) or taskbar icon (Windows)
5. **Expected:** Window should restore and come to the front
6. Try closing the window and reopening from dock/taskbar
7. **Expected:** Window should show and focus properly

### Test Script
A test script is available at `desktop-agent/test-window-management.js`:

```bash
cd desktop-agent
node test-window-management.js
```

This creates a simple test window that demonstrates the fixed behavior.

## Platform-Specific Behavior

### macOS
- `app.focus()` is called to ensure the app gains focus
- Works with dock icon clicks and CMD+Tab switching

### Windows
- `mainWindow.focus()` brings the window to the front
- Works with taskbar icon clicks and Alt+Tab switching

### Linux
- `mainWindow.focus()` brings the window to the front
- Works with panel/taskbar icon clicks

## Benefits
1. **Consistent Experience:** Dock/taskbar icon now works the same as tray menu
2. **Better User Experience:** Users can easily access the app during timer sessions
3. **Cross-Platform:** Works consistently across macOS, Windows, and Linux
4. **Debugging:** Better logging for troubleshooting window management issues

## Notes
- The window will still be prevented from closing when tracking is active
- The window will be hidden (not minimized) when the minimize button is clicked
- Both single-click (tray menu) and double-click (tray icon) work to show the window
- The app maintains single-instance behavior with proper window restoration 