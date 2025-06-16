#!/bin/bash

# Build and Release Script for Ebdaa Work Time v1.0.20
# Handles building, signing, notarizing, and releasing to GitHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Ebdaa Work Time v1.0.20 - Build and Release${NC}"
echo "=============================================="

# Set Apple credentials for notarization
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"

# Version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Building version: $VERSION"

# Create release directory
RELEASE_DIR="releases/v$VERSION"
mkdir -p "$RELEASE_DIR"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
rm -rf build/dist/
rm -rf build/electron/
rm -rf build/desktop-agent/

echo ""
echo -e "${BLUE}🏗️  Step 1: Building web application${NC}"
echo "===================================="

# Build web app
npm run build

echo -e "${GREEN}✅ Web build completed${NC}"

echo ""
echo -e "${BLUE}🔧 Step 2: Preparing electron build${NC}"
echo "=================================="

# Build electron components
npm run build:electron

# Copy web build to electron resources
mkdir -p build/dist
cp -r dist/* build/dist/

echo -e "${GREEN}✅ Electron build prepared${NC}"

echo ""
echo -e "${BLUE}🔐 Step 3: Setting up code signing${NC}"
echo "================================="

# Copy certificates to build directory
mkdir -p build/certificates
cp ~/Desktop/TimeFlow-Certificates/TimeFlowPrivateKey.key build/certificates/
cp ~/Desktop/TimeFlow-Certificates/TimeFlowCSR.csr build/certificates/
cp ~/Desktop/CertificateSigningRequest.certSigningRequest build/certificates/

# Set up signing identity
SIGNING_IDENTITY="Ebdaa Digital Technology (6GW49LK9V9)"

echo -e "${GREEN}✅ Code signing setup completed${NC}"

echo ""
echo -e "${BLUE}🔨 Step 4: Building and signing applications${NC}"
echo "==========================================="

# Build macOS ARM64 (M1/M2/M3 Macs)
echo "🍎 Building macOS ARM64..."
npx electron-builder --mac --arm64 --publish never \
    --config.mac.identity="$SIGNING_IDENTITY" \
    --config.mac.notarize.teamId="$APPLE_TEAM_ID"

# Build macOS x64 (Intel Macs)
echo "🍎 Building macOS x64..."
npx electron-builder --mac --x64 --publish never \
    --config.mac.identity="$SIGNING_IDENTITY" \
    --config.mac.notarize.teamId="$APPLE_TEAM_ID"

# Build Windows x64
echo "🪟 Building Windows x64..."
npx electron-builder --win --x64 --publish never

# Build Linux AppImage
echo "🐧 Building Linux AppImage..."
npx electron-builder --linux --x64 --publish never

echo -e "${GREEN}✅ All builds completed${NC}"

echo ""
echo -e "${BLUE}📦 Step 5: Organizing release files${NC}"
echo "================================="

# Copy built files to release directory
if [ -d "dist" ]; then
    # Find and copy DMG files
    find dist -name "*.dmg" -exec cp {} "$RELEASE_DIR/" \;
    
    # Find and copy EXE files
    find dist -name "*.exe" -exec cp {} "$RELEASE_DIR/" \;
    
    # Find and copy AppImage files
    find dist -name "*.AppImage" -exec cp {} "$RELEASE_DIR/" \;
    
    # Copy latest.yml files for auto-updater
    find dist -name "latest*.yml" -exec cp {} "$RELEASE_DIR/" \;
    
    echo -e "${GREEN}✅ Release files organized${NC}"
else
    echo -e "${RED}❌ Build output directory not found${NC}"
    exit 1
fi

# Rename files with proper version names
cd "$RELEASE_DIR"
for file in *.dmg; do
    if [[ $file == *"arm64"* ]]; then
        mv "$file" "TimeFlow-v$VERSION-ARM64-Signed.dmg"
    elif [[ $file == *"x64"* ]] || [[ $file != *"arm64"* ]]; then
        mv "$file" "TimeFlow-v$VERSION-Intel-Signed.dmg"
    fi
done

for file in *.exe; do
    mv "$file" "TimeFlow-Setup-v$VERSION-Windows-x64.exe"
done

for file in *.AppImage; do
    mv "$file" "TimeFlow-v$VERSION-Linux-x64.AppImage"
done

cd - > /dev/null

# List release files
echo ""
echo "📋 Release files:"
ls -la "$RELEASE_DIR/"

echo ""
echo -e "${BLUE}🔍 Step 6: Verifying signatures and notarization${NC}"
echo "=============================================="

# Verify macOS signatures and notarization
for dmg in "$RELEASE_DIR"/*.dmg; do
    if [ -f "$dmg" ]; then
        echo "🔍 Verifying $(basename "$dmg")..."
        
        # Verify signature
        if codesign --verify --verbose "$dmg" 2>/dev/null; then
            echo -e "${GREEN}✅ Valid signature${NC}"
        else
            echo -e "${YELLOW}⚠️  Signature verification failed${NC}"
        fi
        
        # Check notarization status
        if spctl --assess --verbose "$dmg" 2>/dev/null; then
            echo -e "${GREEN}✅ Notarized and approved${NC}"
        else
            echo -e "${YELLOW}⚠️  Notarization check failed${NC}"
        fi
    fi
done

echo ""
echo -e "${BLUE}🌐 Step 7: Creating GitHub release${NC}"
echo "================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not installed. Installing...${NC}"
    if command -v brew &> /dev/null; then
        brew install gh
    else
        echo -e "${RED}❌ Homebrew not found. Please install GitHub CLI manually${NC}"
        echo "📋 Download from: https://cli.github.com/"
        exit 1
    fi
fi

# Authenticate if needed
if ! gh auth status &> /dev/null; then
    echo "🔐 GitHub authentication required..."
    gh auth login
fi

echo "🔐 Creating GitHub release..."

# Create release notes
RELEASE_NOTES="# TimeFlow v$VERSION - Professional Time Tracking

## 🎉 What's New in v$VERSION

### ✨ Key Improvements
- 🗑️ **Cleaner Interface**: Removed test buttons for professional appearance
- 🔐 **Enhanced Login**: Improved auto-login functionality with persistent sessions
- 💾 **Better UX**: Users stay logged in between app restarts
- 🔧 **Bug Fixes**: Various stability and performance improvements

### 📦 Download Options

Choose the right version for your system:

| Platform | File | Description |
|----------|------|-------------|
| 🍎 **macOS Apple Silicon** | \`TimeFlow-v$VERSION-ARM64-Signed.dmg\` | For M1/M2/M3 Macs |
| 🍎 **macOS Intel** | \`TimeFlow-v$VERSION-Intel-Signed.dmg\` | For Intel x86_64 Macs |
| 🪟 **Windows** | \`TimeFlow-Setup-v$VERSION-Windows-x64.exe\` | Windows 10/11 (64-bit) |
| 🐧 **Linux** | \`TimeFlow-v$VERSION-Linux-x64.AppImage\` | Linux x86_64 |

### 🔧 Installation Instructions

#### macOS:
1. Download the appropriate DMG file for your Mac
2. Open the DMG file and drag TimeFlow to Applications
3. If you see a security warning, go to System Preferences > Security & Privacy and click 'Open Anyway'

#### Windows:
1. Download the EXE file
2. Right-click and select 'Run as administrator'
3. Follow the installation wizard

#### Linux:
1. Download the AppImage file
2. Make it executable: \`chmod +x TimeFlow-v$VERSION-Linux-x64.AppImage\`
3. Run: \`./TimeFlow-v$VERSION-Linux-x64.AppImage\`

### ✨ Features

- 📸 **Smart Screenshot Capture** - Automatic activity monitoring
- ⏱️ **Precise Time Tracking** - Accurate work session recording
- 📊 **Activity Analytics** - Detailed productivity insights
- 🔄 **Real-time Sync** - Instant data synchronization
- 🛡️ **Enterprise Security** - Bank-grade data protection
- 🎯 **Intelligent Detection** - Advanced anti-cheat algorithms

### 🔒 Security & Privacy

TimeFlow uses enterprise-grade security measures:
- End-to-end encryption for all data
- Local data processing with optional cloud sync
- GDPR compliant data handling
- Transparent activity monitoring

---

**Built with ❤️ by Ebdaa Digital Technology**  
© $(date +%Y) Ebdaa Digital Technology. All rights reserved."

# Create the release
if gh release create "v$VERSION" \
    --title "TimeFlow v$VERSION - Professional Time Tracking" \
    --notes "$RELEASE_NOTES" \
    --draft \
    "$RELEASE_DIR"/*; then
    
    echo -e "${GREEN}✅ GitHub release created successfully!${NC}"
    echo "🔗 View at: https://github.com/mafatah/time-flow-admin/releases/tag/v$VERSION"
    
else
    echo -e "${RED}❌ Failed to create GitHub release${NC}"
    echo "📋 Manual upload required to: https://github.com/mafatah/time-flow-admin/releases/new"
fi

echo ""
echo -e "${BLUE}🔗 Step 8: Updating download links in web app${NC}"
echo "============================================"

# Update download links in the web application
./scripts/update-download-links.sh "v$VERSION"

echo ""
echo -e "${GREEN}🎉 Build and Release Process Complete!${NC}"
echo "======================================"
echo "📦 Version: $VERSION"
echo "📁 Release files: $RELEASE_DIR/"
echo "🔗 GitHub Release: https://github.com/mafatah/time-flow-admin/releases/tag/v$VERSION"
echo ""
echo "✅ Next steps:"
echo "1. 🧪 Test the applications on different platforms"
echo "2. 📢 Publish the GitHub release (currently draft)"
echo "3. 🔗 Verify download links in web app"
echo "4. 📧 Notify users of the new release"
echo ""
echo "🚀 Release v$VERSION is ready for deployment!" 