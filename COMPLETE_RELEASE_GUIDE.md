# 🚀 Complete TimeFlow Release Guide

This guide provides everything you need to know about releasing TimeFlow with proper signing, notarization, and auto-update functionality.

## 📋 Prerequisites

### Required Credentials
- **Apple ID**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Apple Team ID**: `6GW49LK9V9`
- **GitHub Token**: `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`
- **Certificate**: Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)

### Required Tools
```bash
# Install GitHub CLI
brew install gh

# Install Xcode command line tools (for signing/notarization)
xcode-select --install

# Ensure Node.js and npm are installed
node --version
npm --version
```

### Certificate Setup
1. Ensure your Developer ID Application certificate is installed in Keychain Access
2. Verify it's available for code signing:
```bash
security find-identity -v -p codesigning
```

## 🎯 Quick Release (Automated)

For a complete automated release, simply run:

```bash
./scripts/complete-release-pipeline.sh
```

This single command will:
- ✅ Bump version number
- ✅ Update all download URLs
- ✅ Build web application
- ✅ Build signed & notarized DMG files
- ✅ Generate auto-update configuration
- ✅ Create GitHub release
- ✅ Commit and push changes
- ✅ Deploy to production

## 📝 Manual Step-by-Step Process

If you need to run steps individually:

### Step 1: Bump Version
```bash
# Current version will be automatically incremented
OLD_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
echo "Current version: $OLD_VERSION"

# Update package.json
npm version patch --no-git-tag-version

# Update desktop-agent package.json manually or with sed
```

### Step 2: Update Download URLs
Update version numbers in these files:
- `src/pages/download/index.tsx` (line ~22: `const version = "v1.0.XX"`)
- `src/components/ui/desktop-download.tsx` (line ~86: `const currentVersion = "1.0.XX"`)

### Step 3: Build Applications
```bash
# Build web application
npm run build

# Build desktop application (from root directory)
cd desktop-agent
npm install
npx electron-builder --mac --publish=never
cd ..
```

### Step 4: Generate Release Files
```bash
NEW_VERSION="1.0.49" # Use your new version

# Copy and rename DMG files
cp "desktop-agent/dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg" "TimeFlow-v${NEW_VERSION}-ARM64.dmg"
cp "desktop-agent/dist/Ebdaa Work Time-${NEW_VERSION}.dmg" "TimeFlow-v${NEW_VERSION}-Intel.dmg"

# Generate SHA512 hashes and file sizes
ARM64_SIZE=$(stat -f%z "TimeFlow-v${NEW_VERSION}-ARM64.dmg")
INTEL_SIZE=$(stat -f%z "TimeFlow-v${NEW_VERSION}-Intel.dmg")
ARM64_SHA512=$(shasum -a 512 "TimeFlow-v${NEW_VERSION}-ARM64.dmg" | cut -d' ' -f1 | xxd -r -p | base64)
INTEL_SHA512=$(shasum -a 512 "TimeFlow-v${NEW_VERSION}-Intel.dmg" | cut -d' ' -f1 | xxd -r -p | base64)
```

### Step 5: Update Auto-Update Configuration
Create `latest-mac.yml`:
```yaml
version: 1.0.49
files:
  - url: TimeFlow-v1.0.49-ARM64.dmg
    sha512: [ARM64_SHA512_HASH]
    size: [ARM64_FILE_SIZE]
  - url: TimeFlow-v1.0.49-Intel.dmg
    sha512: [INTEL_SHA512_HASH]
    size: [INTEL_FILE_SIZE]
path: TimeFlow-v1.0.49-Intel.dmg
sha512: [INTEL_SHA512_HASH]
releaseDate: '2025-01-18T12:00:00.000Z'
```

### Step 6: Create GitHub Release
```bash
gh release create "v1.0.49" \
  "TimeFlow-v1.0.49-ARM64.dmg" \
  "TimeFlow-v1.0.49-Intel.dmg" \
  latest-mac.yml \
  --title "TimeFlow v1.0.49 - Enhanced Performance & Security" \
  --notes "Release notes here" \
  --latest
```

### Step 7: Commit and Deploy
```bash
git add -A
git commit -m "🚀 Release v1.0.49"
git push origin main
```

## 🛠️ Helper Scripts

### Notarize Individual DMG
```bash
./scripts/notarize-dmg.sh "path/to/your.dmg"
```

### Verify Release
```bash
# Verify current version
./scripts/verify-release.sh

# Verify specific version
./scripts/verify-release.sh 1.0.49
```

## 🔍 Verification Checklist

After each release, verify:

