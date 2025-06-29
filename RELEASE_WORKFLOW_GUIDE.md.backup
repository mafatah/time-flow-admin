# 🚀 TimeFlow Release Workflow Guide

Complete guide for releasing TimeFlow with signing, notarization, and cross-platform support.

## 📋 Prerequisites

### Required Tools
- **Node.js** 18+ with npm
- **Electron Builder** (installed via npm)
- **GitHub CLI** (`brew install gh` on macOS)
- **Xcode Command Line Tools** (macOS)

### Required Credentials
- **Apple Developer Account**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Team ID**: `6GW49LK9V9`
- **GitHub Token**: `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`
- **Repository**: `mafatah/time-flow-admin`

### Apple Developer Certificate
Ensure the certificate from `CertificateSigningRequest.certSigningRequest` is installed in Keychain:
```bash
# Verify certificate installation
security find-identity -v -p codesigning
# Should show: "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
```

---

## 🎯 Quick Start

Use the interactive menu for easy releases:

```bash
./quick-release.sh
```

This will show you all available options with descriptions.

---

## 📦 Release Options

### 1. 🍎 Ultimate Release (Recommended)
**Script**: `./scripts/ultimate-release.sh`
**Time**: 10-15 minutes
**Output**: All platforms + GitHub release

**What it does:**
- Builds macOS (Intel + ARM64) with signing & notarization
- Builds Windows EXE with signing
- Builds Linux AppImage
- Creates GitHub release with all files
- Updates auto-update configurations
- Deploys web interface

**When to use**: For major releases and production deployments

### 2. 🍎 Complete Release (macOS Only)
**Script**: `./scripts/complete-release.sh`
**Time**: 5-10 minutes
**Output**: macOS builds + GitHub release

**What it does:**
- Builds macOS (Intel + ARM64) with signing & notarization
- Creates GitHub release
- Updates macOS auto-update configuration
- Faster than ultimate release

**When to use**: For macOS-specific updates or faster iteration

### 3. 🪟🐧 Cross-Platform Build
**Script**: `./scripts/build-cross-platform.sh`
**Time**: 2-5 minutes
**Output**: Windows & Linux builds only

**What it does:**
- Builds Windows EXE
- Builds Linux AppImage
- No GitHub release (manual upload needed)

**When to use**: For testing Windows/Linux builds or when macOS signing is unavailable

---

## 🔧 Manual Release Process

### Step 1: Version Management
```bash
# Increment version
npm version patch --no-git-tag-version

# Check new version
grep '"version"' package.json
```

### Step 2: Update Download URLs
Update version strings in these files:
- `src/pages/download/index.tsx` (line ~23)
- `src/components/ui/desktop-download.tsx` (line ~95)

### Step 3: Set Environment Variables
```bash
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"
export GITHUB_TOKEN="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"
```

### Step 4: Build Applications
```bash
# Clean previous builds
rm -rf dist build node_modules/.cache

# Install dependencies
npm ci

# Build web application
npm run build

# Prepare entitlements
mkdir -p build
cp entitlements.mac.plist build/

# Build desktop applications
npx electron-builder --mac --win --linux --publish=never
```

### Step 5: Generate File Information
```bash
# Calculate hashes and sizes
shasum -a 512 dist/*.dmg dist/*.exe dist/*.AppImage
ls -la dist/
```

### Step 6: Update Auto-Update Files
Update `latest-mac.yml` and `latest.yml` with new version, file sizes, and SHA512 hashes.

### Step 7: Create GitHub Release
```bash
# Create release with all files
gh release create v1.0.XX \
  "dist/TimeFlow-v1.0.XX-Intel.dmg" \
  "dist/TimeFlow-v1.0.XX-ARM64.dmg" \
  "dist/TimeFlow-v1.0.XX-Setup.exe" \
  "dist/TimeFlow-v1.0.XX-Linux.AppImage" \
  "latest-mac.yml" \
  "latest.yml" \
  --title "TimeFlow v1.0.XX" \
  --generate-notes \
  --latest
```

### Step 8: Deploy Web Changes
```bash
git add -A
git commit -m "🚀 Release v1.0.XX"
git push origin main
```

---

## 🔐 Signing & Notarization

### macOS Code Signing
- Uses `Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)`
- Automatically signs during electron-builder process
- Requires certificate in Keychain

### macOS Notarization
- Automatic via electron-builder
- Uses Apple ID and app-specific password
- Takes 5-10 minutes per build
- Required for Gatekeeper approval

### Windows Code Signing
- Currently set up for future implementation
- Will use Windows certificate when available

---

## 📱 Auto-Update System

### How It Works
1. App checks GitHub releases for new versions
2. Downloads `latest-mac.yml` or `latest.yml`
3. Compares current version with available version
4. Shows update notification if newer version exists
5. Downloads and installs update when user approves

### Configuration Files

**latest-mac.yml** (macOS):
```yaml
version: 1.0.XX
files:
  - url: TimeFlow-v1.0.XX-Intel.dmg
    sha512: [hash]
    size: [bytes]
  - url: TimeFlow-v1.0.XX-ARM64.dmg
    sha512: [hash]
    size: [bytes]
path: TimeFlow-v1.0.XX-Intel.dmg
sha512: [hash]
releaseDate: '2025-01-17T00:00:00.000Z'
```

