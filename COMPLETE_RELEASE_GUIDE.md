# 🚀 **Complete TimeFlow Release Guide**

**Comprehensive automated release process with signing, notarization, and deployment**

---

## **📋 Prerequisites & Credentials**

### **Required Credentials:**
- **Apple ID**: `alshqawe66@gmail.com`
- **App-Specific Password**: `icmi-tdzi-ydvi-lszi`
- **Team ID**: `6GW49LK9V9`
- **GitHub Token**: `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`
- **Certificate**: `CertificateSigningRequest.certSigningRequest` (on Desktop)
- **Signing Identity**: `Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)`

### **Required Tools:**
- npm & npx
- GitHub CLI (`gh`)
- Xcode Command Line Tools
- Code signing certificate in Keychain

---

## **🎯 Quick Release (Recommended)**

### **Simple 3-Step Process:**

```bash
# 1. Setup environment
source scripts/setup-environment.sh

# 2. Run quick release
./scripts/quick-release.sh

# 3. Wait for completion and verify
```

### **What the Quick Release Does:**
✅ Increments patch version (e.g., 1.0.28 → 1.0.29)  
✅ Updates download URLs in web application  
✅ Builds and signs macOS applications  
✅ Notarizes DMG files  
✅ Generates auto-updater configuration  
✅ Creates GitHub release with assets  
✅ Commits and pushes changes  
✅ Triggers Vercel web deployment  

---

## **🔧 Manual Release Process**

### **Step 1: Environment Setup**
```bash
# Set credentials
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"
export GITHUB_TOKEN="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"
```

### **Step 2: Run Full Pipeline**
```bash
# For patch release (recommended)
./scripts/automated-release-pipeline.sh patch

# For minor release
./scripts/automated-release-pipeline.sh minor

# For major release
./scripts/automated-release-pipeline.sh major
```

### **Step 3: Verification**
```bash
# Check GitHub release
gh release view v1.0.XX

# Test download URLs
curl -I https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml
```

---

## **📱 What Gets Updated**

### **Version Management:**
- `package.json` - Application version
- `src/pages/download/index.tsx` - Download page version
- `src/components/ui/desktop-download.tsx` - Download component version

### **Build Artifacts:**
- `TimeFlow-v1.0.XX-Intel.dmg` - Signed & notarized Intel Mac
- `TimeFlow-v1.0.XX-ARM64.dmg` - Signed & notarized Apple Silicon Mac
- `latest-mac.yml` - Auto-updater configuration

### **Deployment:**
- **GitHub Release** - Binary files and auto-updater config
- **Vercel** - Web application (auto-deployed on git push)

---

## **🔄 Auto-Update System**

### **How It Works:**
1. Existing apps check: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
2. Compare local version with remote version
3. If newer version available, download appropriate DMG
4. Prompt user to install update

### **Critical Files:**
- `latest-mac.yml` - **MUST** be uploaded to GitHub release
- SHA512 hashes **MUST** match actual files
- File sizes **MUST** be accurate

---

## **🛠️ Troubleshooting**

### **Signing Issues:**
```bash
# Check available identities
security find-identity -v -p codesigning

# Verify specific identity
security find-certificate -c "Developer ID Application: Ebdaa Digital Technology"
```

### **Notarization Issues:**
```bash
# Check notarization status
xcrun notarytool history --apple-id alshqawe66@gmail.com --team-id 6GW49LK9V9
```

### **Auto-Update 404 Error:**
```bash
# Upload missing latest-mac.yml
gh release upload v1.0.XX latest-mac.yml --clobber
```

### **Build Failures:**
```bash
# Clean everything and retry
rm -rf dist node_modules
npm install
npm run build
```

---

## **📊 Release Checklist**

### **Pre-Release:**
- [ ] Code is tested and ready
- [ ] All credentials are valid
- [ ] Certificate is in Keychain
- [ ] GitHub CLI is authenticated

### **During Release:**
- [ ] Version incremented correctly
- [ ] Download URLs updated
- [ ] Applications built and signed
- [ ] GitHub release created
- [ ] Auto-updater config uploaded

### **Post-Release:**
- [ ] Download links work on website
- [ ] Auto-updater detects new version
- [ ] DMG files install without warnings
- [ ] Web deployment completed on Vercel

---

## **🔗 Important URLs**

### **Release Management:**
- **GitHub Releases**: https://github.com/mafatah/time-flow-admin/releases
- **Web Download Page**: https://time-flow-admin.vercel.app/download
- **Vercel Dashboard**: https://vercel.com/dashboard

### **Auto-Update URLs (Template):**
- **Config**: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/latest-mac.yml`
- **Intel DMG**: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/TimeFlow-v1.0.XX-Intel.dmg`
- **ARM64 DMG**: `https://github.com/mafatah/time-flow-admin/releases/download/v1.0.XX/TimeFlow-v1.0.XX-ARM64.dmg`

---

## **🎮 Advanced Usage**

### **Custom Version Release:**
```bash
# Set custom version in package.json first
npm version 2.0.0 --no-git-tag-version

# Then run release pipeline
./scripts/automated-release-pipeline.sh patch
```

### **Emergency Release:**
```bash
# Skip confirmation prompts
YES=true ./scripts/quick-release.sh
```

### **Testing Without Release:**
```bash
# Build only (no GitHub release)
npm run build
npx electron-builder --mac --publish=never
```

---

## **🧠 Critical Reminders**

1. **ALWAYS update BOTH download locations** (main page + login page)
2. **Upload `latest-mac.yml` to GitHub release** (not just web deployment)
3. **Match SHA512 hashes exactly** between files and config
4. **Sign DMG files** to avoid macOS security warnings
5. **Test auto-updater** before announcing release
6. **Vercel auto-deploys** on push to main (no manual deployment needed)

---

## **📞 Support & Contact**

### **Release Scripts:**
- `scripts/automated-release-pipeline.sh` - Full release automation
- `scripts/quick-release.sh` - Fast patch releases
- `scripts/setup-environment.sh` - Environment configuration

### **Key Features (v1.0.28+):**
- ✅ Enhanced screenshot capture (3 per 10 minutes)
- ✅ Production idle detection (5 minutes)
- ✅ Signed and notarized macOS builds
- ✅ Automatic web deployment
- ✅ Reliable auto-updater system

---

**🎉 Happy Releasing! 🚀**

*Last updated: 2025-06-18* 