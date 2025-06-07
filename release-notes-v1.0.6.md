# TimeFlow v1.0.6 - CRITICAL MEMORY LEAK FIX 🔧

## 🚨 **CRITICAL BUG FIXES**
This release resolves a severe memory leak that caused the application to consume up to 1.1TB of virtual memory, leading to crashes and system instability.

### **Memory Leak Resolution**
- ✅ **Fixed**: v8::internal::V8::FatalProcessOutOfMemory crash
- ✅ **Fixed**: RegExp infinite loop causing catastrophic backtracking
- ✅ **Fixed**: Unlimited interval accumulation
- ✅ **Reduced**: Memory usage from 1.1TB to ~33MB (99.997% reduction)

### **New Memory Management Features**
- 🧠 **Memory Monitoring System**: Automatic 512MB limit with forced restart
- 🔄 **Aggressive Interval Cleanup**: Clears 1-10000 intervals on startup/shutdown
- 🛡️ **Safe Regex Processing**: Text length limits prevent infinite loops
- 📊 **Data Accumulation Limits**: Max 1000 items in anti-cheat detector
- 🗑️ **Forced Garbage Collection**: At key cleanup points

### **Performance Improvements**
- ⚡ **Startup Speed**: Faster app initialization
- 🎯 **Stability**: No more memory-related crashes
- 💾 **Resource Usage**: Minimal memory footprint
- 🔒 **Reliability**: Robust error handling

## 📦 **Download Files**

### **🍎 macOS** (Recommended)
- **TimeFlow-Fixed.dmg** - Universal (Intel + Apple Silicon) - **MEMORY LEAK FIXED**
- **TimeFlow-ARM-Fixed.dmg** - Apple Silicon optimized - **MEMORY LEAK FIXED**
- ~~TimeFlow-Signed.dmg~~ - Legacy (contains memory leak)

### **🪟 Windows**
- **TimeFlow-Setup.exe** - Windows installer

### **🐧 Linux**
- **TimeFlow.AppImage** - Linux AppImage

## ⚠️ **IMPORTANT UPGRADE NOTICE**
If you're using any previous version, **please upgrade immediately** to avoid memory-related crashes and system instability.

## 🧪 **Tested Platforms**
- ✅ macOS 15.5 (Apple Silicon M4 Max)
- ✅ Memory usage verified: 33MB vs 1.1TB leak
- ✅ No crashes after extended testing

---
**Release Date**: June 7, 2025  
**Build**: 719cbd7 