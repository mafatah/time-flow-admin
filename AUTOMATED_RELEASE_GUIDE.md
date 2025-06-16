# TimeFlow Automated Release Pipeline

This guide explains how to use the automated release pipeline for TimeFlow desktop applications.

## 🚀 Quick Start

### 1. Setup Environment

First, run the environment setup script to check all prerequisites:

```bash
./scripts/setup-release-environment.sh
```

This will check:
- ✅ Apple App-Specific Password
- ✅ GitHub CLI authentication
- ✅ Code signing certificates
- ✅ Required build tools

### 2. Generate Apple App-Specific Password

If you don't have an app-specific password yet:

1. Go to [Apple ID Account Management](https://appleid.apple.com/account/manage)
2. Sign in with: `alshqawe66@gmail.com`
3. Navigate to "Security" section
4. Under "App-Specific Passwords", click "Generate Password"
5. Enter "TimeFlow Notarization" as the label
6. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)

Set the password as an environment variable:

```bash
export APPLE_APP_SPECIFIC_PASSWORD='your-generated-password'
```

### 3. Run Complete Release Pipeline

To execute the full automated release pipeline:

```bash
./scripts/automated-release-pipeline.sh
```

This will:
1. 🔐 Setup notarization credentials
2. 🔧 Build applications for all platforms
3. 🔏 Sign macOS DMG files
4. 🔏 Prepare Windows EXE files (unsigned)
5. 📋 Notarize macOS applications with Apple
6. 📦 Create GitHub release with all assets
7. 🔄 Update auto-update configuration files
8. 🔗 Update web application download links
9. 📋 Generate release summary

## 🎯 Individual Commands

You can also run individual steps:

```bash
# Setup notarization only
./scripts/automated-release-pipeline.sh setup-only

# Build applications only
./scripts/automated-release-pipeline.sh build-only

# Sign applications only
./scripts/automated-release-pipeline.sh sign-only

# Notarize applications only
./scripts/automated-release-pipeline.sh notarize-only

# Create GitHub release only
./scripts/automated-release-pipeline.sh release-only

# Update auto-update configs only
./scripts/automated-release-pipeline.sh auto-update-only

# Update web links only
./scripts/automated-release-pipeline.sh web-only
```

## 📋 Configuration

### Version Management

Update the version in these files before running the pipeline:

- `package.json` - Main application version
- `scripts/automated-release-pipeline.sh` - Pipeline version variable
- `scripts/update-auto-update-config.sh` - Auto-update version

### Signing Configuration

The pipeline uses these signing details:
- **Certificate**: "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
- **Team ID**: 6GW49LK9V9
- **Apple ID**: alshqawe66@gmail.com

### GitHub Configuration

- **Repository**: mafatah/time-flow-admin
- **Release Format**: v{VERSION} (e.g., v1.0.21)

## 🔄 Auto-Update System

The pipeline automatically creates and updates:

### Configuration Files
- `latest-mac.yml` - macOS auto-update configuration
- `latest.yml` - Windows/Linux auto-update configuration
- `public/app-update.yml` - Electron auto-updater configuration

### Update Endpoints
- `public/api/updates/darwin.json` - macOS update endpoint
- `public/api/updates/win32.json` - Windows update endpoint

### File Structure
```
public/
├── latest.yml                    # Windows/Linux auto-update
├── latest-mac.yml               # macOS auto-update
├── app-update.yml               # Electron configuration
└── api/
    └── updates/
        ├── darwin.json          # macOS endpoint
        └── win32.json           # Windows endpoint
```

## 🌐 Web Integration

The pipeline automatically updates download links in:
- `src/pages/download/index.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/features/dashboard/components/QuickActions.tsx`

And deploys the updated web application to Vercel.

## 🔍 Verification

After running the pipeline, verify:

1. **GitHub Release**: Check [releases page](https://github.com/mafatah/time-flow-admin/releases)
2. **Web Application**: Visit [admin dashboard](https://time-flow-admin-o13bwglim-m-afatah-hotmailcoms-projects.vercel.app)
3. **Download Links**: Test download functionality
4. **File Integrity**: Verify DMG and EXE files work correctly

## 🆘 Troubleshooting

### Common Issues

**Notarization Failed**
- Check Apple App-Specific Password
- Verify Team ID and Apple ID
- Ensure certificate is valid

**GitHub Release Failed**
- Check GitHub CLI authentication: `gh auth status`
- Verify repository access permissions
- Confirm release doesn't already exist

**Build Failed**
- Clean and reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all environment variables are set

**Signing Failed**
- Check certificate installation: `security find-identity -v -p codesigning`
- Verify certificate is not expired
- Ensure keychain is unlocked

### Debug Commands

```bash
# Check notarization history
xcrun notarytool history --keychain-profile timeflow-notarization

# Verify code signature
codesign --verify --verbose dist/*.dmg

# Check GitHub authentication
gh auth status

# Test build process
npm run build:all
```

## 📊 Release Metrics

The pipeline generates a release summary with:
- Built file sizes and checksums
- Download URLs for all platforms
- Completion status of all steps
- Next action recommendations

## 🔐 Security Notes

- App-specific passwords are stored securely in system keychain
- Code signing certificates are protected by macOS security
- All builds are verified before release
- Notarization ensures macOS security compliance

## 📝 Version History

- **v1.0.21** - Current automated release pipeline
- **v1.0.20** - Enhanced build process
- **v1.0.19** - Initial release automation

---

**Need Help?** Contact the development team or check the troubleshooting section above. 