# TimeFlow Auto-Update System

## Overview
TimeFlow now includes a comprehensive auto-update system that allows users to easily update the application without manual downloads and installations.

## Features

### 🔄 Automatic Update Checks
- **Background Checks**: Automatically checks for updates every 6 hours
- **Startup Check**: Checks for updates 30 seconds after app startup
- **Manual Check**: Users can manually check via tray menu

### 📥 Intelligent Download Management
- **User Confirmation**: Asks before downloading updates
- **Background Download**: Downloads happen in the background
- **Progress Tracking**: Shows download progress
- **Error Handling**: Graceful error handling with user notifications

### 🚀 Easy Installation
- **User Choice**: Users decide when to install updates
- **Notification System**: Notifications when updates are available/ready
- **One-Click Install**: Simple restart-and-install process

## User Interface

### Tray Menu Options
- **🔄 Check for Updates**: Manually check for new versions
- **⬇️ Download Update**: Download available update (when update is available)
- **ℹ️ Version X.X.X**: Shows current version (disabled item)

### Notifications
- **Update Available**: Notifies when new version is found
- **Download Started**: Confirms download has begun
- **Update Ready**: Notifies when update is ready to install

## How It Works

### 1. Update Detection
```typescript
// Automatic check every 6 hours
setInterval(() => {
  checkForUpdates(false);
}, 6 * 60 * 60 * 1000);
```

### 2. User Workflow
1. **Notification**: User receives notification of available update
2. **Download**: User clicks "Download Update" in tray menu
3. **Confirmation**: System asks for download confirmation
4. **Background Download**: Update downloads while user works
5. **Install Notification**: User notified when ready to install
6. **Installation**: User chooses when to restart and install

### 3. Update Source
- **GitHub Releases**: Automatically detects releases from your GitHub repository
- **Custom Server**: Can be configured for custom update servers

## Configuration

### Package.json Setup
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "time-flow-admin"
    }
  }
}
```

### Environment Setup
1. **GitHub Token**: Set `GH_TOKEN` environment variable for publishing
2. **Code Signing**: Required for macOS notarization and Windows signing
3. **Repository**: Update the repository settings in the configuration

## Publishing Updates

### 1. Prepare Release
```bash
# Update version in package.json
npm version patch  # or minor/major

# Build the application
npm run build

# Create and publish release
npm run electron:build
```

### 2. GitHub Release
- The app automatically checks GitHub releases
- Users get notified of new releases
- Downloads are served from GitHub

### 3. Auto-Deploy Setup
```bash
# Set GitHub token
export GH_TOKEN="your_github_token_here"

# Build and publish
npm run electron:build
```

## Implementation Details

### Auto-Updater Module (`electron/autoUpdater.ts`)
- **Event Handling**: Manages all update lifecycle events
- **User Interface**: Handles dialogs and notifications
- **Error Management**: Comprehensive error handling
- **Progress Tracking**: Real-time download progress

### Main Process Integration
- **IPC Handlers**: Communication with renderer process
- **Tray Menu**: Update status in system tray
- **Lifecycle Management**: Proper cleanup and memory management

### Security Features
- **Code Signing**: Ensures update authenticity
- **HTTPS Downloads**: Secure download channels
- **Verification**: Validates update integrity

## User Benefits

### 🚀 Convenience
- **No Manual Downloads**: Updates happen automatically
- **Background Process**: Doesn't interrupt work
- **One-Click Install**: Simple installation process

### 🔒 Security
- **Signed Updates**: Verified and trusted updates
- **Secure Channels**: HTTPS download protection
- **User Control**: User decides when to install

### 📊 Productivity
- **Minimal Disruption**: Choose when to restart
- **Latest Features**: Always access to newest features
- **Bug Fixes**: Automatic delivery of fixes

## Troubleshooting

### Common Issues

#### 1. Update Check Fails
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection, try manual check

#### 2. Download Fails
- **Cause**: Insufficient disk space or network issues
- **Solution**: Free up space, check connection, retry

#### 3. Installation Fails
- **Cause**: Permissions or running processes
- **Solution**: Close app completely, run as administrator

### Debug Information
- **Console Logs**: Check app console for detailed error messages
- **Update Status**: Use `getUpdateStatus()` for current state
- **Version Info**: Displayed in tray menu

## Developer Notes

### Testing Updates
1. **Local Testing**: Use staging releases for testing
2. **Version Bumping**: Ensure version numbers are incremented
3. **Release Notes**: Include meaningful release notes

### Monitoring
- **Error Tracking**: Monitor update failure rates
- **Usage Analytics**: Track update adoption
- **Performance**: Monitor download speeds and success rates

### Future Enhancements
- **Delta Updates**: Only download changed files
- **Rollback System**: Ability to rollback problematic updates
- **Update Scheduling**: Allow users to schedule updates
- **Multiple Channels**: Support for beta/stable channels

## Security Considerations

### Code Signing
- **macOS**: Apple Developer ID required
- **Windows**: Code signing certificate required
- **Verification**: Updates verified before installation

### Distribution
- **GitHub Security**: Leverages GitHub's security infrastructure
- **HTTPS**: All downloads over secure connections
- **Integrity Checks**: SHA verification of downloads

This auto-update system ensures TimeFlow users always have the latest features and security updates with minimal effort and maximum convenience. 