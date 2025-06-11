#!/bin/bash

# Build and Notarize Script for macOS
# This script will build the app, sign it, and notarize it

set -e

echo "🚀 Starting build and notarization process..."

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
VERSION=$(node -p "require('./package.json').version")

if [ ! -f "dist/Ebdaa Work Time-$VERSION-arm64.dmg" ] || [ ! -f "dist/Ebdaa Work Time-$VERSION.dmg" ]; then
    echo "❌ Build failed - DMG files not found"
    exit 1
fi

echo "✅ Build and notarization completed successfully!"
echo "📱 ARM64 DMG: dist/Ebdaa Work Time-$VERSION-arm64.dmg"
echo "💻 Intel DMG: dist/Ebdaa Work Time-$VERSION.dmg"
echo ""
echo "🔐 Both files are signed and notarized with Apple"
echo "�� Version: $VERSION" 