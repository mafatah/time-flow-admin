# Desktop App Laptop Closure & Screenshot Fix

## Issues Fixed

The desktop app had several critical issues:

1. **🔴 App doesn't close when laptop is closed** - The app continued running in background
2. **🔴 Screenshots not happening** - Screenshot capture was failing during system sleep/wake
3. **🔴 App continues running** - No proper power management for laptop closure events

## Solution Overview

I've implemented a comprehensive fix with enhanced power management that includes:

### ✅ Enhanced Power Management
- **Laptop closure detection** - Properly detects when laptop lid is closed
- **System suspend/resume handling** - Manages sleep and wake events
- **Screenshot pause/resume** - Pauses screenshots when screen is locked/laptop closed
- **Graceful tracking management** - Pauses tracking on suspend, resumes on wake

### ✅ Smart Screenshot Management
- **System state checking** - Screenshots only happen when system is active
- **Screen lock detection** - Pauses screenshots during screen lock
- **Failure recovery** - Better error handling for screenshot failures
- **Memory optimization** - Prevents memory leaks during suspend/resume cycles

### ✅ Crash Recovery & Monitoring
- **Process monitoring** - Automatic restart on crashes
- **Memory usage tracking** - Prevents memory overload
- **Health checks** - Regular system health monitoring
- **Graceful shutdown** - Proper cleanup on system shutdown

## Files Modified/Created

### Modified Files

1. **`desktop-agent/src/main.js`** - Enhanced with:
   - Comprehensive power event handling (suspend/resume/shutdown/lock/unlock)
   - System state tracking (suspended, screenshotsPaused flags)
   - Enhanced screenshot capture with system state checks
   - Proper interval cleanup during suspend
   - System state persistence across restarts

### New Files Created

2. **`desktop-agent/enhanced-power-management.js`** - New power management system:
   - Process monitoring and automatic restart
   - Memory usage tracking
   - Enhanced logging with rotation
   - Health monitoring
   - Graceful shutdown handling

3. **`desktop-agent/start-with-power-management.sh`** - Startup script:
   - Easy-to-use startup script
   - Dependency checking
   - Environment setup
   - User-friendly output

## How It Works

### Power Management Flow

```
Laptop Open & Active
    ↓
Desktop Agent Running
    ↓
📱 Normal Operation:
   • Screenshots every 2-6 minutes
   • Activity tracking active
   • All monitoring running
    ↓
💤 Laptop Closed (System Suspend):
   • Detect suspend event
   • Pause tracking
   • Clear all intervals
   • Save system state
   • Show notification
    ↓
⚡ Laptop Opened (System Resume):
   • Detect resume event
   • Calculate suspend duration
   • Auto-resume if < 30 minutes
   • Show confirmation if > 30 minutes
   • Restart all monitoring
```

### Screenshot Management Flow

```
Screenshot Scheduled
    ↓
System State Check:
   • Is system suspended? → Skip
   • Are screenshots paused? → Skip
   • Is tracking active? → Proceed
    ↓
Capture Screenshot:
   • Check permissions
   • Capture screen
   • Calculate activity metrics
   • Upload to database
   • Schedule next screenshot
    ↓
Handle Failures:
   • Log failure
   • Implement retry logic
   • Continue scheduling
```

## Usage Instructions

### Option 1: Enhanced Power Management (Recommended)

```bash
cd desktop-agent
./start-with-power-management.sh
```

This starts the desktop agent with:
- ✅ Laptop closure detection
- ✅ Automatic crash recovery
- ✅ Memory monitoring
- ✅ Enhanced logging
- ✅ Graceful shutdown

### Option 2: Regular Start (Basic)

```bash
cd desktop-agent
npm start
```

This uses the standard startup but still includes the power management fixes in the main code.

## Key Features

### 🔋 Power Management
- **Suspend Detection**: Automatically detects when laptop is closed or system goes to sleep
- **Resume Handling**: Smart resume logic with duration-based auto-resume
- **State Persistence**: Saves state during shutdown/suspend for recovery
- **Graceful Shutdown**: Proper cleanup on system shutdown

### 📸 Screenshot Management  
- **Smart Scheduling**: Only schedules screenshots when system is active
- **Pause/Resume**: Pauses during screen lock, resumes on unlock
- **Failure Recovery**: Better error handling and retry logic
- **Permission Checking**: Validates permissions before capture attempts

### 🔄 Process Management
- **Auto Restart**: Automatically restarts on crashes
- **Memory Monitoring**: Tracks memory usage and prevents leaks  
- **Health Checks**: Regular health monitoring with alerts
- **Process Cleanup**: Proper cleanup of all intervals and resources

### 📝 Enhanced Logging
- **Detailed Logs**: Comprehensive logging of all events
- **Log Rotation**: Automatic log rotation to prevent disk space issues
- **Event Tracking**: Specific logging for power events and screenshots
- **Debug Information**: Rich debug output for troubleshooting

## Testing the Fix

### Test Laptop Closure
1. Start the desktop agent with power management
2. Begin time tracking
3. Close your laptop for 2-3 minutes
4. Open laptop
5. ✅ **Expected**: App should pause tracking when closed, resume when opened

### Test Screenshot Capture
1. Start tracking
2. Wait for screenshot notifications
3. Lock/unlock screen
4. ✅ **Expected**: Screenshots pause during lock, resume after unlock

### Test System Recovery
1. Start tracking
2. Force quit the process
3. ✅ **Expected**: Process should restart automatically

## Configuration

The power management system can be configured in `enhanced-power-management.js`:

```javascript
const CONFIG = {
  maxRestartAttempts: 5,        // Max restart attempts
  restartDelay: 5000,           // Restart delay (ms)
  healthCheckInterval: 30000,   // Health check interval (ms)
  maxMemoryMB: 512,            // Memory limit (MB)
  logRotationSize: 10485760,   // Log rotation size (bytes)
  crashRecoveryEnabled: true   // Enable crash recovery
};
```

## Troubleshooting

### Issue: Screenshots still not working
- **Check**: Screen recording permissions (macOS)
- **Solution**: Go to System Preferences > Security & Privacy > Privacy > Screen Recording

### Issue: App not detecting laptop closure
- **Check**: Power management events in logs
- **Solution**: Ensure using the enhanced power management script

### Issue: Process keeps crashing
- **Check**: `power-management.log` for error details
- **Solution**: Check dependencies and permissions

### Issue: High memory usage
- **Check**: Memory usage in health check logs
- **Solution**: Memory monitoring will automatically trigger cleanup

## Log Files

- **`power-management.log`** - Main power management logs
- **`power-management.log.old`** - Rotated log file
- **`system-state.json`** - Saved system state (temporary)
- **`offline-queue.json`** - Offline queue backup

## Migration Notes

### Upgrading from Previous Version
1. Stop the current desktop agent
2. The enhanced power management is backward compatible
3. Use the new startup script for best results
4. Existing functionality remains unchanged

### Reverting Changes
If needed, the original functionality is preserved:
- All existing IPC handlers work the same
- Screenshot intervals remain configurable
- Tracking behavior is unchanged except for power management

## Summary

This fix provides comprehensive solutions for:
- ✅ **Laptop closure detection** with proper tracking pause/resume
- ✅ **Screenshot management** with system state awareness  
- ✅ **Process reliability** with crash recovery and monitoring
- ✅ **System integration** with proper power event handling
- ✅ **User experience** with notifications and graceful handling

The desktop app now properly handles laptop closure events, manages screenshots intelligently, and provides robust power management for reliable operation. 