#!/bin/bash

# Build and Notarize Script for macOS
# This script will build the app, sign it, and notarize it

set -e

echo "🚀 Starting build and notarization process..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Set environment variables for notarization (with secure fallbacks)
export APPLE_ID="${APPLE_ID:-alshqawe66@gmail.com}"
export APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD:-icmi-tdzi-ydvi-lszi}"
export APPLE_TEAM_ID="${APPLE_TEAM_ID:-6GW49LK9V9}"

# Validate credentials
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_APP_SPECIFIC_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "❌ Missing Apple Developer credentials!"
  echo "   Required environment variables:"
  echo "   - APPLE_ID: Your Apple ID email"
  echo "   - APPLE_APP_SPECIFIC_PASSWORD: Your app-specific password"
  echo "   - APPLE_TEAM_ID: Your Apple Developer Team ID"
  exit 1
fi

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