### ✅ GitHub Release
- [ ] Release exists: `https://github.com/mafatah/time-flow-admin/releases/tag/v1.0.XX`
- [ ] DMG files are attached and downloadable
- [ ] `latest-mac.yml` is attached
- [ ] Release is marked as "Latest"

### ✅ Auto-Update
- [ ] Config accessible: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
- [ ] Version number matches in config file
- [ ] SHA512 hashes are correct
- [ ] File sizes match actual files

### ✅ Web Application
- [ ] Download page shows new version: `https://time-flow-admin.vercel.app/download`
- [ ] All download links work
- [ ] Version numbers are consistent

### ✅ Desktop Application
- [ ] DMG files open without security warnings
- [ ] Installation completes successfully
- [ ] App launches and functions correctly
- [ ] Auto-updater detects new version (test with older version)

### ✅ Code Signing
```bash
# Verify signatures
codesign -v "TimeFlow-v1.0.XX-ARM64.dmg"
codesign -v "TimeFlow-v1.0.XX-Intel.dmg"

# Verify Gatekeeper approval
spctl --assess --type open --context context:primary-signature "TimeFlow-v1.0.XX-ARM64.dmg"
spctl --assess --type open --context context:primary-signature "TimeFlow-v1.0.XX-Intel.dmg"
```

## 🚨 Troubleshooting

### Signing Issues
```bash
# Check available identities
security find-identity -v -p codesigning

# If certificate not found, ensure it's installed in Keychain Access
# Import .p12 file or install via Xcode
```

### Notarization Issues
```bash
# Check notarization history
xcrun notarytool history --apple-id alshqawe66@gmail.com --password icmi-tdzi-ydvi-lszi --team-id 6GW49LK9V9

# Get detailed info about specific submission
xcrun notarytool info SUBMISSION_ID --apple-id alshqawe66@gmail.com --password icmi-tdzi-ydvi-lszi --team-id 6GW49LK9V9
```

### Auto-Update Issues
```bash
# Test auto-update URL manually
curl -L "https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml"

# Verify SHA512 hashes match
shasum -a 512 "TimeFlow-v1.0.XX-ARM64.dmg" | cut -d' ' -f1 | xxd -r -p | base64
```

### GitHub Release Issues
```bash
# List releases
gh release list

# Delete release if needed
gh release delete v1.0.XX

# Upload additional assets
gh release upload v1.0.XX file.dmg --clobber
```

## 📊 File Size Guidelines

Typical file sizes for TimeFlow releases:
- **ARM64 DMG**: ~115 MB
- **Intel DMG**: ~122 MB
- **Windows EXE**: ~84 MB (when available)
- **Linux AppImage**: ~120 MB (when available)

If file sizes are significantly different, investigate build issues.

## 🔄 Auto-Update Architecture

The auto-update system works as follows:

1. **Desktop App**: Checks `latest-mac.yml` from GitHub releases
2. **Configuration**: Contains version, file URLs, and SHA512 hashes
3. **Download**: App downloads DMG if newer version available
4. **Verification**: SHA512 hash verification before installation
5. **Installation**: User prompted to install update

### Update Flow
```
Desktop App → GitHub Release → latest-mac.yml → Compare Version → Download DMG → Verify Hash → Install
```

## 🌐 Deployment Architecture

```
Code Changes → Build → Sign/Notarize → GitHub Release → Vercel Deploy
     ↓              ↓         ↓             ↓             ↓
  Git Commit   Web + DMG   Security     Auto-Update   Live Website
```

## 📞 Support Information

### Credentials Location
- **Keychain**: Developer certificate
- **Environment**: Apple credentials (set in scripts)
- **GitHub**: Personal access token for releases

### Important URLs
- **Releases**: `https://github.com/mafatah/time-flow-admin/releases`
- **Website**: `https://time-flow-admin.vercel.app`
- **Downloads**: `https://time-flow-admin.vercel.app/download`
- **Auto-Update**: `https://github.com/mafatah/time-flow-admin/releases/download/v{VERSION}/latest-mac.yml`

### Emergency Procedures
If a release is broken:
1. Delete the GitHub release: `gh release delete vX.X.XX`
2. Revert version changes in code
3. Create hotfix release with proper version increment
4. Test thoroughly before re-releasing

---

## 🎉 Success Criteria

A successful release should have:
- ✅ All files signed and notarized
- ✅ Auto-update working for existing users
- ✅ Download links functional on website
- ✅ Version consistency across all files
- ✅ No security warnings during installation
- ✅ Previous app versions can update automatically

**Remember**: Always test the complete update flow before announcing a release! 