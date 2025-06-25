#!/bin/bash
set -e

# 🚀 Cross-Platform Build Script for Windows and Linux
# This script builds Windows EXE and Linux AppImage versions

echo "🚀 Building TimeFlow for Windows and Linux..."
echo "=============================================="

# Configuration
NEW_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
echo "📦 Version: v$NEW_VERSION"

# Build web application first
echo "🏗️ Building web application..."
npm run build

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf build

# Build desktop application files
echo "🔨 Building desktop application files..."
npm run build:all

# Build Windows and Linux versions
echo "🪟 Building Windows version..."
npx electron-builder --win --publish=never

echo "🐧 Building Linux version..."
npx electron-builder --linux --publish=never

echo "✅ Cross-platform build completed!"

# Show results
echo "📊 Build Results:"
echo "=================="
ls -la dist/

# Generate file information
echo "📋 File Information:"
echo "===================="

if [ -f "dist/TimeFlow-v$NEW_VERSION-Setup.exe" ]; then
    WINDOWS_SIZE=$(stat -f%z "dist/TimeFlow-v$NEW_VERSION-Setup.exe")
    WINDOWS_SHA512=$(shasum -a 512 "dist/TimeFlow-v$NEW_VERSION-Setup.exe" | cut -d' ' -f1)
    echo "Windows EXE: $WINDOWS_SIZE bytes, SHA512: $WINDOWS_SHA512"
fi

if [ -f "dist/TimeFlow-v$NEW_VERSION-Linux.AppImage" ]; then
    LINUX_SIZE=$(stat -f%z "dist/TimeFlow-v$NEW_VERSION-Linux.AppImage")
    LINUX_SHA512=$(shasum -a 512 "dist/TimeFlow-v$NEW_VERSION-Linux.AppImage" | cut -d' ' -f1)
    echo "Linux AppImage: $LINUX_SIZE bytes, SHA512: $LINUX_SHA512"
fi

echo "🎉 Cross-platform build complete!" 