# 🚀 **TimeFlow Automated Release Guide**

Complete guide for building, signing, notarizing, and deploying TimeFlow releases with auto-update support.

## **📋 Prerequisites**

### **Required Credentials:**
- **Apple ID**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Team ID**: `6GW49LK9V9`
- **GitHub Token**: `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`
- **Certificate**: `CertificateSigningRequest.certSigningRequest` (on Desktop)
- **Signing Identity**: `Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)`

### **Required Tools:**
- macOS (for signing and notarization)
- Xcode Command Line Tools
- Node.js 18+
- GitHub CLI
- Valid Developer ID certificate in Keychain

---

## **🔧 Quick Start**

### **Option 1: Automated Setup + Release**
```bash
# 1. Setup environment (one-time)
./scripts/setup-release-environment.sh

# 2. Source environment variables
source .env.release

# 3. Run automated release
./scripts/automated-release-pipeline.sh
```

### **Option 2: Manual Release**
```bash
# 1. Set environment variables
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"
export GITHUB_TOKEN="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"

# 2. Update version and build
npm version patch --no-git-tag-version
npm run build
npm run build:electron

# 3. Sign and notarize
npx electron-builder --mac --publish=never

# 4. Create GitHub release
gh release create v1.0.XX dist/*.dmg latest-mac.yml
```

---

## **📦 Complete Release Process**

### **Step 1: Environment Setup**
```bash
# Run the setup script (first time only)
./scripts/setup-release-environment.sh

# This will:
# - Install required tools (GitHub CLI, etc.)
# - Authenticate with GitHub
# - Verify signing certificate
# - Test notarization credentials
# - Create necessary directories
# - Set up environment variables
```

### **Step 2: Run Release Pipeline**
```bash
# Source environment variables
source .env.release

# Run automated release pipeline
./scripts/automated-release-pipeline.sh

# The pipeline will:
# 1. Prompt for version bump type (patch/minor/major/custom)
# 2. Update version in package.json
# 3. Update download URLs in web application
# 4. Build web application
# 5. Clean previous builds
# 6. Build and sign desktop applications
# 7. Generate file hashes and auto-update configs
# 8. Create GitHub release with all assets
# 9. Commit and push changes
# 10. Verify deployment
```

### **Step 3: Verification**
The pipeline automatically verifies:
- ✅ GitHub release created with all files
- ✅ Auto-update config uploaded to release assets
- ✅ Download URLs updated in web application
- ✅ Files properly signed and notarized
- ✅ Web application deployed to Vercel

---

## **🔧 Manual Steps (If Needed)**

### **Update Download URLs**
Two locations must be updated for each release:

**1. Main Download Page:** `src/pages/download/index.tsx`
```typescript
const version = "v1.0.XX"; // Update this line
```

**2. Login Page Download:** `src/components/ui/desktop-download.tsx`
```typescript
const currentVersion = "1.0.XX"; // Update this line
```

### **Build Signed Applications**
```bash
# Set environment variables
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"

# Build with signing and notarization
npx electron-builder --mac --publish=never
```

### **Create Auto-Update Configuration**
Generate `latest-mac.yml`:
```yaml
version: 1.0.XX
files:
  - url: TimeFlow-v1.0.XX-Intel.dmg
    sha512: [INTEL_SHA512_HASH]
    size: [INTEL_FILE_SIZE]
  - url: TimeFlow-v1.0.XX-ARM64.dmg
    sha512: [ARM64_SHA512_HASH]
    size: [ARM64_FILE_SIZE]
path: TimeFlow-v1.0.XX-Intel.dmg
sha512: [INTEL_SHA512_HASH]
releaseDate: '2025-06-18T00:XX:00.000Z'
```

### **Create GitHub Release**
```bash
# Create release with all required files
gh release create v1.0.XX \
  "dist/TimeFlow-v1.0.XX-Intel.dmg" \
  "dist/TimeFlow-v1.0.XX-ARM64.dmg" \
  latest-mac.yml \
  --title "TimeFlow v1.0.XX" \
  --notes "Release description here"
```

---

## **📁 File Structure**

