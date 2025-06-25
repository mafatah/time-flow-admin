# 🚀 **TimeFlow Release Workflow Guide**

Complete guide for releasing TimeFlow with code signing, notarization, and cross-platform support.

## **🔧 Prerequisites**

### **Development Environment**
- **macOS**: Required for building and signing macOS apps
- **Node.js**: v18+ with npm
- **GitHub CLI**: `brew install gh`
- **Electron Builder**: Installed via npm

### **Apple Developer Account**
- **Apple ID**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Team ID**: `6GW49LK9V9`
- **Certificate**: Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)

### **GitHub Configuration**
- **Repository**: `mafatah/time-flow-admin`
- **Personal Access Token**: `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`

---

## **📋 Release Scripts Overview**

### **1. Ultimate Release Script** `scripts/ultimate-release.sh`
- **Purpose**: Complete release for ALL platforms (macOS, Windows, Linux)
- **Features**: Code signing, notarization, GitHub release, auto-updater
- **Recommended**: Use this for major releases

### **2. Complete Release Script** `scripts/complete-release.sh`  
- **Purpose**: macOS-focused release with signing and notarization
- **Features**: macOS DMG creation, GitHub release, web deployment
- **Recommended**: Use for macOS-only updates

### **3. Cross-Platform Build** `scripts/build-cross-platform.sh`
- **Purpose**: Build Windows and Linux versions only
- **Features**: EXE and AppImage creation
- **Recommended**: Use for testing cross-platform compatibility

---

## **🚀 Step-by-Step Release Process**

### **Step 1: Prepare for Release**

1. **Update Version Number** (done automatically by scripts)
   ```bash
   npm version patch --no-git-tag-version
   ```

2. **Verify Environment**
   ```bash
   # Check Apple Developer Certificate
   security find-identity -v -p codesigning
   
   # Verify GitHub CLI
   gh auth status
   
   # Check current version
   grep '"version"' package.json
   ```

3. **Test Current Build**
   ```bash
   npm run build
   npm run build:all
   ```

### **Step 2: Choose Release Type**

#### **🌟 Full Cross-Platform Release** (Recommended)
```bash
# This builds ALL platforms and creates complete GitHub release
./scripts/ultimate-release.sh
```

#### **🍎 macOS-Only Release**
```bash
# This builds only macOS with signing and notarization
./scripts/complete-release.sh
```

#### **🔧 Cross-Platform Build Only** (No Release)
```bash
# This builds Windows and Linux without creating release
./scripts/build-cross-platform.sh
```

### **Step 3: Verify Release**

1. **Check GitHub Release**
   - Visit: `https://github.com/mafatah/time-flow-admin/releases/tag/v1.0.XX`
   - Verify all files are present
   - Check download links work

2. **Test Auto-Updater**
   - macOS: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
   - Windows: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest.yml`

3. **Verify Web Deployment**
   - Check: `https://time-flow-admin.vercel.app/download`
   - Ensure version numbers are updated
   - Test download buttons

---

## **🔐 Code Signing & Notarization**

### **macOS Certificate Setup**

1. **Install Certificate**
   ```bash
   # Import the Developer ID Application certificate
   # Use the CertificateSigningRequest.certSigningRequest file
   # Install via Keychain Access or Xcode
   ```

2. **Verify Installation**
   ```bash
   security find-identity -v -p codesigning
   # Should show: "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
   ```

3. **Environment Variables** (set automatically by scripts)
   ```bash
   export APPLE_ID="alshqawe66@gmail.com"
   export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
   export APPLE_TEAM_ID="6GW49LK9V9"
   ```

### **Entitlements Configuration**
The `entitlements.mac.plist` file includes:
- Screen recording permissions
- Microphone and camera access
- Automation permissions
- Network access
- File system access

---

## **⚙️ Auto-Update Configuration**

### **macOS Auto-Update** (`latest-mac.yml`)
```yaml
version: 1.0.XX
files:
  - url: TimeFlow-v1.0.XX-Intel.dmg
    sha512: [HASH]
    size: [SIZE]
  - url: TimeFlow-v1.0.XX-ARM64.dmg
    sha512: [HASH]
    size: [SIZE]
path: TimeFlow-v1.0.XX-Intel.dmg
sha512: [HASH]
releaseDate: '2025-XX-XXTXX:XX:XX.000Z'
```

### **Windows Auto-Update** (`latest.yml`)
```yaml
version: 1.0.XX
files:
  - url: TimeFlow-v1.0.XX-Setup.exe
    sha512: [HASH]
    size: [SIZE]
path: TimeFlow-v1.0.XX-Setup.exe
sha512: [HASH]
releaseDate: '2025-XX-XXTXX:XX:XX.000Z'
```

---

## **📱 Platform-Specific Build Details**

