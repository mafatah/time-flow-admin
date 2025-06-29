# 🚀 TimeFlow v1.0.40 Release Instructions

## Quick Release (Automated)

```bash
# Run the complete automated release script
./scripts/complete-release-v1.0.40.sh
```

## Manual Step-by-Step Process

### Prerequisites

1. **Install GitHub CLI**: `brew install gh`
2. **Apple Developer Certificate**: Ensure "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)" is in Keychain
3. **Environment Setup**:
   ```bash
   export APPLE_ID="alshqawe66@gmail.com"
   export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi" 
   export APPLE_TEAM_ID="6GW49LK9V9"
   export GITHUB_TOKEN="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"
   ```

### Step 1: Version Update ✅ COMPLETED
- [x] Updated `package.json` version to 1.0.40
- [x] Updated `src/pages/download/index.tsx` version to v1.0.40
- [x] Updated `src/components/ui/desktop-download.tsx` version to 1.0.40

### Step 2: Code Signing Configuration ✅ COMPLETED
- [x] Updated `package.json` electron-builder config with proper identity
- [x] Enabled notarization with Team ID 6GW49LK9V9
- [x] Created proper `build/entitlements.mac.plist`

### Step 3: Build Process

```bash
# Clean previous builds
rm -rf dist

# Build web application
npm run build

# Build desktop with signing & notarization
npx electron-builder --mac --publish=never
```

### Step 4: Update Auto-Update Configuration

Get file information:
```bash
# Intel DMG
ls -la "dist/Ebdaa Work Time-1.0.40.dmg"
shasum -a 512 "dist/Ebdaa Work Time-1.0.40.dmg"

# ARM64 DMG  
ls -la "dist/Ebdaa Work Time-1.0.40-arm64.dmg"
shasum -a 512 "dist/Ebdaa Work Time-1.0.40-arm64.dmg"
```

Update `latest-mac.yml` with correct sizes and SHA512 hashes.

### Step 5: GitHub Release

```bash
# Create release with assets
gh release create v1.0.40 \
  "dist/Ebdaa Work Time-1.0.40-arm64.dmg#TimeFlow-v1.0.40-ARM64.dmg" \
  "dist/Ebdaa Work Time-1.0.40.dmg#TimeFlow-v1.0.40-Intel.dmg" \
  latest-mac.yml \
  latest.yml \
  --title "TimeFlow v1.0.40 - Signed & Notarized Release" \
  --generate-notes
```

### Step 6: Deploy Web Changes

```bash
git add -A
git commit -m "🚀 Release v1.0.40 - Signed & Notarized"
git push origin main
```

## Verification Checklist

### GitHub Release
- [ ] Release created: https://github.com/mafatah/time-flow-admin/releases/tag/v1.0.40
- [ ] ARM64 DMG uploaded and accessible
- [ ] Intel DMG uploaded and accessible
- [ ] `latest-mac.yml` uploaded to release assets
- [ ] Auto-update config accessible: https://github.com/mafatah/time-flow-admin/releases/download/v1.0.40/latest-mac.yml

### Code Signing Verification
- [ ] DMG files are properly signed
- [ ] No macOS security warnings when opening DMG
- [ ] App runs without "Unidentified Developer" warnings
- [ ] Notarization successful (check with `spctl -a -v "Ebdaa Work Time.app"`)

### Web Application
- [ ] Download page shows v1.0.40: https://timeflow-admin.vercel.app/download
- [ ] Login page download button links to v1.0.40
- [ ] All download links work correctly

### Auto-Update Testing
- [ ] Existing app shows "Update Available" notification
- [ ] Update downloads and installs successfully
- [ ] New version launches correctly
- [ ] User data preserved after update

## Troubleshooting

### Signing Issues
```bash
# Check available identities
security find-identity -v -p codesigning

# Verify certificate
security find-certificate -c "Developer ID Application: Ebdaa Digital Technology"
```

### Notarization Issues
- Verify Apple ID and app-specific password
- Check Team ID matches Apple Developer account
- Ensure proper entitlements file

### Auto-Update Issues
- Verify SHA512 hashes match exactly
- Check file sizes are correct
- Ensure `latest-mac.yml` is accessible from GitHub release

## File Locations

### Generated Files
- `dist/Ebdaa Work Time-1.0.40.dmg` - Intel macOS installer
- `dist/Ebdaa Work Time-1.0.40-arm64.dmg` - ARM64 macOS installer
- `latest-mac.yml` - Auto-update configuration
- `public/downloads/TimeFlow-v1.0.40-*.dmg` - Web download copies

### Updated Files
- `package.json` - Version and signing configuration
- `src/pages/download/index.tsx` - Download page version
- `src/components/ui/desktop-download.tsx` - Desktop download component
- `build/entitlements.mac.plist` - macOS entitlements

## Release Notes Template

```markdown
🚀 **TimeFlow v1.0.40 - Signed & Notarized Release**

## ✨ What's New in v1.0.40
- ✅ Fully signed and notarized macOS applications
- 🔐 Enhanced security with proper code signing  
- 🚀 Improved auto-update mechanism
- 🛡️ macOS Gatekeeper compatibility

## 📱 Download Options
- **macOS Apple Silicon (M1/M2/M3)**: TimeFlow-v1.0.40-ARM64.dmg
- **macOS Intel**: TimeFlow-v1.0.40-Intel.dmg

## 🔧 Installation
1. Download the appropriate DMG for your Mac
2. Open the DMG file
3. Drag **Ebdaa Work Time** to Applications
4. Launch from Applications folder

## ⚡ Auto-Update
Existing users will be automatically notified of this update.
```

## Post-Release Tasks

1. **Monitor Release**
   - Check GitHub release analytics
   - Monitor for user issues/feedback
   - Verify auto-update notifications

2. **Documentation Updates**
   - Update README with new version info
   - Update deployment documentation
   - Archive old release files if needed

3. **Future Releases**
   - Windows code signing setup
   - Linux AppImage signing
   - Automated CI/CD pipeline

## Support Information

- **GitHub Repository**: https://github.com/mafatah/time-flow-admin
- **Team ID**: 6GW49LK9V9
- **Apple Developer Account**: alshqawe66@gmail.com
- **Release URL**: https://github.com/mafatah/time-flow-admin/releases/tag/v1.0.40 