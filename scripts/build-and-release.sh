#!/bin/bash

# Build and Release Script for Ebdaa Work Time
# Handles building, signing, notarizing, and releasing to GitHub

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Ebdaa Work Time - Build and Release${NC}"
echo "======================================="

# Load environment variables
if [ -f ".env.signing" ]; then
    echo "📋 Loading signing credentials..."
    source .env.signing
else
    echo -e "${YELLOW}⚠️  No .env.signing file found. Run setup-code-signing.sh first${NC}"
fi

# Set Apple credentials for notarization
export APPLE_ID="${APPLE_ID:-alshqawe66@gmail.com}"
export APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD:-icmi-tdzi-ydvi-lszi}"
export APPLE_TEAM_ID="${APPLE_TEAM_ID:-6GW49LK9V9}"

# Version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📦 Building version: $VERSION"

# Create release directory
RELEASE_DIR="releases/v$VERSION"
mkdir -p "$RELEASE_DIR"

echo ""
echo -e "${BLUE}🏗️  Step 1: Building web application${NC}"
echo "===================================="

# Build web app
npm run build

echo -e "${GREEN}✅ Web build completed${NC}"

echo ""
echo -e "${BLUE}🔧 Step 2: Preparing electron build${NC}"
echo "=================================="

# Copy web build to electron resources
mkdir -p build/dist
cp -r dist/* build/dist/

# Ensure build directory structure
mkdir -p build/electron
mkdir -p build/desktop-agent

# Copy electron main files
cp -r electron/* build/electron/
cp -r desktop-agent/* build/desktop-agent/

echo -e "${GREEN}✅ Electron build prepared${NC}"

echo ""
echo -e "${BLUE}🔐 Step 3: Code signing and building${NC}"
echo "==================================="

# Set environment variables for electron-builder
export CSC_LINK="$CSC_LINK"
export CSC_KEY_PASSWORD="$CSC_KEY_PASSWORD"

# Function to build for specific platform
build_platform() {
    local platform=$1
    local arch=$2
    
    echo "🔨 Building for $platform-$arch..."
    
    case $platform in
        "mac")
            npx electron-builder --mac --$arch --publish never
            ;;
        "win")
            npx electron-builder --win --$arch --publish never
            ;;
        "linux")
            npx electron-builder --linux --$arch --publish never
            ;;
    esac
}

# Build for different platforms
echo "🍎 Building macOS versions..."
build_platform "mac" "arm64"
build_platform "mac" "x64"

if [ -f "build/code-signing-cert.p12" ]; then
    echo "🪟 Building Windows version..."
    build_platform "win" "x64"
else
    echo -e "${YELLOW}⚠️  Skipping Windows build - no code signing certificate${NC}"
fi

echo "🐧 Building Linux version..."
build_platform "linux" "x64"

echo -e "${GREEN}✅ All builds completed${NC}"

echo ""
echo -e "${BLUE}📦 Step 4: Organizing release files${NC}"
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

# List release files
echo ""
echo "📋 Release files:"
ls -la "$RELEASE_DIR/"

echo ""
echo -e "${BLUE}🔍 Step 5: Verifying signatures${NC}"
echo "==============================="

# Verify macOS signatures
for dmg in "$RELEASE_DIR"/*.dmg; do
    if [ -f "$dmg" ]; then
        echo "🔍 Verifying $(basename "$dmg")..."
        codesign --verify --verbose "$dmg" && echo -e "${GREEN}✅ Valid signature${NC}" || echo -e "${RED}❌ Invalid signature${NC}"
        
        # Check notarization
        spctl --assess --verbose "$dmg" && echo -e "${GREEN}✅ Notarized${NC}" || echo -e "${YELLOW}⚠️  Not notarized${NC}"
    fi
done

# Verify Windows signatures
for exe in "$RELEASE_DIR"/*.exe; do
    if [ -f "$exe" ]; then
        echo "🔍 Windows executable: $(basename "$exe")"
        # Note: signtool verification would need to be run on Windows
    fi
done

echo ""
echo -e "${BLUE}🌐 Step 6: Creating GitHub release${NC}"
echo "================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not installed. Manual upload required.${NC}"
    echo "📋 To install: brew install gh"
    echo "📋 Then run: gh auth login"
else
    echo "🔐 Creating GitHub release..."
    
    # Create release notes
    RELEASE_NOTES="# Ebdaa Work Time v$VERSION

## 🎉 New Release

Professional employee time tracking with enterprise-grade features.

### 📦 Downloads Available

- **Ebdaa-Work-Time-$VERSION-arm64.dmg** - macOS Apple Silicon (M1/M2/M3 Macs)
- **Ebdaa-Work-Time-$VERSION.dmg** - macOS Intel (x86_64 Macs)  
- **Ebdaa-Work-Time-Setup-$VERSION.exe** - Windows 10/11 (x64)
- **Ebdaa-Work-Time-$VERSION.AppImage** - Linux (x64)

### ✨ Features

- 📸 Smart Screenshot Capture
- ⏱️ Precise Time Tracking  
- 📊 Activity Monitoring
- 🔄 Real-time Sync
- 🛡️ Enterprise Security
- 🎯 Intelligent Detection

### 🔧 Installation

#### macOS:
1. Download the appropriate DMG file for your Mac
2. Open the DMG file
3. Drag 'Ebdaa Work Time.app' to your Applications folder
4. Launch from Applications

#### Windows:
1. Download Ebdaa-Work-Time-Setup-$VERSION.exe
2. Right-click and 'Run as administrator'
3. Follow the installation wizard

#### Linux:
1. Download Ebdaa-Work-Time-$VERSION.AppImage
2. Make executable: chmod +x Ebdaa-Work-Time-$VERSION.AppImage
3. Run: ./Ebdaa-Work-Time-$VERSION.AppImage

---
**Ebdaa Digital Technology © $(date +%Y)**"

    # Create the release
    if gh release create "v$VERSION" \
        --title "Ebdaa Work Time v$VERSION" \
        --notes "$RELEASE_NOTES" \
        --draft \
        "$RELEASE_DIR"/*; then
        
        echo -e "${GREEN}✅ GitHub release created successfully!${NC}"
        echo "🔗 View at: https://github.com/mafatah/time-flow-admin/releases/tag/v$VERSION"
        
        # Update download links in web app
        echo ""
        echo -e "${BLUE}🔗 Step 7: Updating download links${NC}"
        echo "================================="
        
        ./scripts/update-download-links.sh "v$VERSION"
        
    else
        echo -e "${RED}❌ Failed to create GitHub release${NC}"
        echo "📋 Manual steps:"
        echo "1. Go to https://github.com/mafatah/time-flow-admin/releases/new"
        echo "2. Tag: v$VERSION"
        echo "3. Upload files from: $RELEASE_DIR/"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Build and Release Process Complete!${NC}"
echo "======================================"
echo "📦 Version: $VERSION"
echo "📁 Files: $RELEASE_DIR/"
echo "🔗 GitHub: https://github.com/mafatah/time-flow-admin/releases"
echo ""
echo "🚀 Next steps:"
echo "1. Test the downloaded applications"
echo "2. Publish the GitHub release when ready"
echo "3. Update any download links in documentation" 