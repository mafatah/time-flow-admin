#!/bin/bash

# Update Downloads Script
# Copies the latest built desktop apps to the public downloads folder

echo "🔄 Updating public downloads with latest desktop app builds..."

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found. Please build the desktop apps first with:"
    echo "   npm run build:desktop"
    exit 1
fi

# Create public/downloads if it doesn't exist
mkdir -p public/downloads

# Copy the latest builds
echo "📁 Copying desktop app files..."

# Windows EXE
if [ -f "dist/TimeFlow-Setup.exe" ]; then
    cp "dist/TimeFlow-Setup.exe" "public/downloads/"
    echo "✅ Windows: TimeFlow-Setup.exe ($(du -h 'dist/TimeFlow-Setup.exe' | cut -f1))"
fi

# macOS Intel DMG
if [ -f "dist/TimeFlow-Intel.dmg" ]; then
    cp "dist/TimeFlow-Intel.dmg" "public/downloads/"
    echo "✅ macOS Intel: TimeFlow-Intel.dmg ($(du -h 'dist/TimeFlow-Intel.dmg' | cut -f1))"
fi

# macOS ARM DMG
if [ -f "dist/TimeFlow-ARM.dmg" ]; then
    cp "dist/TimeFlow-ARM.dmg" "public/downloads/"
    echo "✅ macOS ARM: TimeFlow-ARM.dmg ($(du -h 'dist/TimeFlow-ARM.dmg' | cut -f1))"
fi

# Linux AppImage
if [ -f "dist/TimeFlow.AppImage" ]; then
    cp "dist/TimeFlow.AppImage" "public/downloads/"
    echo "✅ Linux: TimeFlow.AppImage ($(du -h 'dist/TimeFlow.AppImage' | cut -f1))"
fi

echo ""
echo "🎉 Downloads updated successfully!"
echo "📁 Files available at: http://localhost:8081/downloads/"
echo ""
echo "Files now accessible via:"
echo "• Windows: http://localhost:8081/downloads/TimeFlow-Setup.exe"
echo "• macOS Intel: http://localhost:8081/downloads/TimeFlow-Intel.dmg"
echo "• macOS ARM: http://localhost:8081/downloads/TimeFlow-ARM.dmg"
echo "• Linux: http://localhost:8081/downloads/TimeFlow.AppImage"
echo ""
echo "💡 Users can now download directly from the web interface without login!" 