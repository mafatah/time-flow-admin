#!/bin/bash

echo "🔧 Fixing Electron Binary Signing Issues"
echo "======================================="

# Configuration
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
FINAL_DMG="TimeFlow-ElectronFixed.dmg"
ZIP_FILE="TimeFlow-electron-fixed.zip"

echo "📋 Plan:"
echo "  1. Extract app from DMG"
echo "  2. Find and sign ALL unsigned binaries (including active-win/main)"
echo "  3. Sign with proper hardened runtime"
echo "  4. Create final notarized DMG"
echo ""

# Extract app
echo "📦 Extracting app from DMG..."
rm -rf "$APP_NAME"
hdiutil attach "$DMG_FILE" -mountpoint /tmp/electron_mount -quiet
cp -R "/tmp/electron_mount/$APP_NAME" ./
hdiutil detach /tmp/electron_mount -quiet
echo "✅ App extracted"

# Create comprehensive entitlements for Electron
echo "📝 Creating Electron-specific entitlements..."
cat > electron-entitlements.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Required for Electron apps -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    
    <!-- Network access -->
    <key>com.apple.security.network.client</key>
    <true/>
    
    <!-- File access -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    
    <!-- For time tracking -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
EOF

echo "🔍 Finding ALL unsigned binaries in the app..."
echo "---------------------------------------------"

# Find the problematic active-win binary specifically
ACTIVE_WIN_BINARY="$APP_NAME/Contents/Resources/app.asar.unpacked/node_modules/active-win/main"

if [ -f "$ACTIVE_WIN_BINARY" ]; then
    echo "✅ Found active-win binary: $ACTIVE_WIN_BINARY"
    
    # Check if it's signed
    codesign -dv "$ACTIVE_WIN_BINARY" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Active-win binary is NOT signed (as Apple reported)"
    else
        echo "⚠️  Active-win binary is signed but may have issues"
    fi
else
    echo "❌ Active-win binary not found!"
    echo "🔍 Searching for all binaries in app.asar.unpacked..."
    find "$APP_NAME/Contents/Resources/app.asar.unpacked" -type f -perm +111 2>/dev/null | head -10
fi

# Find ALL executable files that need signing
echo ""
echo "🔍 Finding all executable files..."
ALL_BINARIES=$(find "$APP_NAME" -type f -perm +111 -exec file {} \; | grep -E "(Mach-O|executable)" | cut -d: -f1)

echo "📋 Found these binaries to sign:"
echo "$ALL_BINARIES" | head -20

# Strip ALL existing signatures first
echo ""
echo "🧹 Stripping existing signatures from ALL binaries..."
echo "$ALL_BINARIES" | while read binary; do
    if [ -f "$binary" ]; then
        codesign --remove-signature "$binary" 2>/dev/null || true
        echo "  Stripped: $(basename "$binary")"
    fi
done

# Sign ALL binaries with hardened runtime
echo ""
echo "🔐 Signing ALL binaries with hardened runtime..."
echo "$ALL_BINARIES" | while read binary; do
    if [ -f "$binary" ]; then
        echo "  Signing: $(basename "$binary")"
        codesign --force --options runtime \
            --sign "$CERT_NAME" \
            --timestamp \
            "$binary" 2>/dev/null || echo "    ❌ Failed to sign $binary"
    fi
done

# Sign frameworks and dylibs
echo ""
echo "🔐 Signing frameworks and libraries..."
find "$APP_NAME" -name "*.framework" -o -name "*.dylib" | while read framework; do
    echo "  Signing: $(basename "$framework")"
    codesign --force --options runtime \
        --sign "$CERT_NAME" \
        --timestamp \
        "$framework" 2>/dev/null || echo "    ❌ Failed to sign $framework"
done

# Finally sign the main app with entitlements
echo ""
echo "🔐 Signing main app with Electron entitlements..."
codesign --force --options runtime \
    --entitlements electron-entitlements.plist \
    --sign "$CERT_NAME" \
    --timestamp \
    "$APP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Main app signed successfully"
    
    # Verify the signature
    echo ""
    echo "🔍 Verifying complete signature..."
    codesign --verify --verbose --deep "$APP_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✅ Deep signature verification passed!"
        
        # Specifically check the active-win binary
        echo ""
        echo "🔍 Checking active-win binary specifically..."
        if [ -f "$ACTIVE_WIN_BINARY" ]; then
            codesign -dv "$ACTIVE_WIN_BINARY"
            if [ $? -eq 0 ]; then
                echo "✅ Active-win binary is now properly signed!"
            else
                echo "❌ Active-win binary still has issues"
            fi
        fi
        
        # Create ZIP for notarization
        echo ""
        echo "📁 Creating ZIP for notarization..."
        rm -f "$ZIP_FILE"
        ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"
        echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
        
        echo ""
        echo "🚀 Ready for notarization!"
        echo "   All binaries should now be properly signed"
        echo ""
        echo "📋 To submit for notarization, run:"
        echo "   xcrun notarytool submit $ZIP_FILE --apple-id alshqawe66@gmail.com --team-id 6GW49LK9V9 --password [your-password] --wait"
        
    else
        echo "❌ Signature verification failed"
    fi
else
    echo "❌ Main app signing failed"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f electron-entitlements.plist

echo ""
echo "🎯 Next Steps:"
echo "   1. If verification passed, the app should now pass notarization"
echo "   2. The active-win binary issue should be resolved"
echo "   3. Submit the ZIP file for notarization" 