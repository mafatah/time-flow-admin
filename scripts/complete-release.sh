#!/bin/bash
set -e

# 🚀 Complete TimeFlow Release Script with Signing & Notarization
# This script handles the entire release process from build to deployment

echo "🚀 Starting TimeFlow Complete Release Process..."
echo "=================================================="

# Configuration
NEW_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
echo "📦 Current Version: v$NEW_VERSION"

# Set Apple credentials
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"
export GITHUB_TOKEN="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"

echo "🔐 Apple Credentials Set:"
echo "   Apple ID: $APPLE_ID"
echo "   Team ID: $APPLE_TEAM_ID"

# Verify signing identity
echo "🔍 Checking signing identity..."
SIGNING_IDENTITY="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
if security find-identity -v -p codesigning | grep -q "$SIGNING_IDENTITY"; then
    echo "✅ Signing identity found: $SIGNING_IDENTITY"
else
    echo "❌ Signing identity not found: $SIGNING_IDENTITY"
    echo "Please install the certificate and try again"
    exit 1
fi

# Build web application
echo "🏗️ Building web application..."
npm run build

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf build

# Build desktop application with signing and notarization
echo "🔨 Building desktop application (signed & notarized)..."
echo "This may take several minutes for notarization..."

npx electron-builder --mac --publish=never

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if DMG files were created
INTEL_DMG="dist/Ebdaa Work Time-$NEW_VERSION.dmg"
ARM64_DMG="dist/Ebdaa Work Time-$NEW_VERSION-arm64.dmg"

if [[ ! -f "$INTEL_DMG" ]]; then
    echo "❌ Intel DMG not found: $INTEL_DMG"
    exit 1
fi

if [[ ! -f "$ARM64_DMG" ]]; then
    echo "❌ ARM64 DMG not found: $ARM64_DMG"
    exit 1
fi

# Generate file information for auto-updater
echo "📊 Generating file information..."
ls -la "dist/Ebdaa Work Time-$NEW_VERSION"*.dmg

# Get SHA512 hashes
INTEL_SHA512=$(shasum -a 512 "$INTEL_DMG" | cut -d' ' -f1)
ARM64_SHA512=$(shasum -a 512 "$ARM64_DMG" | cut -d' ' -f1)

# Get file sizes
INTEL_SIZE=$(stat -f%z "$INTEL_DMG")
ARM64_SIZE=$(stat -f%z "$ARM64_DMG")

echo "📋 File Information:"
echo "   Intel DMG: $INTEL_SIZE bytes, SHA512: $INTEL_SHA512"
echo "   ARM64 DMG: $ARM64_SIZE bytes, SHA512: $ARM64_SHA512"

# Update latest-mac.yml
echo "📝 Updating latest-mac.yml..."
cat > latest-mac.yml << EOF
version: $NEW_VERSION
files:
  - url: TimeFlow-v$NEW_VERSION-Intel.dmg
    sha512: $INTEL_SHA512
    size: $INTEL_SIZE
  - url: TimeFlow-v$NEW_VERSION-ARM64.dmg
    sha512: $ARM64_SHA512
    size: $ARM64_SIZE
path: TimeFlow-v$NEW_VERSION-Intel.dmg
sha512: $INTEL_SHA512
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF

echo "✅ latest-mac.yml updated"

# Copy files to public downloads (for web access)
echo "📂 Copying files to public downloads..."
mkdir -p public/downloads
cp "$INTEL_DMG" "public/downloads/TimeFlow-v$NEW_VERSION-Intel.dmg"
cp "$ARM64_DMG" "public/downloads/TimeFlow-v$NEW_VERSION-ARM64.dmg"

# Create GitHub release
echo "🐙 Creating GitHub release..."
if command -v gh &> /dev/null; then
    # Create release notes
    RELEASE_NOTES="## TimeFlow v$NEW_VERSION

### 🚀 New Features
- Enhanced system monitoring and tracking
- Improved auto-update mechanism
- Better cross-platform compatibility

### 🐛 Bug Fixes
- Fixed memory leak issues
- Improved permission handling
- Enhanced screenshot capture reliability

### 📱 Downloads
- **macOS (Apple Silicon)**: TimeFlow-v$NEW_VERSION-ARM64.dmg
- **macOS (Intel)**: TimeFlow-v$NEW_VERSION-Intel.dmg
- **Windows**: TimeFlow-v$NEW_VERSION-Setup.exe (Coming Soon)
- **Linux**: TimeFlow-v$NEW_VERSION-Linux.AppImage (Coming Soon)

### 🔐 Security
- All macOS builds are code signed and notarized
- Enterprise-grade security features

### ⚙️ Auto-Update
Existing users will be automatically notified of this update."

    gh release create "v$NEW_VERSION" \
        "$INTEL_DMG" \
        "$ARM64_DMG" \
        latest-mac.yml \
        --title "TimeFlow v$NEW_VERSION - Enhanced Monitoring & Auto-Updates" \
        --notes "$RELEASE_NOTES" \
        --target main

    if [ $? -eq 0 ]; then
        echo "✅ GitHub release created successfully!"
        echo "🔗 Release URL: https://github.com/mafatah/time-flow-admin/releases/tag/v$NEW_VERSION"
    else
        echo "❌ Failed to create GitHub release"
        exit 1
    fi
else
    echo "❌ GitHub CLI not found. Please install gh CLI first."
    exit 1
fi

# Commit and push changes
echo "📤 Committing and pushing changes..."
git add -A
git commit -m "🚀 Release v$NEW_VERSION - Enhanced monitoring with signed & notarized binaries

- Updated version to $NEW_VERSION
- Enhanced system monitoring and tracking
- Improved auto-update mechanism  
- All macOS builds are code signed and notarized
- Fixed memory leak issues
- Improved permission handling
- Enhanced screenshot capture reliability"

git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Changes pushed to main branch"
    echo "🌐 Vercel will automatically deploy the web updates"
else
    echo "❌ Failed to push changes"
    exit 1
fi

# Verification steps
echo "🔍 Performing verification..."
echo "================================"

# Check GitHub release
echo "📦 GitHub Release: https://github.com/mafatah/time-flow-admin/releases/tag/v$NEW_VERSION"

# Check auto-update config
echo "⚙️ Auto-update config: https://github.com/mafatah/time-flow-admin/releases/download/v$NEW_VERSION/latest-mac.yml"

# Check web deployment
echo "🌐 Web app: https://time-flow-admin.vercel.app/download"

echo ""
echo "✅ Release v$NEW_VERSION completed successfully!"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo "1. Verify the GitHub release contains all files"
echo "2. Test the download links work correctly"
echo "3. Verify existing users see the update notification"
echo "4. Test the installation process on a clean machine"
echo ""
echo "🎉 TimeFlow v$NEW_VERSION is now live!" 