```
time-flow-admin/
├── scripts/
│   ├── automated-release-pipeline.sh    # Main release script
│   ├── setup-release-environment.sh     # Environment setup
│   └── ...
├── build/
│   └── entitlements.mac.plist           # macOS entitlements
├── src/
│   ├── pages/download/index.tsx         # Main download page
│   └── components/ui/desktop-download.tsx # Login download component
├── dist/                                # Built applications
├── public/downloads/                    # Web download files
├── latest-mac.yml                       # Auto-update config (macOS)
├── latest.yml                           # Auto-update config (Windows)
└── .env.release                         # Environment variables
```

---

## **🔍 Troubleshooting**

### **Common Issues**

#### **Auto-Update 404 Error**
```bash
# Fix: Upload latest-mac.yml to GitHub release
gh release upload v1.0.XX latest-mac.yml --clobber
```

#### **Signing Identity Not Found**
```bash
# Check available identities
security find-identity -v -p codesigning

# Verify specific identity
security find-certificate -c "Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
```

#### **Notarization Failed**
```bash
# Check credentials format
echo "Apple ID: alshqawe66@gmail.com"
echo "Password: icmi-tdzi-ydvi-lszi"
echo "Team ID: 6GW49LK9V9"

# Test notarization
xcrun notarytool history --apple-id alshqawe66@gmail.com --password icmi-tdzi-ydvi-lszi --team-id 6GW49LK9V9
```

#### **GitHub Authentication Failed**
```bash
# Re-authenticate with token
echo "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" | gh auth login --with-token

# Check status
gh auth status
```

#### **Web Download Links Not Updated**
Check these files have the correct version:
- `src/pages/download/index.tsx`
- `src/components/ui/desktop-download.tsx`

#### **Certificate Issues**
If you need to install the certificate:
1. Get the .p12 file from Apple Developer Portal
2. Double-click to install in Keychain
3. Or use: `security import certificate.p12 -k ~/Library/Keychains/login.keychain-db`

---

## **🎯 Quick Commands**

### **Development**
```bash
# Test desktop agent
cd desktop-agent && npm run electron

# Build web only
npm run build

# Build electron only
npm run build:electron
```

### **Release Preparation**
```bash
# Check environment
./scripts/setup-release-environment.sh

# Quick release (automated)
source .env.release && ./scripts/automated-release-pipeline.sh

# Manual version bump
npm version patch --no-git-tag-version
```

### **Verification**
```bash
# Check signing certificate
security find-identity -v -p codesigning

# Test GitHub auth
gh auth status

# Verify release
gh release view v1.0.XX

# Check auto-update config
curl -s https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml
```

---

## **🔐 Security Notes**

- All credentials are stored securely in the automated scripts
- App-specific password is used instead of Apple ID password
- GitHub token has minimal required permissions
- Certificates are stored in macOS Keychain
- No credentials are committed to git repository

---

## **🚀 Auto-Update System**

### **How It Works**
1. Desktop app checks for updates on startup
2. Fetches `latest-mac.yml` from GitHub release assets
3. Compares local version with remote version
4. Downloads and installs update if available
5. Verifies SHA512 hash before installation

### **Update Configuration Locations**
- **GitHub Release**: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
- **Local Copy**: `public/downloads/latest-mac.yml` (for backup)

### **Testing Auto-Update**
1. Install an older version of the app
2. Run the app
3. Check for "Update Available" notification
4. Click to download and install update

---

## **📞 Support**

### **Release Issues**
If you encounter issues during release:
1. Check all prerequisites are met
2. Verify credentials are correct
3. Ensure certificates are installed
4. Check GitHub repository permissions

### **Build Issues**
- Run `npm run build:electron` separately to isolate issues
- Check electron-builder configuration in `package.json`
- Verify entitlements file exists: `build/entitlements.mac.plist`

### **Deployment Issues**
- Verify Vercel deployment succeeds after git push
- Check download URLs are updated in both locations
- Ensure GitHub release includes all required files

---

## **✅ Release Checklist**

- [ ] Environment setup completed
- [ ] Signing certificate installed and verified
- [ ] Apple credentials tested
- [ ] GitHub CLI authenticated
- [ ] Version updated in package.json
- [ ] Download URLs updated in web app
- [ ] Applications built and signed
- [ ] Auto-update configs generated
- [ ] GitHub release created with all assets
- [ ] Web application deployed
- [ ] Auto-update functionality tested
- [ ] Download links verified on website

---

**Ebdaa Digital Technology © 2025** 