# Testing Instructions for TimeFlow v1.0.46 - Window Management Fixes

## 📋 Overview
This version includes critical window management fixes to resolve the issue where the app wouldn't open properly from the dock/taskbar icon during timer tracking.

## 🔍 Issue Fixed
**Problem:** App would sometimes not open when clicking the dock icon (macOS) or taskbar icon (Windows) while timer was in progress. Users could only open the app from the tray icon menu.

**Solution:** Enhanced window management with proper restore, show, and focus handling.

## 📱 Test DMG Information
- **File:** `TimeFlow-v1.0.46-Test-WindowManagement.dmg`
- **Size:** 94MB
- **Type:** Unsigned (for testing purposes)
- **SHA256:** `04069ebda056d80a98a9f273eff2c6cdc6e642aeb6616236aa95685b91d5b67f`

## 🚀 Installation Instructions

### 1. Download and Install
1. Double-click `TimeFlow-v1.0.46-Test-WindowManagement.dmg` to mount it
2. Drag 'Ebdaa Work Time' to Applications folder
3. **Important:** Right-click the app in Applications and select 'Open' (required for unsigned apps)
4. Grant necessary permissions when prompted:
   - Screen Recording (System Preferences > Privacy & Security)
   - Accessibility (System Preferences > Privacy & Security)

### 2. Initial Setup
1. Login with your credentials
2. Configure your project settings
3. Test basic functionality first

## 🧪 Window Management Testing Protocol

### Test 1: Basic Window Activation
1. **Start the app** from Applications folder
2. **Login** and ensure app is working normally
3. **Minimize** the window (yellow button)
4. **Click dock icon** - Window should restore and come to front
5. **Result:** ✅ Window appears properly focused

### Test 2: Timer Tracking Window Management
1. **Start timer tracking** for any project
2. **Minimize** the window
3. **Click dock icon** - Window should restore and come to front
4. **Close** the window (red X button) - Should hide to tray
5. **Click dock icon** - Window should restore and come to front
6. **Result:** ✅ Window management works during tracking

### Test 3: Tray Icon Functionality
1. With timer running, **minimize** the window
2. **Right-click tray icon** - Should show context menu
3. **Click "Open Dashboard"** - Window should restore and focus
4. **Double-click tray icon** - Window should restore and focus
5. **Result:** ✅ Tray icon provides multiple ways to restore window

### Test 4: Multiple Activation Methods
1. **Start timer tracking**
2. **Hide/minimize** the window multiple times
3. **Alternate between:**
   - Dock icon clicks
   - Tray menu "Open Dashboard"
   - Tray icon double-clicks
4. **Result:** ✅ All methods work consistently

### Test 5: Cross-Platform Consistency
1. Test on different macOS versions if available
2. Check behavior with multiple desktops/spaces
3. Verify window appears on current desktop
4. **Result:** ✅ Consistent behavior across environments

## 🔧 Debug Testing

### Debug Console Access
- **Shortcut:** `Cmd+Shift+D` (or `Ctrl+Shift+D`)
- **Menu:** Right-click tray icon → "Debug Console"

### Console Messages to Watch For
Look for these messages in the debug console:
- `📱 Window activated from dock/taskbar click`
- `📱 Window activated from tray double-click`
- `📱 Window minimized and hidden`
- `📱 Window hidden (tracking active)`

### Expected Debug Output
```
📱 Window activated from dock/taskbar click
📱 Window activated from tray double-click
📱 Window minimized and hidden - use tray or dock icon to restore
📱 Window hidden (tracking active) - use tray or dock icon to restore
```

## 🐛 What to Test For

### ✅ Expected Behavior
- Dock icon always restores and focuses window
- Tray icon double-click restores and focuses window
- Tray menu "Open Dashboard" restores and focuses window
- Window appears on current desktop/space
- Window is properly focused (can type immediately)
- Consistent behavior during timer tracking

### ❌ Issues to Report
- Window doesn't appear when clicking dock icon
- Window appears but is not focused
- Window appears behind other windows
- Different behavior when timer is running vs stopped
- Window appears on wrong desktop/space
- App becomes unresponsive

## 📊 Test Results Template

### Environment
- **macOS Version:** ___________
- **Hardware:** ___________
- **Other Running Apps:** ___________

### Test Results
- [ ] Test 1: Basic Window Activation
- [ ] Test 2: Timer Tracking Window Management  
- [ ] Test 3: Tray Icon Functionality
- [ ] Test 4: Multiple Activation Methods
- [ ] Test 5: Cross-Platform Consistency

### Issues Found
- **Issue 1:** ___________
- **Issue 2:** ___________
- **Issue 3:** ___________

### Overall Assessment
- [ ] ✅ All tests passed - Ready for production
- [ ] ⚠️ Minor issues found - Needs tweaks
- [ ] ❌ Major issues found - Needs rework

## 🏗️ Production Build Process

Once testing is complete and successful:

1. **Update version** in all package.json files
2. **Run signed build:**
   ```bash
   ./build-signed-dmg.sh
   ```
3. **Test signed version** with same protocol
4. **Deploy to production**

## 📝 Changes Made in v1.0.46

### Core Changes
- Enhanced `app.on('activate')` event handler
- Added `mainWindow.restore()` for minimized windows
- Added `mainWindow.focus()` for proper focusing
- Added `app.focus()` for macOS-specific behavior
- Added tray icon double-click handler
- Improved second-instance handler

### Files Modified
- `desktop-agent/src/main.js` - Window management logic
- `desktop-agent/test-window-management.js` - Test script
- `WINDOW_MANAGEMENT_FIXES.md` - Documentation
- `package.json` - Version bump
- `desktop-agent/package.json` - Version bump

### Console Logging
Added detailed logging for debugging:
- Window activation events
- Window state changes
- User interaction tracking

## 🔗 Additional Resources
- [Window Management Fixes Documentation](WINDOW_MANAGEMENT_FIXES.md)
- [Test Script](desktop-agent/test-window-management.js)
- [Build Scripts](build-test-dmg.sh)

---

**Note:** This is an unsigned DMG for testing purposes. Production builds will be properly signed and notarized. 