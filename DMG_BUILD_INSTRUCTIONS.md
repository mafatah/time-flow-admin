# 🚀 TimeFlow Signed DMG Build & Test Instructions

This guide provides step-by-step instructions for building and testing a properly signed DMG for TimeFlow.

## 📋 Prerequisites

### Required Software
- **macOS** (for building and signing)
- **Node.js** (v18 or later)
- **npm** (comes with Node.js)
- **Xcode Command Line Tools**
- **Apple Developer Account** with valid certificates

### Required Certificates
Verify you have the signing certificate installed:
```bash
security find-identity -v -p codesigning
```

You should see:
```
Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)
```

## 🏗️ Building the Signed DMG

### Step 1: Run the Build Script
```bash
./build-signed-dmg.sh
```

This script will:
- ✅ Verify prerequisites and certificates
- 🧹 Clean previous builds
- 🏗️ Build the web application
- 🔧 Configure desktop-agent for signing
- 📦 Install dependencies
- 🔨 Build the Electron application with signing
- 🔐 Verify signatures
- 🧪 Test DMG integrity
- 📁 Create the final test DMG

### Step 2: Expected Output
Upon successful completion, you'll see:
```
🎉 Signed DMG created successfully!
==============================================
📁 File: TimeFlow-v1.0.45-Signed-Test.dmg
📏 Size: [file size]
🔐 SHA256: [hash]
```

## 🧪 Testing the DMG

### Step 1: Install the Application
1. **Mount the DMG**: Double-click `TimeFlow-v1.0.45-Signed-Test.dmg`
2. **Install**: Drag "Ebdaa Work Time" to Applications folder
3. **Launch**: Open from Applications folder

### Step 2: Grant Permissions
When launching for the first time:
1. **Screen Recording**: System Preferences → Privacy & Security → Screen Recording
2. **Accessibility**: System Preferences → Privacy & Security → Accessibility
3. Enable permissions for "Ebdaa Work Time"

### Step 3: Run Automated Tests
```bash
./test-dmg-functionality.sh
```

This will perform automated checks and provide a comprehensive testing checklist.

## 📊 Manual Testing Checklist

### 🔐 Security & Permissions
- [ ] No security warnings on app launch
- [ ] Screen Recording permission granted
- [ ] Accessibility permission granted
- [ ] App signature verified

### 📸 Screenshot Functionality
- [ ] Screenshots captured automatically
- [ ] Screenshots appear in app
- [ ] Quality is good (not corrupted)
- [ ] Activity percentage calculated

### 🌐 URL Tracking
- [ ] Browser URLs detected
- [ ] URL changes tracked in real-time
- [ ] Multiple tabs tracked separately
- [ ] Data appears in reports

### 🖥️ App Tracking
- [ ] App switches detected immediately
- [ ] Usage time calculated correctly
- [ ] Data logged properly
- [ ] Reports show accurate info

### ⏱️ Time Tracking
- [ ] Project selection works
- [ ] Start/pause/stop functions work
- [ ] Timer displays correctly
- [ ] Sessions saved to database

### 📊 Database Sync
- [ ] Login functionality works
- [ ] Data syncs to Supabase
- [ ] Offline mode works
- [ ] Real-time updates

### 🔧 Debug Console
- [ ] Cmd+Shift+D opens console
- [ ] All systems show "WORKING"
- [ ] No error messages
- [ ] Real-time data updates

## 🐛 Troubleshooting

### Build Issues

**Problem**: Certificate not found
```
❌ Error: Signing certificate not found
```
**Solution**: Install the Apple Developer certificate in Keychain Access

**Problem**: Build fails with permission errors
```
❌ Build failed - dist directory not found
```
**Solution**: Check Node.js and npm are properly installed

### Runtime Issues

**Problem**: App won't launch
**Solution**: 
1. Check if app is properly signed: `codesign --verify "/Applications/Ebdaa Work Time.app"`
2. Try launching from Terminal to see error messages

**Problem**: Permissions not working
**Solution**:
1. Reset permissions: System Preferences → Privacy & Security
2. Remove and re-add app permissions
3. Restart the app

**Problem**: Features not working
**Solution**:
1. Open debug console (Cmd+Shift+D)
2. Check system status
3. Look for error messages in console

## 📁 File Structure

After building, you'll have:
```
time-flow-admin/
├── TimeFlow-v1.0.45-Signed-Test.dmg  # Final signed DMG
├── build-signed-dmg.sh               # Build script
├── test-dmg-functionality.sh         # Test script
├── desktop-agent/
│   ├── dist/                         # Built Electron app
│   ├── entitlements.mac.plist        # macOS entitlements
│   └── package.json                  # Updated config
└── dist/                             # Web build artifacts
```

## 🚀 Distribution Ready

Once all tests pass:

1. **Rename for distribution**:
   ```bash
   mv TimeFlow-v1.0.45-Signed-Test.dmg TimeFlow-v1.0.45-Release.dmg
   ```

2. **Upload to releases**:
   - GitHub Releases
   - Download server
   - Update website links

3. **Generate checksums**:
   ```bash
   shasum -a 256 TimeFlow-v1.0.45-Release.dmg > checksums.txt
   ```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review build logs for errors
3. Verify all prerequisites are met
4. Test on a clean macOS system

## 🔄 Version Updates

To build a new version:
1. Update version in `package.json`
2. Update `CURRENT_VERSION` in `build-signed-dmg.sh`
3. Run the build script
4. Test thoroughly before distribution

---

**✅ Ready to build your signed DMG? Run `./build-signed-dmg.sh` to get started!** 