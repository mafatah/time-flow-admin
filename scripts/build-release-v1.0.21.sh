#!/bin/bash

echo "🚀 Building TimeFlow v1.0.21 with environment variable fix..."

# Set environment variables
export NODE_ENV=production
export NOTARIZE=false

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/

# Fix desktop environment variables first
echo "🔧 Applying desktop environment variable fix..."
node scripts/fix-desktop-env.cjs

# Build web application
echo "📦 Building web application..."
npm run build || exit 1
echo "✅ Web application built successfully"

# Build all components
echo "🔧 Building all components..."
npm run build:all || exit 1
echo "✅ All components built successfully"

# Build unsigned apps for all platforms (faster)
echo "🏗️ Building unsigned electron apps..."
npx electron-builder --mac --win --linux --config.mac.identity=null --config.mac.notarize=false --publish=never || exit 1

echo ""
echo "✅ Build completed successfully!"
echo "📁 Built files are in the dist/ directory"

# List built files with sizes
echo ""
echo "📋 Built files:"
cd dist
ls -lh *.dmg *.exe *.AppImage 2>/dev/null | while read -r line; do
    if [[ $line == *".dmg"* ]] || [[ $line == *".exe"* ]] || [[ $line == *".AppImage"* ]]; then
        filename=$(echo $line | awk '{print $NF}')
        size=$(echo $line | awk '{print $5}')
        echo "   $filename ($size)"
    fi
done
cd ..

echo ""
echo "🔐 Next steps for signing and notarization:"
echo "1. Sign macOS DMGs:"
echo "   codesign --force --verify --verbose --sign 'Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)' dist/*.dmg"
echo ""
echo "2. Submit for notarization:"
echo "   xcrun notarytool submit dist/TimeFlow-v1.0.21-ARM64.dmg --keychain-profile 'notarytool-profile' --wait"
echo "   xcrun notarytool submit dist/TimeFlow-v1.0.21-Intel.dmg --keychain-profile 'notarytool-profile' --wait"
echo ""
echo "3. Staple notarization:"
echo "   xcrun stapler staple dist/TimeFlow-v1.0.21-ARM64.dmg"
echo "   xcrun stapler staple dist/TimeFlow-v1.0.21-Intel.dmg"
echo ""
echo "4. Create GitHub release with all files" 