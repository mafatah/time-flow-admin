# 🚀 Ebdaa Work Time - Deployment Guide

This guide walks you through the complete process of building, signing, notarizing, and deploying Ebdaa Work Time for both macOS and Windows.

## 📋 Prerequisites

### Required Tools
- **Node.js** (v18 or later)
- **npm** or **yarn** 
- **Xcode Command Line Tools** (macOS)
- **GitHub CLI** (`gh`)
- **Homebrew** (macOS - for installing GitHub CLI)

### Apple Developer Account
- **Apple ID**: alshqawe66@gmail.com
- **Team ID**: 6GW49LK9V9
- **Certificate Signing Request**: CertificateSigningRequest.certSigningRequest (on Desktop)

## 🔐 Step 1: Setup Code Signing

### 1.1 Run the Setup Script
```bash
npm run setup:signing
```

This script will:
- Check for your CSR file on Desktop
- Guide you to create an App-Specific Password
- Set up notarization credentials in Keychain
- Provide instructions for downloading certificates

### 1.2 Download Certificates from Apple Developer Portal

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Sign in with: `alshqawe66@gmail.com`
3. Create **two certificates** using your CSR file:

#### Developer ID Application Certificate
- Click "+" to create new certificate
- Select "Developer ID Application"
- Upload: `~/Desktop/CertificateSigningRequest.certSigningRequest`
- Download as: `certificates/developer_id_application.cer`

#### Developer ID Installer Certificate  
- Click "+" to create new certificate
- Select "Developer ID Installer"
- Upload: `~/Desktop/CertificateSigningRequest.certSigningRequest`
- Download as: `certificates/developer_id_installer.cer`

### 1.3 Install Downloaded Certificates
```bash
npm run install:certificates
```

This will install both certificates in your macOS Keychain.

## 🏗️ Step 2: Build & Test

### 2.1 Test Local Build
```bash
# Build and run locally
npm run start:desktop
```

### 2.2 Test Signed Build
```bash
# Create signed packages (without publishing)
npm run build:signed
```

This creates signed DMG and EXE files in the `dist/` directory.

## 🚀 Step 3: Deploy to Production

### 3.1 Full Deployment Pipeline
```bash
npm run deploy
```

This comprehensive script will:

1. **Build Applications**
   - Build web app for production
   - Build Electron desktop app
   - Create platform-specific packages

2. **Code Signing & Notarization**
   - Sign macOS DMG files with Developer ID
   - Submit to Apple for notarization
   - Wait for notarization approval
   - Staple notarization tickets to DMGs
   - Sign Windows EXE (if certificate available)

3. **Create GitHub Release**
   - Generate release notes
   - Create draft release on GitHub
   - Upload all signed files
   - Publish the release

4. **Update Download Links**
   - Update web app download page
   - Update README and version files
   - Update auto-updater configuration

### 3.2 Manual Steps (if needed)

#### GitHub Authentication
If not already authenticated:
```bash
gh auth login
```

#### Update Version
```bash
# Update version in package.json first
npm version patch  # or minor/major
git push && git push --tags
```

## 📦 Build Outputs

After successful deployment, you'll have:

### GitHub Release Assets
- `Ebdaa-Work-Time-1.0.17-arm64.dmg` (macOS Apple Silicon)
- `Ebdaa-Work-Time-1.0.17.dmg` (macOS Intel)
- `Ebdaa-Work-Time-Setup-1.0.17.exe` (Windows)
- `latest-mac.yml` (macOS auto-updater config)
- `latest.yml` (Windows auto-updater config)

### Local Build Directory
```
releases/v1.0.17/
├── Ebdaa-Work-Time-1.0.17-arm64.dmg
├── Ebdaa-Work-Time-1.0.17.dmg
├── Ebdaa-Work-Time-Setup-1.0.17.exe
├── latest-mac.yml
├── latest.yml
└── release-notes.md
```

## 🔄 Auto-Update System

The app uses **electron-updater** with GitHub releases:

- **Update Check**: Apps automatically check GitHub for new releases
- **Download**: Updates download in background
- **Installation**: Users are notified when update is ready
- **Configuration**: `latest-mac.yml` and `latest.yml` control the process

## 🌐 Web Download Page

The deployment script automatically updates:
- `src/pages/download/index.tsx` - Main download page
- `public/version.json` - Version information API
- `README.md` - Documentation links

Access at: `https://worktime.ebdaadi.com/download`

## 🔧 Troubleshooting

### Code Signing Issues
```bash
# Check installed certificates
security find-identity -v -p codesigning

# Reset and reinstall certificates
rm -rf certificates/
npm run setup:signing
```

### Notarization Problems
```bash
# Check notarization status
xcrun notarytool history --keychain-profile "ebdaa-notarization"

# Test notarization credentials
xcrun notarytool store-credentials "test" --apple-id "alshqawe66@gmail.com" --team-id "6GW49LK9V9"
```

### GitHub CLI Issues
```bash
# Check authentication
gh auth status

# Re-authenticate
gh auth login --web
```

## 📋 Deployment Checklist

- [ ] Code signing certificates installed
- [ ] Notarization credentials configured
- [ ] GitHub CLI authenticated
- [ ] Version updated in package.json
- [ ] Code changes committed and pushed
- [ ] Tests passing locally
- [ ] Run deployment script: `npm run deploy`
- [ ] Verify GitHub release created
- [ ] Test download links work
- [ ] Test auto-update on existing installation
- [ ] Notify users of new release

## 🔗 Useful Links

- [Apple Developer Portal](https://developer.apple.com/account/)
- [App-Specific Passwords](https://appleid.apple.com/account/manage)
- [GitHub Releases](https://github.com/your-repo/releases)
- [electron-updater Documentation](https://www.electron.build/auto-update)

## 📞 Support

If you encounter issues during deployment:

1. Check the console logs for specific error messages
2. Verify all certificates are properly installed
3. Ensure Apple Developer account is in good standing
4. Contact Apple Developer Support for notarization issues
5. Check GitHub repository permissions for release creation

---

**Built with ❤️ by Ebdaa Digital Technology** 