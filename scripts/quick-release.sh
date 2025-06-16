#!/bin/bash

# Quick Release Script for TimeFlow
# For testing and local builds

set -e

echo "🚀 TimeFlow Quick Release"
echo "========================"

# Get current version and increment
CURRENT_VERSION=$(node -p "require('./package.json').version")
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
PATCH=$((${VERSION_PARTS[2]} + 1))
NEW_VERSION="${VERSION_PARTS[0]}.${VERSION_PARTS[1]}.$PATCH"

echo "📦 Version: $CURRENT_VERSION → $NEW_VERSION"

# Update version
npm version $NEW_VERSION --no-git-tag-version

# Build everything
echo "🔨 Building application..."
npm run build:all

# Build signed releases
echo "🏗️ Building signed releases..."
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_ID_PASSWORD="icmi-tdzi-ydvi-lszi" 
export APPLE_TEAM_ID="6GW49LK9V9"

npx electron-builder --mac --win --publish=never

# Copy to root for easy access
echo "📁 Copying files to root..."
cp dist/*.dmg "./TimeFlow-v$NEW_VERSION-Test.dmg" 2>/dev/null || true
cp dist/*.exe "./TimeFlow-v$NEW_VERSION-Test.exe" 2>/dev/null || true

echo "✅ Quick release complete!"
echo "Files available:"
ls -la TimeFlow-v$NEW_VERSION-Test.* 