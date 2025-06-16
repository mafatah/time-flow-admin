# 🚀 TimeFlow Automated Deployment Guide

## Overview

This guide covers the complete automated signing, notarization, and deployment process for TimeFlow desktop applications.

## 🔐 Prerequisites

### Apple Developer Setup
- **Apple ID**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Team ID**: `6GW49LK9V9`
- **Certificate**: `CertificateSigningRequest.certSigningRequest` (on Desktop)

### GitHub Setup
```bash
export GITHUB_TOKEN="your_github_token_here"
```

### Required Tools
- macOS (for notarization)
- Node.js & npm
- Xcode Command Line Tools
- electron-builder
- Git

## 🎯 Release Commands

### Full Automated Release
```bash
npm run release
# or
./scripts/automated-release.sh
```

**This will:**
1. ✅ Check prerequisites
2. 📦 Auto-increment version (patch)
3. 🔨 Build web and electron apps
4. 🔐 Code sign applications
5. 📋 Notarize DMG files
6. 🌐 Create GitHub release
7. 📤 Upload DMG and EXE files
8. 🔗 Update auto-updater links
9. 📝 Commit and push changes

### Quick Test Release
```bash
npm run release:quick
# or
./scripts/quick-release.sh
```

**This will:**
1. 📦 Increment version
2. 🔨 Build applications
3. 🔐 Sign files (no notarization)
4. 📁 Copy to root directory

## 📋 Step-by-Step Process

### 1. Pre-Release Checklist
- [ ] Ensure all code changes are committed
- [ ] Test desktop agent functionality
- [ ] Verify web admin features
- [ ] Check auto-update system
- [ ] Confirm certificate is in Keychain

### 2. Environment Setup
```bash
# Set GitHub token for releases
export GITHUB_TOKEN="ghp_your_token_here"

# Verify Apple Developer certificate
security find-identity -v -p codesigning

# Ensure notarization tools are available
xcrun notarytool --help
```

### 3. Run Release
```bash
# For production release
npm run release

# Monitor the process - it will:
# - Build and sign applications
# - Notarize DMG (15-30 minutes)
# - Upload to GitHub releases
# - Update auto-updater files
```

## 📦 Version Management

### Automatic Versioning
- **Patch**: Increments automatically (1.0.24 → 1.0.25)
- **Minor**: Manual edit in package.json (1.0.25 → 1.1.0)
- **Major**: Manual edit in package.json (1.1.0 → 2.0.0)

### Manual Version Override
```bash
# Set specific version
npm version 1.1.0 --no-git-tag-version
npm run release
```

## 🔧 Build Configuration

### Electron Builder Settings
```json
{
  "mac": {
    "target": ["dmg"],
    "category": "public.app-category.productivity",
    "identity": "Ebdaa Digital Technology (6GW49LK9V9)",
    "hardenedRuntime": true,
    "notarize": {
      "teamId": "6GW49LK9V9"
    }
  },
  "win": {
    "target": "nsis",
    "publisherName": "Ebdaa Digital Technology"
  }
}
```

### Code Signing Identity
```
Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)
```

## 📱 Auto-Update System

### Update Files Generated
- `public/latest-mac.yml` - macOS update manifest
- `public/latest.yml` - Windows update manifest

### Update URLs
- **macOS**: `https://time-flow-admin.vercel.app/latest-mac.yml`
- **Windows**: `https://time-flow-admin.vercel.app/latest.yml`

### User Experience
1. App checks for updates on startup
2. Notification shown if update available
3. User can download and install
4. App restarts with new version

## 🌐 GitHub Releases

### Release Assets
- `TimeFlow-vX.X.X-ARM64.dmg` - Apple Silicon DMG
- `TimeFlow-vX.X.X-Intel.dmg` - Intel DMG  
- `TimeFlow-vX.X.X-Setup.exe` - Windows installer

### Release Notes Template
```markdown
## TimeFlow vX.X.X

### 🎉 New Features & Improvements
- Enhanced desktop agent functionality
- Improved error handling
- Better user experience

### 🔧 Technical Improvements
- Performance optimizations
- Bug fixes
- Security enhancements

### 📱 Download
- **macOS**: TimeFlow-vX.X.X-ARM64.dmg (Apple Silicon) or TimeFlow-vX.X.X-Intel.dmg (Intel)
- **Windows**: TimeFlow-vX.X.X-Setup.exe
```

## 🔍 Troubleshooting

### Common Issues

#### Notarization Fails
```bash
# Check notarization status
xcrun notarytool history --apple-id alshqawe66@gmail.com --password icmi-tdzi-ydvi-lszi --team-id 6GW49LK9V9

# Get detailed logs
xcrun notarytool log <submission-id> --apple-id alshqawe66@gmail.com --password icmi-tdzi-ydvi-lszi --team-id 6GW49LK9V9
```

#### Code Signing Issues
```bash
# List available identities
security find-identity -v -p codesigning

# Check certificate validity
security find-certificate -c "Ebdaa Digital Technology"
```

#### GitHub Upload Fails
```bash
# Verify token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check repository access
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/mafatah/time-flow-admin
```

## 📈 Monitoring

### Build Logs
- Check terminal output during build
- Monitor notarization progress
- Verify GitHub release creation

### User Analytics
- Monitor download counts from GitHub releases
- Track auto-update adoption rates
- Monitor crash reports and feedback

## 🛡️ Security

### Credential Management
- App-specific password stored securely
- GitHub token with minimal required permissions
- Certificate private key protected in Keychain

### Best Practices
- Regular certificate renewal
- Monitor for compromised credentials
- Keep development environment secure
- Use different certificates for development/production

## 📞 Support

### For Issues Contact:
- **Developer**: Ebdaa Digital Technology
- **Repository**: https://github.com/mafatah/time-flow-admin
- **Documentation**: This guide and README files

### Emergency Procedures
1. Revoke compromised certificates immediately
2. Update GitHub tokens if compromised
3. Notify users of security updates
4. Maintain backup signing certificates 