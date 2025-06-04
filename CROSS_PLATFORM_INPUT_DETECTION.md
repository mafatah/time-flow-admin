# Cross-Platform Input Detection System

## Overview

The Time-Flow desktop application now features a **unified, cross-platform input detection system** that accurately tracks mouse movements, mouse clicks, and keyboard strokes without cross-contamination across **macOS**, **Windows**, and **Linux**.

## 🌐 Supported Platforms

| Platform | Status | Architecture Support | Notes |
|----------|--------|---------------------|--------|
| **macOS** | ✅ Fully Supported | ARM64, x64 | Primary development platform |
| **Windows** | ✅ Fully Supported | x64 | Tested and compatible |
| **Linux** | ✅ Supported | x64 | Compatible via node-global-key-listener |

## 🔧 Technical Architecture

### Input Detection Methods

1. **Mouse Movement Detection**
   - Uses Electron's `screen.getCursorScreenPoint()` API
   - Cross-platform compatibility via Electron's native abstractions
   - Polling interval: 200ms for optimal performance

2. **Mouse Click Detection**
   - **macOS**: Detects via event names (`MOUSE LEFT`, `MOUSE RIGHT`, `MOUSE MIDDLE`)
   - **Windows**: Uses virtual key codes (`VK_LBUTTON=0x01`, `VK_RBUTTON=0x02`, `VK_MBUTTON=0x04`)
   - **Cross-platform**: `node-global-key-listener` library for consistent behavior

3. **Keyboard Detection**
   - Global keyboard event monitoring via `node-global-key-listener`
   - Supports all standard keys and special keys (modifiers, function keys, etc.)
   - Real-time detection without requiring application focus

### Key Features

- ✅ **No Cross-Contamination**: Mouse clicks never count as keystrokes and vice versa
- ✅ **Real Input Only**: No simulation or artificial events
- ✅ **Debounced Events**: Prevents duplicate counting (200ms debounce)
- ✅ **Activity Scoring**: Weighted scoring system (clicks: +15, keystrokes: +10, movement: +2)
- ✅ **Idle Detection**: Smart idle time tracking with decay algorithms

## 🧪 Testing Cross-Platform Compatibility

### Windows Compatibility Test

Run the Windows compatibility test to verify the system works on your Windows machine:

```bash
npm run test:windows
```

This will:
1. Test `node-global-key-listener` initialization
2. Verify keyboard event detection
3. Verify mouse click event detection
4. Provide real-time feedback on input classification

### Manual Testing Protocol

1. **Start the Application**:
   ```bash
   npm run electron
   ```

2. **Verify the Platform is Detected**:
   Look for logs like:
   ```
   🌐 Current Platform: win32 (x64)
   ✅ Platform 'win32' is officially supported!
   ```

3. **Test Input Detection**:
   - Move your mouse → Should see `🖱️ Real mouse movement detected`
   - Click the mouse → Should see `🖱️ 🎯 CROSS-PLATFORM MOUSE CLICK detected`
   - Type keys → Should see `⌨️ 🎯 CROSS-PLATFORM KEYSTROKE detected`

## 📊 Platform-Specific Considerations

### macOS
- **Event Names**: `MOUSE LEFT`, `MOUSE RIGHT`, `MOUSE MIDDLE`
- **Virtual Keys**: Often `vKey=0` for mouse events
- **Permissions**: May require accessibility permissions for global input monitoring

### Windows
- **Event Names**: Varies, may include `MOUSE BUTTON` formats
- **Virtual Keys**: Standard Windows virtual key codes (`VK_LBUTTON`, `VK_RBUTTON`, etc.)
- **Permissions**: Usually works without additional permissions

### Linux
- **Event Names**: Similar to Windows
- **Virtual Keys**: X11/Wayland dependent
- **Permissions**: May require user group permissions for input devices

## 🔍 Debugging Platform Issues

### Enable Debug Logging

The system includes comprehensive debug logging:

```
[RAW_INPUT_EVENT] state: UP, vKey: 1, name: MOUSE LEFT, type: undefined
[DEBUG_PROCESSING] Processing UP event: vKey=1, name=MOUSE LEFT, platform=win32
[DEBUG_CLASSIFICATION] Event name (uppercase): "MOUSE LEFT", vKey: 1, platform: win32
🖱️ 🎯 CROSS-PLATFORM MOUSE CLICK detected (vKey: 1, name: MOUSE LEFT, platform: win32)
```

### Common Issues and Solutions

#### Issue: Mouse clicks not detected on Windows
**Solution**: Check if the virtual key codes are being properly recognized:
- Look for `vKey: 1, 2, or 4` in logs
- Verify event names contain `MOUSE`

#### Issue: Keyboard events not working
**Solution**: 
1. Ensure `node-global-key-listener` is properly installed
2. Check if the application has necessary permissions
3. Run the compatibility test: `npm run test:windows`

#### Issue: High CPU usage
**Solution**: The mouse movement polling is optimized to 200ms intervals. If needed, adjust in `systemMonitor.ts`:
```typescript
}, 200); // Increase this value for lower CPU usage
```

## 🛠️ Dependencies

### Core Dependencies
- **`node-global-key-listener`**: Cross-platform global input event monitoring
- **`electron`**: Provides screen API for mouse position detection

### Platform-Specific Requirements
- **Windows**: No additional requirements
- **macOS**: May require accessibility permissions
- **Linux**: May require input device permissions

## 📈 Performance Characteristics

| Metric | Value | Notes |
|--------|--------|-------|
| Mouse Movement Polling | 200ms | Configurable |
| Input Event Debouncing | 200ms | Prevents duplicates |
| Memory Usage | Low | Event-driven architecture |
| CPU Usage | Minimal | Optimized polling intervals |

## 🔄 Migration from Legacy Systems

The new cross-platform system replaces all previous platform-specific implementations:

- ❌ **Removed**: AppleScript-based detection (unreliable)
- ❌ **Removed**: Windows PowerShell polling (inefficient)
- ❌ **Removed**: Idle time-based click detection (inaccurate)
- ✅ **Added**: Unified `node-global-key-listener` system
- ✅ **Added**: Cross-platform mouse button detection
- ✅ **Added**: Robust event classification

## 🚀 Future Enhancements

Planned improvements for cross-platform compatibility:

1. **Enhanced Linux Support**: Wayland-specific optimizations
2. **Permission Management**: Automated permission request handling
3. **Performance Tuning**: Platform-specific optimization profiles
4. **Extended Debugging**: More detailed platform-specific diagnostics

## 📋 Troubleshooting Checklist

Before reporting issues, please verify:

- [ ] Platform is officially supported (macOS, Windows, Linux)
- [ ] `node-global-key-listener` is installed (`npm list node-global-key-listener`)
- [ ] Compatibility test passes (`npm run test:windows`)
- [ ] Debug logs show platform detection (`Platform: win32 (x64)`)
- [ ] Application has necessary permissions
- [ ] No conflicting global hotkey applications running

## 📞 Support

For platform-specific issues:

1. **Run the compatibility test** first
2. **Enable debug logging** and capture relevant logs
3. **Specify your exact platform** and architecture
4. **Include the debug logs** showing the issue

The cross-platform input detection system is designed to work reliably across all supported platforms with minimal configuration required. 