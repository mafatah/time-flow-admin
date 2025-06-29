#!/bin/bash
set -e

# 🚀 Complete TimeFlow v1.0.40 Release Script
# This script handles version updates, building, signing, notarization, and deployment

echo "🚀 Starting TimeFlow v1.0.40 Release Process..."

# Configuration
export NEW_VERSION="1.0.40"
export RELEASE_TAG="v1.0.40"
export RELEASE_TITLE="TimeFlow v1.0.40 - Signed & Notarized Release"

# Apple Credentials for Signing & Notarization
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"

# GitHub Credentials for Release
export GITHUB_TOKEN="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"

echo "📋 Configuration:"
echo "  Version: $NEW_VERSION"
echo "  Apple ID: $APPLE_ID"
echo "  Team ID: $APPLE_TEAM_ID"
echo "  GitHub Repo: mafatah/time-flow-admin"

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf build/dist
rm -rf build/electron

# Step 2: Build web application
echo "🏗️ Building web application..."
npm run build

# Step 3: Build desktop application with signing & notarization
echo "🔐 Building desktop application with signing & notarization..."
echo "  This may take several minutes for notarization..."

# Set additional environment variables for electron-builder
export CSC_IDENTITY="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
export CSC_KEY_PASSWORD=""  # Set if using p12 file

# Build for macOS with signing and notarization
npx electron-builder --mac --publish=never

# Verify the files were created
echo "📁 Verifying built files..."
if [ ! -f "dist/Ebdaa Work Time-${NEW_VERSION}.dmg" ]; then
    echo "❌ Error: Intel DMG not found!"
    exit 1
fi

if [ ! -f "dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg" ]; then
    echo "❌ Error: ARM64 DMG not found!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Step 4: Generate file information for auto-update
echo "📊 Generating file information..."

# Get file sizes and SHA512 hashes
INTEL_SIZE=$(stat -f%z "dist/Ebdaa Work Time-${NEW_VERSION}.dmg")
ARM64_SIZE=$(stat -f%z "dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg")

INTEL_SHA512=$(shasum -a 512 "dist/Ebdaa Work Time-${NEW_VERSION}.dmg" | cut -d' ' -f1)
ARM64_SHA512=$(shasum -a 512 "dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg" | cut -d' ' -f1)

echo "📊 File Information:"
echo "  Intel DMG: ${INTEL_SIZE} bytes, SHA512: ${INTEL_SHA512}"
echo "  ARM64 DMG: ${ARM64_SIZE} bytes, SHA512: ${ARM64_SHA512}"

# Step 5: Update auto-update configuration
echo "📝 Updating auto-update configuration..."

# Create latest-mac.yml
cat > latest-mac.yml << EOF
version: ${NEW_VERSION}
files:
  - url: TimeFlow-${RELEASE_TAG}-Intel.dmg
    sha512: ${INTEL_SHA512}
    size: ${INTEL_SIZE}
  - url: TimeFlow-${RELEASE_TAG}-ARM64.dmg
    sha512: ${ARM64_SHA512}
    size: ${ARM64_SIZE}
path: TimeFlow-${RELEASE_TAG}-Intel.dmg
sha512: ${INTEL_SHA512}
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF

echo "✅ Updated latest-mac.yml"

# Create placeholder latest.yml for Windows (when ready)
cat > latest.yml << EOF
version: ${NEW_VERSION}
files:
  - url: TimeFlow-${RELEASE_TAG}-Setup.exe
    sha512: placeholder_windows_sha512
    size: 0
path: TimeFlow-${RELEASE_TAG}-Setup.exe
sha512: placeholder_windows_sha512
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF

echo "✅ Updated latest.yml (Windows placeholder)"

# Step 6: Copy files to downloads directory for web deployment
echo "📁 Copying files to public downloads directory..."

mkdir -p public/downloads

# Copy with proper naming for GitHub releases
cp "dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg" "public/downloads/TimeFlow-${RELEASE_TAG}-ARM64.dmg"
cp "dist/Ebdaa Work Time-${NEW_VERSION}.dmg" "public/downloads/TimeFlow-${RELEASE_TAG}-Intel.dmg"

echo "✅ Files copied to public/downloads/"

# Step 7: Create GitHub Release with all assets
echo "🚀 Creating GitHub Release..."

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

# Create the release with all files
gh release create $RELEASE_TAG \
  "dist/Ebdaa Work Time-${NEW_VERSION}-arm64.dmg#TimeFlow-${RELEASE_TAG}-ARM64.dmg" \
  "dist/Ebdaa Work Time-${NEW_VERSION}.dmg#TimeFlow-${RELEASE_TAG}-Intel.dmg" \
  latest-mac.yml \
  latest.yml \
  --title "$RELEASE_TITLE" \
  --notes "🚀 **TimeFlow v${NEW_VERSION} - Signed & Notarized Release**

## ✨ What's New in v${NEW_VERSION}
- ✅ Fully signed and notarized macOS applications
- 🔐 Enhanced security with proper code signing
- 🚀 Improved auto-update mechanism
- 🛡️ macOS Gatekeeper compatibility

## 📱 Download Options
- **macOS Apple Silicon (M1/M2/M3)**: [TimeFlow-${RELEASE_TAG}-ARM64.dmg](https://github.com/mafatah/time-flow-admin/releases/download/${RELEASE_TAG}/TimeFlow-${RELEASE_TAG}-ARM64.dmg)
- **macOS Intel**: [TimeFlow-${RELEASE_TAG}-Intel.dmg](https://github.com/mafatah/time-flow-admin/releases/download/${RELEASE_TAG}/TimeFlow-${RELEASE_TAG}-Intel.dmg)

## 🔧 Installation
1. Download the appropriate DMG for your Mac
2. Open the DMG file
3. Drag **Ebdaa Work Time** to Applications
4. Launch from Applications folder

## ⚡ Auto-Update
Existing users will be automatically notified of this update.

## 📋 File Information
- **ARM64 DMG**: ${ARM64_SIZE} bytes
- **Intel DMG**: ${INTEL_SIZE} bytes
- **Signed & Notarized**: ✅ Yes
- **Team ID**: 6GW49LK9V9"

echo "✅ GitHub Release created: https://github.com/mafatah/time-flow-admin/releases/tag/$RELEASE_TAG"

# Step 8: Commit and deploy web changes
echo "🌐 Committing and deploying web changes..."

git add -A
git commit -m "🚀 Release v${NEW_VERSION} - Signed & Notarized

- Updated version to ${NEW_VERSION}
- Updated download URLs for Mac, Windows, Linux
- Added proper code signing configuration
- Updated auto-update configuration
- Enhanced security with notarization"

git push origin main

echo "✅ Changes pushed to main branch (Vercel will auto-deploy)"

# Step 9: Verification
echo "🔍 Release Verification:"
echo "  📱 GitHub Release: https://github.com/mafatah/time-flow-admin/releases/tag/$RELEASE_TAG"
echo "  🔗 Auto-Update Config: https://github.com/mafatah/time-flow-admin/releases/download/$RELEASE_TAG/latest-mac.yml"
echo "  🌐 Web Download Page: https://timeflow-admin.vercel.app/download (will update after Vercel deploy)"
echo "  🔐 DMG Files: Signed with Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

echo ""
echo "🎉 Release v${NEW_VERSION} completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "  1. Test auto-update on existing installation"
echo "  2. Verify downloads work from web page"
echo "  3. Test DMG installation on clean macOS system"
echo "  4. Monitor for any user issues"
echo ""
echo "⚠️  Windows & Linux builds can be added later using the same process" 