### **🍎 macOS Builds**
- **Intel**: `Ebdaa Work Time-1.0.XX.dmg` → `TimeFlow-v1.0.XX-Intel.dmg`
- **Apple Silicon**: `Ebdaa Work Time-1.0.XX-arm64.dmg` → `TimeFlow-v1.0.XX-ARM64.dmg`
- **Signing**: Developer ID Application certificate
- **Notarization**: Automatic via Apple notary service
- **Requirements**: macOS 10.14+ (Intel) / macOS 11.0+ (Apple Silicon)

### **🪟 Windows Builds**
- **Installer**: `TimeFlow Setup 1.0.XX.exe` → `TimeFlow-v1.0.XX-Setup.exe`
- **Architecture**: x64 (64-bit)
- **Installer**: NSIS with custom options
- **Requirements**: Windows 10/11 (64-bit)

### **🐧 Linux Builds**
- **Format**: `TimeFlow-1.0.XX.AppImage` → `TimeFlow-v1.0.XX-Linux.AppImage`
- **Portable**: No installation required
- **Requirements**: Ubuntu 18.04+ or equivalent

---

## **🌐 Web Deployment**

### **Automatic Deployment**
- **Platform**: Vercel
- **Trigger**: Push to `main` branch
- **URL**: `https://time-flow-admin.vercel.app`

### **Download Page Updates**
Two locations need version updates:
1. `src/pages/download/index.tsx` - Main download page
2. `src/components/ui/desktop-download.tsx` - Login page download

### **Manual Deployment** (if needed)
```bash
# Deploy to Vercel manually
vercel --prod
```

---

## **🔍 Troubleshooting**

### **Common Issues**

#### **Code Signing Fails**
```bash
# Check certificate installation
security find-identity -v -p codesigning

# Reinstall certificate if needed
# Use Keychain Access to import CertificateSigningRequest.certSigningRequest
```

#### **Notarization Timeout**
- **Cause**: Apple's notary service is slow
- **Solution**: Wait up to 30 minutes, or retry
- **Check Status**: Apple will email results to Apple ID

#### **GitHub Release Fails**
```bash
# Check GitHub CLI authentication
gh auth status

# Re-authenticate if needed
gh auth login
```

#### **Auto-Update Not Working**
- Verify `latest-mac.yml` is in GitHub release assets
- Check SHA512 hashes match exactly
- Ensure file sizes are correct

### **Build Failures**

#### **Electron Builder Errors**
```bash
# Clear node_modules and rebuild
rm -rf node_modules
npm install

# Clear electron cache
npx electron-builder install-app-deps
```

#### **Missing Dependencies**
```bash
# Rebuild native modules
npm run rebuild

# Install specific dependencies
npm install --platform=darwin --arch=x64
npm install --platform=darwin --arch=arm64
```

---

## **📊 Verification Checklist**

### **Pre-Release**
- [ ] Version number updated in package.json
- [ ] Download URLs updated in web app
- [ ] Code signing certificate installed
- [ ] GitHub CLI authenticated
- [ ] Environment variables set

### **Post-Release**
- [ ] GitHub release contains all files
- [ ] Download links work correctly
- [ ] DMG files install without security warnings
- [ ] Auto-update notifications appear
- [ ] Web app shows correct version
- [ ] All platforms tested on clean machines

### **Auto-Update Verification**
- [ ] `latest-mac.yml` accessible from GitHub
- [ ] `latest.yml` accessible from GitHub
- [ ] SHA512 hashes match actual files
- [ ] File sizes are correct
- [ ] Existing users see update notification

---

## **🎯 Best Practices**

### **Version Management**
- Use semantic versioning (1.0.XX)
- Update version in all locations consistently
- Test with pre-release versions first

### **Security**
- Always sign macOS builds
- Verify notarization completes successfully
- Test installations on clean machines
- Use app-specific passwords for automation

### **Testing**
- Test auto-updates before public release
- Verify all download links work
- Check installations on multiple OS versions
- Test permission requests and functionality

### **Documentation**
- Update release notes with meaningful changes
- Document breaking changes clearly
- Include installation instructions
- Provide troubleshooting guides

---

## **📞 Emergency Procedures**

### **Rollback Release**
```bash
# Delete problematic release
gh release delete v1.0.XX

# Restore previous latest-mac.yml
git checkout HEAD~1 latest-mac.yml
git commit -m "Rollback auto-updater to previous version"
git push origin main
```

### **Quick Hotfix**
```bash
# For critical bugs, use patch version
npm version patch --no-git-tag-version

# Build and release immediately
./scripts/complete-release.sh
```

### **Emergency Web Update**
```bash
# Update download URLs to previous working version
# Edit src/pages/download/index.tsx and src/components/ui/desktop-download.tsx
# Deploy immediately
git add -A
git commit -m "Emergency: Revert to working download links"
git push origin main
```

---

## **🎊 Success!**

Following this guide ensures:
- ✅ Professional, signed, and notarized releases
- ✅ Seamless auto-updates for existing users  
- ✅ Cross-platform compatibility
- ✅ Proper version management
- ✅ Reliable deployment pipeline

**Your TimeFlow releases are now enterprise-ready!** 🚀 