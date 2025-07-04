#!/bin/bash
set -e

# 🧪 Test Build Script for v1.0.40
# This script tests the build process without creating a release

echo "🧪 Testing TimeFlow v1.0.40 Build Process..."

# Apple Credentials for Signing & Notarization
export APPLE_ID="${APPLE_ID}"
export APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD}"
export APPLE_TEAM_ID="6GW49LK9V9"
export CSC_IDENTITY="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

echo "🔧 Environment Configuration:"
echo "  Apple ID: $APPLE_ID"
echo "  Team ID: $APPLE_TEAM_ID"
echo "  Signing Identity: $CSC_IDENTITY"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if certificates are available
if ! security find-identity -v -p codesigning | grep -q "6GW49LK9V9"; then
    echo "❌ Error: Developer ID certificate not found in Keychain!"
    echo "Please install the certificate: CertificateSigningRequest.certSigningRequest"
    exit 1
fi

echo "✅ Developer ID certificate found"

# Clean and build
echo "🧹 Cleaning previous builds..."
rm -rf dist

echo "🏗️ Building web application..."
npm run build

echo "🔐 Testing desktop build with signing & notarization..."
echo "⏳ This may take several minutes for notarization..."

# Build for macOS with signing and notarization
npx electron-builder --mac --publish=never

# Verify the files were created
echo "📁 Verifying built files..."
VERSION="1.0.40"

if [ ! -f "dist/Ebdaa Work Time-${VERSION}.dmg" ]; then
    echo "❌ Error: Intel DMG not found!"
    exit 1
fi

if [ ! -f "dist/Ebdaa Work Time-${VERSION}-arm64.dmg" ]; then
    echo "❌ Error: ARM64 DMG not found!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Test signature verification
echo "🔐 Testing signature verification..."

# Extract the app from DMG for testing (mount it)
hdiutil attach "dist/Ebdaa Work Time-${VERSION}.dmg" -mountpoint /tmp/timeflow-test-mount -quiet

if [ -d "/tmp/timeflow-test-mount/Ebdaa Work Time.app" ]; then
    echo "🔍 Verifying app signature..."
    codesign -v -v "/tmp/timeflow-test-mount/Ebdaa Work Time.app"
    
    echo "🔍 Checking notarization..."
    spctl -a -v "/tmp/timeflow-test-mount/Ebdaa Work Time.app"
    
    echo "✅ Signature and notarization verification passed!"
else
    echo "❌ Could not find app in mounted DMG"
fi

# Cleanup
hdiutil detach /tmp/timeflow-test-mount -quiet

# Display file information
echo ""
echo "📊 Build Results:"
echo "===================="

for file in "dist/Ebdaa Work Time-${VERSION}.dmg" "dist/Ebdaa Work Time-${VERSION}-arm64.dmg"; do
    if [ -f "$file" ]; then
        SIZE=$(stat -f%z "$file")
        SHA512=$(shasum -a 512 "$file" | cut -d' ' -f1)
        echo "📁 $(basename "$file")"
        echo "   Size: ${SIZE} bytes"
        echo "   SHA512: ${SHA512}"
        echo ""
    fi
done

echo "🎉 Test build completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "  1. Test the DMG files on a clean macOS system"
echo "  2. Verify no security warnings appear"
echo "  3. If everything works, run the full release script:"
echo "     ./scripts/complete-release-v1.0.40.sh" 