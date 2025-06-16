#!/bin/bash

set -e

# Configuration
VERSION="v1.0.19"
REPO_OWNER="mafatah"
REPO_NAME="time-flow-admin"
SIGNING_PASSWORD="icmi-tdzi-ydvi-lszi"
TEAM_ID="6GW49LK9V9"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏗️  Building TimeFlow Desktop Agent v1.0.19 for All Platforms${NC}"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
rm -rf build/
rm -rf releases/v1.0.19/
mkdir -p releases/v1.0.19/

# Build the application
echo -e "${BLUE}🏗️  Building application...${NC}"
npm run build:all

# Check if we're on macOS for code signing
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}🍎 Building and signing macOS versions...${NC}"
    
    # Build macOS versions with signing
    echo -e "${YELLOW}🔐 Building signed macOS Intel version...${NC}"
    npx electron-builder --mac --x64 --publish=never
    
    echo -e "${YELLOW}🔐 Building signed macOS ARM64 version...${NC}"
    npx electron-builder --mac --arm64 --publish=never
    
    # Copy signed DMGs to releases directory
    cp dist/*.dmg releases/v1.0.19/ 2>/dev/null || true
    
    # Rename files to match convention
    if [ -f "releases/v1.0.19/Ebdaa Work Time-1.0.19.dmg" ]; then
        mv "releases/v1.0.19/Ebdaa Work Time-1.0.19.dmg" "releases/v1.0.19/TimeFlow-v1.0.19-Intel.dmg"
    fi
    
    if [ -f "releases/v1.0.19/Ebdaa Work Time-1.0.19-arm64.dmg" ]; then
        mv "releases/v1.0.19/Ebdaa Work Time-1.0.19-arm64.dmg" "releases/v1.0.19/TimeFlow-v1.0.19-ARM64.dmg"
    fi
    
    echo -e "${GREEN}✅ macOS builds completed and signed${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping macOS build (not running on macOS)${NC}"
fi

# Build Windows version
echo -e "${BLUE}🪟 Building Windows version...${NC}"
npx electron-builder --win --x64 --publish=never

# Copy Windows executable to releases directory
if [ -f "dist/TimeFlow Setup 1.0.19.exe" ]; then
    cp "dist/TimeFlow Setup 1.0.19.exe" "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe"
elif [ -f "dist/Ebdaa Work Time Setup 1.0.19.exe" ]; then
    cp "dist/Ebdaa Work Time Setup 1.0.19.exe" "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe"
else
    echo -e "${YELLOW}⚠️  Windows build may not be available${NC}"
fi

# Build Linux version
echo -e "${BLUE}🐧 Building Linux version...${NC}"
npx electron-builder --linux --x64 --publish=never

# Copy Linux AppImage to releases directory
if [ -f "dist/TimeFlow-1.0.19.AppImage" ]; then
    cp "dist/TimeFlow-1.0.19.AppImage" "releases/v1.0.19/TimeFlow-v1.0.19.AppImage"
elif [ -f "dist/Ebdaa Work Time-1.0.19.AppImage" ]; then
    cp "dist/Ebdaa Work Time-1.0.19.AppImage" "releases/v1.0.19/TimeFlow-v1.0.19.AppImage"
else
    echo -e "${YELLOW}⚠️  Linux build may not be available${NC}"
fi

echo -e "${GREEN}✅ All platform builds completed${NC}"

# List built files
echo -e "${BLUE}📋 Built files:${NC}"
ls -la releases/v1.0.19/

# Calculate file hashes and sizes
echo -e "${BLUE}🔐 Calculating file hashes...${NC}"

# Initialize variables
INTEL_DMG=""
ARM64_DMG=""
WINDOWS_EXE=""
LINUX_APPIMAGE=""

# Check which files exist and calculate their hashes
if [ -f "releases/v1.0.19/TimeFlow-v1.0.19-Intel.dmg" ]; then
    INTEL_SHA512=$(shasum -a 512 "releases/v1.0.19/TimeFlow-v1.0.19-Intel.dmg" | cut -d' ' -f1)
    INTEL_SIZE=$(stat -f%z "releases/v1.0.19/TimeFlow-v1.0.19-Intel.dmg" 2>/dev/null || stat -c%s "releases/v1.0.19/TimeFlow-v1.0.19-Intel.dmg")
    INTEL_DMG="TimeFlow-v1.0.19-Intel.dmg"
fi

if [ -f "releases/v1.0.19/TimeFlow-v1.0.19-ARM64.dmg" ]; then
    ARM64_SHA512=$(shasum -a 512 "releases/v1.0.19/TimeFlow-v1.0.19-ARM64.dmg" | cut -d' ' -f1)
    ARM64_SIZE=$(stat -f%z "releases/v1.0.19/TimeFlow-v1.0.19-ARM64.dmg" 2>/dev/null || stat -c%s "releases/v1.0.19/TimeFlow-v1.0.19-ARM64.dmg")
    ARM64_DMG="TimeFlow-v1.0.19-ARM64.dmg"
fi

if [ -f "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe" ]; then
    WINDOWS_SHA512=$(shasum -a 512 "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe" | cut -d' ' -f1)
    WINDOWS_SIZE=$(stat -f%z "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe" 2>/dev/null || stat -c%s "releases/v1.0.19/TimeFlow-v1.0.19-Setup.exe")
    WINDOWS_EXE="TimeFlow-v1.0.19-Setup.exe"
fi

if [ -f "releases/v1.0.19/TimeFlow-v1.0.19.AppImage" ]; then
    LINUX_SHA512=$(shasum -a 512 "releases/v1.0.19/TimeFlow-v1.0.19.AppImage" | cut -d' ' -f1)
    LINUX_SIZE=$(stat -f%z "releases/v1.0.19/TimeFlow-v1.0.19.AppImage" 2>/dev/null || stat -c%s "releases/v1.0.19/TimeFlow-v1.0.19.AppImage")
    LINUX_APPIMAGE="TimeFlow-v1.0.19.AppImage"
fi

# Update latest-mac.yml
if [ -n "$INTEL_DMG" ] || [ -n "$ARM64_DMG" ]; then
    echo -e "${BLUE}📝 Updating latest-mac.yml...${NC}"
    cat > latest-mac.yml << EOF
version: 1.0.19
files:
EOF

    if [ -n "$INTEL_DMG" ]; then
        cat >> latest-mac.yml << EOF
  - url: $INTEL_DMG
    sha512: $INTEL_SHA512
    size: $INTEL_SIZE
EOF
    fi

    if [ -n "$ARM64_DMG" ]; then
        cat >> latest-mac.yml << EOF
  - url: $ARM64_DMG
    sha512: $ARM64_SHA512
    size: $ARM64_SIZE
EOF
    fi

    # Set the primary file (prefer Intel for backward compatibility)
    PRIMARY_FILE="$INTEL_DMG"
    PRIMARY_SHA512="$INTEL_SHA512"
    if [ -z "$PRIMARY_FILE" ]; then
        PRIMARY_FILE="$ARM64_DMG"
        PRIMARY_SHA512="$ARM64_SHA512"
    fi

    cat >> latest-mac.yml << EOF
path: $PRIMARY_FILE
sha512: $PRIMARY_SHA512
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF
fi

# Update latest.yml for Windows/Linux
if [ -n "$WINDOWS_EXE" ] || [ -n "$LINUX_APPIMAGE" ]; then
    echo -e "${BLUE}📝 Updating latest.yml...${NC}"
    cat > latest.yml << EOF
version: 1.0.19
files:
EOF

    if [ -n "$WINDOWS_EXE" ]; then
        cat >> latest.yml << EOF
  - url: $WINDOWS_EXE
    sha512: $WINDOWS_SHA512
    size: $WINDOWS_SIZE
EOF
    fi

    if [ -n "$LINUX_APPIMAGE" ]; then
        cat >> latest.yml << EOF
  - url: $LINUX_APPIMAGE
    sha512: $LINUX_SHA512
    size: $LINUX_SIZE
EOF
    fi

    # Set the primary file (prefer Windows for backward compatibility)
    PRIMARY_FILE="$WINDOWS_EXE"
    PRIMARY_SHA512="$WINDOWS_SHA512"
    if [ -z "$PRIMARY_FILE" ]; then
        PRIMARY_FILE="$LINUX_APPIMAGE"
        PRIMARY_SHA512="$LINUX_SHA512"
    fi

    cat >> latest.yml << EOF
path: $PRIMARY_FILE
sha512: $PRIMARY_SHA512
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF
fi

# Update download page
echo -e "${BLUE}🌐 Updating download page...${NC}"
sed -i.bak 's/const version = "v1.0.16";/const version = "v1.0.19";/' src/pages/download/index.tsx

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo "Version: v1.0.19"
echo "Files built:"
[ -n "$INTEL_DMG" ] && echo "  ✅ macOS Intel: $INTEL_DMG"
[ -n "$ARM64_DMG" ] && echo "  ✅ macOS ARM64: $ARM64_DMG"
[ -n "$WINDOWS_EXE" ] && echo "  ✅ Windows: $WINDOWS_EXE"
[ -n "$LINUX_APPIMAGE" ] && echo "  ✅ Linux: $LINUX_APPIMAGE"

echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Run ./scripts/upload-v1.0.19-release.sh to upload to GitHub"
echo "2. Test the release downloads"
echo "3. Deploy the updated web application"

# Ask if user wants to upload to GitHub now
read -p "Do you want to upload to GitHub now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🚀 Starting GitHub upload...${NC}"
    ./scripts/upload-v1.0.19-release.sh
else
    echo -e "${YELLOW}📋 Build completed. Run ./scripts/upload-v1.0.19-release.sh when ready to upload.${NC}"
fi 