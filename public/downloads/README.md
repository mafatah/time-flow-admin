# TimeFlow Desktop Applications - Development Placeholders

⚠️ **IMPORTANT: These are placeholder files for development purposes only**

## Current Status

The files in this directory (`TimeFlow.dmg`, `TimeFlow-Setup.exe`, `TimeFlow.AppImage`) are **not functional installers**. They are 1MB placeholder files created to prevent download errors during development.

## What's Coming

The TimeFlow Desktop Application is currently under development and will include:

### 🚀 Core Features
- **Random Screenshot Capture**: 2 screenshots per 10-minute period at random intervals
- **Activity Monitoring**: Real-time tracking of mouse, keyboard, and application usage
- **Idle Detection**: Automatic pause during inactive periods
- **App Tracking**: Monitor which applications are being used
- **URL Tracking**: Track website usage in browsers
- **Secure Sync**: Real-time synchronization with the web dashboard

### 📱 Platform Support
- **Windows**: Native installer (.exe) for Windows 10/11
- **macOS**: Universal binary (.dmg) for Intel and Apple Silicon Macs
- **Linux**: Portable AppImage for all Linux distributions

## How to Get the Actual Desktop App

1. **Contact Your Administrator**: Reach out to your TimeFlow administrator for the latest release
2. **Check for Updates**: The development team will announce when the official release is ready
3. **Use Web Version**: In the meantime, use the full-featured web application at your TimeFlow dashboard

## For Developers

To replace these placeholder files with actual desktop applications:

1. Build the desktop applications using the build scripts in `/scripts/`
2. Replace the placeholder files with the actual compiled applications
3. Update the `handleDownload` function in `src/components/ui/desktop-download.tsx` to enable downloads
4. Test the download functionality across all platforms

## File Sizes

Current placeholder files are 1MB each to avoid "file too small" errors when users attempt downloads. The actual desktop applications will be appropriately sized for their respective platforms.

---

**Last Updated**: May 31, 2024  
**Status**: Development Phase  
**Contact**: Your TimeFlow Administrator 