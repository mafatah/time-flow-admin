#!/bin/bash

# Build, Sign, Notarize and Release Script for macOS
# This script will build the app, sign it, notarize it, and upload to GitHub releases

set -e

echo "🚀 Starting build and release process..."

# Set environment variables for notarization
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="aejg-aqwt-ryfs-ntuf"
export APPLE_TEAM_ID="6GW49LK9V9"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/electron/
rm -rf build/dist/

# Build the app components
echo "📦 Building application components..."
npm run build:all

# Build and sign the Electron app with notarization
echo "🔨 Building and signing Electron app..."
npm run electron:build

# Check if the builds were successful
if [ ! -f "dist/Ebdaa Work Time-1.0.13-arm64.dmg" ] || [ ! -f "dist/Ebdaa Work Time-1.0.13.dmg" ]; then
    echo "❌ Build failed - DMG files not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📱 ARM64 DMG: dist/Ebdaa Work Time-1.0.13-arm64.dmg"
echo "💻 Intel DMG: dist/Ebdaa Work Time-1.0.13.dmg"

# Get the current version from package.json
VERSION=$(node -p "require('./package.json').version")
echo "📋 Version: $VERSION"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub CLI:"
    gh auth login
fi

# Create GitHub release
echo "🌟 Creating GitHub release..."
RELEASE_TAG="v$VERSION"
RELEASE_TITLE="Ebdaa Work Time v$VERSION"

# Check if release already exists
if gh release view "$RELEASE_TAG" &> /dev/null; then
    echo "📋 Release $RELEASE_TAG already exists. Deleting assets and uploading new ones..."
    gh release delete-asset "$RELEASE_TAG" "Ebdaa-Work-Time-$VERSION-arm64.dmg" --yes || true
    gh release delete-asset "$RELEASE_TAG" "Ebdaa-Work-Time-$VERSION-intel.dmg" --yes || true
    gh release delete-asset "$RELEASE_TAG" "latest-mac.yml" --yes || true
else
    echo "📋 Creating new release $RELEASE_TAG..."
    gh release create "$RELEASE_TAG" \
        --title "$RELEASE_TITLE" \
        --notes "Release $VERSION - Signed and notarized macOS application

        ## Changes in this release:
        - Code-signed and notarized macOS application
        - Support for both Intel and Apple Silicon Macs
        - Enhanced security and compatibility

        ## Installation:
        1. Download the appropriate DMG file for your Mac
        2. Open the DMG file
        3. Drag the app to Applications folder
        4. The app is notarized and will run without security warnings

        ## Downloads:
        - **Apple Silicon (M1/M2/M3)**: Ebdaa-Work-Time-$VERSION-arm64.dmg
        - **Intel Macs**: Ebdaa-Work-Time-$VERSION-intel.dmg"
fi

# Upload assets
echo "📤 Uploading release assets..."

# Rename files for cleaner download names
cp "dist/Ebdaa Work Time-$VERSION-arm64.dmg" "Ebdaa-Work-Time-$VERSION-arm64.dmg"
cp "dist/Ebdaa Work Time-$VERSION.dmg" "Ebdaa-Work-Time-$VERSION-intel.dmg"

# Upload the DMG files
gh release upload "$RELEASE_TAG" "Ebdaa-Work-Time-$VERSION-arm64.dmg" --clobber
gh release upload "$RELEASE_TAG" "Ebdaa-Work-Time-$VERSION-intel.dmg" --clobber

# Upload update configuration file if it exists
if [ -f "dist/latest-mac.yml" ]; then
    gh release upload "$RELEASE_TAG" "dist/latest-mac.yml" --clobber
    echo "📋 Uploaded auto-update configuration"
fi

# Clean up renamed files
rm -f "Ebdaa-Work-Time-$VERSION-arm64.dmg"
rm -f "Ebdaa-Work-Time-$VERSION-intel.dmg"

echo "🎉 Release completed successfully!"
echo "🔗 Release URL: https://github.com/mafatah/time-flow-admin/releases/tag/$RELEASE_TAG"
echo ""
echo "📱 Users can now download:"
echo "   - Apple Silicon: Ebdaa-Work-Time-$VERSION-arm64.dmg"
echo "   - Intel: Ebdaa-Work-Time-$VERSION-intel.dmg" 