**latest.yml** (Windows):
```yaml
version: 1.0.XX
files:
  - url: TimeFlow-v1.0.XX-Setup.exe
    sha512: [hash]
    size: [bytes]
path: TimeFlow-v1.0.XX-Setup.exe
sha512: [hash]
releaseDate: '2025-01-17T00:00:00.000Z'
```

### Update URLs
- macOS: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
- Windows: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest.yml`

---

## 🧪 Testing & Verification

### Pre-Release Testing
1. **Build verification**: Ensure all expected files are created
2. **Signature verification**: Check code signatures are valid
3. **Installation testing**: Test fresh installations on clean machines

### Post-Release Testing
1. **Download verification**: Test download links work correctly
2. **Auto-update testing**: Verify existing users see update notifications
3. **Installation verification**: Ensure no security warnings on signed builds

### Testing Commands
```bash
# Verify macOS code signature
codesign -v --verbose "TimeFlow.app"

# Check notarization status
spctl -a -v "TimeFlow.app"

# Test file integrity
shasum -a 512 -c checksums.txt
```

---

## 🔧 Troubleshooting

### Common Issues

**Code Signing Failed**
```bash
# Check certificates
security find-identity -v -p codesigning

# Install certificate if missing
security import /path/to/certificate.p12 -k ~/Library/Keychains/login.keychain
```

**Notarization Failed**
- Verify Apple ID and app-specific password
- Check Team ID is correct
- Ensure entitlements file exists
- Wait longer (notarization can take 10+ minutes)

**Auto-Update Not Working**
- Verify `latest-mac.yml` is in GitHub release assets
- Check SHA512 hashes match exactly
- Ensure file sizes are correct
- Test update URL accessibility

**DMG Installation Issues**
- Ensure DMG is properly signed and notarized
- Check Gatekeeper settings
- Verify entitlements include necessary permissions

---

## 📊 File Structure

```
TimeFlow Release Files:
├── dist/
│   ├── TimeFlow-v1.0.XX-Intel.dmg       # macOS Intel (signed & notarized)
│   ├── TimeFlow-v1.0.XX-ARM64.dmg       # macOS Apple Silicon (signed & notarized)
│   ├── TimeFlow-v1.0.XX-Setup.exe       # Windows installer
│   └── TimeFlow-v1.0.XX-Linux.AppImage  # Linux portable
├── latest-mac.yml                        # macOS auto-update config
├── latest.yml                            # Windows auto-update config
└── public/downloads/                     # Web-accessible files
    ├── TimeFlow-v1.0.XX-Intel.dmg
    ├── TimeFlow-v1.0.XX-ARM64.dmg
    ├── TimeFlow-v1.0.XX-Setup.exe
    ├── TimeFlow-v1.0.XX-Linux.AppImage
    └── checksums.txt
```

---

## 🌐 Web Deployment

### Automatic Deployment
- Vercel automatically deploys on push to `main` branch
- No manual deployment needed
- Download page updates automatically

### Manual Verification
1. Check download page: https://time-flow-admin.vercel.app/download
2. Verify version numbers are updated
3. Test download links work correctly
4. Confirm file sizes and checksums match

---

## 📈 Release Checklist

### Pre-Release
- [ ] Version number updated in `package.json`
- [ ] Download URLs updated in both web locations
- [ ] Apple Developer Certificate installed
- [ ] GitHub CLI authenticated
- [ ] All credentials set as environment variables

### During Release
- [ ] Build process completes without errors
- [ ] All expected files are generated
- [ ] File sizes and hashes calculated correctly
- [ ] Auto-update configurations updated
- [ ] GitHub release created successfully

### Post-Release
- [ ] Download links work on web interface
- [ ] Auto-update notifications appear for existing users
- [ ] Fresh installations work without security warnings
- [ ] All platforms install and run correctly
- [ ] GitHub release contains all necessary files

---

## 🎯 Best Practices

### Version Management
- Use semantic versioning (major.minor.patch)
- Increment patch for bug fixes and small features
- Increment minor for new features
- Increment major for breaking changes

### Release Timing
- Release during business hours for immediate issue response
- Avoid releasing on Fridays or before holidays
- Ensure team availability for support

### Communication
- Document all changes in release notes
- Announce updates to users via appropriate channels
- Monitor for issues post-release

### Security
- Always verify signatures before releasing
- Test on clean machines to catch security warnings
- Keep signing certificates secure and backed up

---

## 🔗 Useful Links

- [GitHub Repository](https://github.com/mafatah/time-flow-admin)
- [Latest Release](https://github.com/mafatah/time-flow-admin/releases/latest)
- [Download Page](https://time-flow-admin.vercel.app/download)
- [Apple Developer Console](https://developer.apple.com)
- [Electron Builder Documentation](https://www.electron.build)

---

## 📞 Support

For release issues or questions:
1. Check troubleshooting section above
2. Review GitHub Actions logs (if using CI/CD)
3. Verify all credentials and certificates
4. Test on clean development machine
5. Consult Electron Builder documentation for platform-specific issues

---

*Last updated: January 17, 2025* 