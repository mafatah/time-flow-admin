#!/bin/bash
set -e

# 🚀 Build Test DMG for TimeFlow Window Management Testing
# This script creates an unsigned DMG for quick testing

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building Test TimeFlow DMG (Unsigned)${NC}"
echo "=============================================="

# Configuration
CURRENT_VERSION="1.0.46"
BUILD_DIR="dist"
FINAL_DMG="TimeFlow-v${CURRENT_VERSION}-Test-WindowManagement.dmg"

# Verify prerequisites
echo -e "${BLUE}🔍 Verifying prerequisites...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run from project root.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites verified${NC}"

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf $BUILD_DIR
rm -rf build
rm -f *.dmg

# Build web application
echo -e "${BLUE}🏗️ Building web application...${NC}"
npm run build
echo -e "${GREEN}✅ Web application built${NC}"

# Build desktop agent
echo -e "${BLUE}🖥️ Building desktop agent...${NC}"
cd desktop-agent

# Update desktop-agent package.json for unsigned build
echo -e "${BLUE}⚙️ Configuring desktop-agent for unsigned build...${NC}"
cat > package.json << EOL
{
  "name": "ebdaa-work-time-agent",
  "version": "${CURRENT_VERSION}",
  "description": "Ebdaa Work Time Agent - Employee time tracking and productivity monitoring",
  "main": "src/main.js",
  "author": "Ebdaa Digital Technology",
  "scripts": {
    "start": "electron .",
    "electron": "electron .",
    "build": "electron-builder",
    "build:mac": "electron-builder --mac",
    "build:dmg": "electron-builder --mac dmg",
    "test-mac": "electron test-mac-permissions.js",
    "test-screenshot": "node test-screenshot.js",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8",
    "active-win": "^8.2.1",
    "axios": "^1.9.0",
    "dotenv": "^16.5.0",
    "node-cron": "^4.0.7",
    "screenshot-desktop": "^1.14.0"
  },
  "devDependencies": {
    "electron": "^28.3.3",
    "electron-builder": "^24.13.3",
    "electron-rebuild": "^3.2.9"
  },
  "build": {
    "appId": "com.ebdaa.work-time-agent",
    "productName": "Ebdaa Work Time",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "assets/**/*",
      "config/**/*",
      "renderer/**/*",
      "load-config.js",
      "env-config.js",
      "config.json",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.productivity",
      "icon": "assets/icon.png",
      "target": [
        {
          "target": "dmg",
          "arch": ["arm64", "x64"]
        }
      ]
    },
    "dmg": {
      "title": "Install Ebdaa Work Time v\${version}",
      "icon": "assets/icon.png",
      "background": null,
      "window": {
        "width": 540,
        "height": 380
      },
      "contents": [
        {
          "x": 140,
          "y": 220,
          "type": "file"
        },
        {
          "x": 400,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    }
  }
}
EOL

# Install dependencies if needed
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --no-audit --no-fund

# Build the application (unsigned)
echo -e "${BLUE}🔨 Building Electron application (unsigned)...${NC}"
npx electron-builder --mac --publish=never

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

# Find the built DMG files
echo -e "${BLUE}🔍 Locating built DMG files...${NC}"
DMG_FILES=$(find dist -name "*.dmg" -type f)

if [ -z "$DMG_FILES" ]; then
    echo -e "${RED}❌ No DMG files found in dist directory${NC}"
    ls -la dist/
    exit 1
fi

echo -e "${GREEN}✅ Found DMG files:${NC}"
echo "$DMG_FILES"

# Copy the first DMG to root directory for testing
FIRST_DMG=$(echo "$DMG_FILES" | head -1)
cp "$FIRST_DMG" "../$FINAL_DMG"

cd ..

# Test DMG integrity
echo -e "${BLUE}🧪 Testing DMG integrity...${NC}"
hdiutil verify "$FINAL_DMG"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ DMG integrity verified${NC}"
else
    echo -e "${RED}❌ DMG integrity check failed${NC}"
    exit 1
fi

# Get file information
DMG_SIZE=$(ls -lh "$FINAL_DMG" | awk '{print $5}')
DMG_SHA256=$(shasum -a 256 "$FINAL_DMG" | cut -d' ' -f1)

echo ""
echo -e "${GREEN}🎉 Test DMG created successfully!${NC}"
echo "=============================================="
echo -e "${BLUE}📁 File: $FINAL_DMG${NC}"
echo -e "${BLUE}📏 Size: $DMG_SIZE${NC}"
echo -e "${BLUE}🔐 SHA256: $DMG_SHA256${NC}"
echo ""
echo -e "${YELLOW}⚠️ Note: This is an UNSIGNED DMG for testing purposes only${NC}"
echo -e "${YELLOW}   macOS will require right-click > Open to bypass Gatekeeper${NC}"
echo ""
echo -e "${BLUE}🧪 Window Management Testing Instructions:${NC}"
echo "1. Double-click the DMG to mount it"
echo "2. Drag 'Ebdaa Work Time' to Applications folder"
echo "3. Right-click the app in Applications and select 'Open'"
echo "4. Grant necessary permissions when prompted"
echo "5. Test the window management fixes:"
echo "   - ✅ Start timer tracking"
echo "   - ✅ Minimize or close the window"
echo "   - ✅ Click dock icon - should restore and focus properly"
echo "   - ✅ Double-click tray icon - should also work"
echo "   - ✅ Try multiple times to ensure consistency"
echo ""
echo -e "${BLUE}🔧 Debug Instructions:${NC}"
echo "- Use Cmd+Shift+D to open debug console"
echo "- Watch for console messages about window activation"
echo "- Test with timer running and stopped"
echo ""
echo -e "${GREEN}✅ Ready for Window Management Testing!${NC}" 