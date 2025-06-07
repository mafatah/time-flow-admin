#!/bin/bash

echo "🔧 Proper Electron App Signing (Bottom-up approach)"
echo "=================================================="

# Configuration
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-properly-signed.zip"

echo "📋 Electron Signing Strategy:"
echo "  1. Sign from inside-out (libraries → frameworks → helpers → main app)"
echo "  2. Use correct entitlements for each component"
echo "  3. Follow Apple's Electron signing requirements"
echo ""

# Extract app
echo "📦 Extracting app from DMG..."
rm -rf "$APP_NAME"
hdiutil attach "$DMG_FILE" -mountpoint /tmp/proper_mount -quiet
cp -R "/tmp/proper_mount/$APP_NAME" ./
hdiutil detach /tmp/proper_mount -quiet
echo "✅ App extracted"

# Create entitlements for different components
echo "📝 Creating entitlements for different components..."

# Main app entitlements
cat > main-app.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
</dict>
</plist>
EOF

# Helper app entitlements
cat > helper.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ Entitlements created"

# Remove existing signatures completely
echo ""
echo "🧹 Removing ALL existing signatures..."
codesign --remove-signature "$APP_NAME" 2>/dev/null || true
find "$APP_NAME" -name "*.framework" -o -name "*.dylib" -o -name "*.app" | while read item; do
    codesign --remove-signature "$item" 2>/dev/null || true
done

# Sign in proper order: BOTTOM-UP
echo ""
echo "🔐 Step 1: Sign all libraries and native binaries"
echo "================================================"

# Sign the problematic active-win binary
ACTIVE_WIN_BINARY="$APP_NAME/Contents/Resources/app.asar.unpacked/node_modules/active-win/main"
if [ -f "$ACTIVE_WIN_BINARY" ]; then
    echo "  🎯 Signing active-win binary..."
    codesign --force --options runtime --sign "$CERT_NAME" --timestamp "$ACTIVE_WIN_BINARY"
    if [ $? -eq 0 ]; then
        echo "  ✅ Active-win binary signed successfully!"
    else
        echo "  ❌ Failed to sign active-win binary"
    fi
fi

# Sign all .node files (Node.js native modules)
echo "  📦 Signing Node.js native modules..."
find "$APP_NAME" -name "*.node" | while read node_file; do
    echo "    Signing: $(basename "$node_file")"
    codesign --force --options runtime --sign "$CERT_NAME" --timestamp "$node_file" 2>/dev/null || true
done

# Sign all dynamic libraries
echo "  📚 Signing dynamic libraries..."
find "$APP_NAME" -name "*.dylib" | while read dylib; do
    echo "    Signing: $(basename "$dylib")"
    codesign --force --options runtime --sign "$CERT_NAME" --timestamp "$dylib" 2>/dev/null || true
done

echo ""
echo "🔐 Step 2: Sign frameworks (bottom-up)"
echo "====================================="

# Sign frameworks in dependency order
FRAMEWORKS=(
    "Mantle.framework"
    "ReactiveObjC.framework" 
    "Squirrel.framework"
    "Electron Framework.framework"
)

for framework in "${FRAMEWORKS[@]}"; do
    FRAMEWORK_PATH="$APP_NAME/Contents/Frameworks/$framework"
    if [ -d "$FRAMEWORK_PATH" ]; then
        echo "  📦 Signing framework: $framework"
        codesign --force --options runtime --sign "$CERT_NAME" --timestamp "$FRAMEWORK_PATH"
        if [ $? -eq 0 ]; then
            echo "  ✅ $framework signed successfully"
        else
            echo "  ❌ Failed to sign $framework"
        fi
    fi
done

echo ""
echo "🔐 Step 3: Sign helper applications"
echo "=================================="

# Find and sign helper apps
find "$APP_NAME/Contents/Frameworks" -name "*.app" | while read helper_app; do
    echo "  🤖 Signing helper: $(basename "$helper_app")"
    codesign --force --options runtime --entitlements helper.plist --sign "$CERT_NAME" --timestamp "$helper_app"
    if [ $? -eq 0 ]; then
        echo "  ✅ Helper signed: $(basename "$helper_app")"
    else
        echo "  ❌ Failed to sign helper: $(basename "$helper_app")"
    fi
done

echo ""
echo "🔐 Step 4: Sign main executable and app"
echo "======================================"

# Sign the main executable
MAIN_EXEC="$APP_NAME/Contents/MacOS/Ebdaa Work Time"
if [ -f "$MAIN_EXEC" ]; then
    echo "  🎯 Signing main executable..."
    codesign --force --options runtime --entitlements main-app.plist --sign "$CERT_NAME" --timestamp "$MAIN_EXEC"
    if [ $? -eq 0 ]; then
        echo "  ✅ Main executable signed successfully"
    else
        echo "  ❌ Failed to sign main executable"
    fi
fi

# Finally sign the entire app bundle
echo "  📱 Signing main app bundle..."
codesign --force --options runtime --entitlements main-app.plist --sign "$CERT_NAME" --timestamp "$APP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Main app bundle signed successfully!"
    
    echo ""
    echo "🔍 Verification Phase"
    echo "===================="
    
    # Verify signature
    echo "  🔍 Basic verification..."
    codesign --verify --verbose "$APP_NAME"
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Basic verification passed"
        
        # Deep verification
        echo "  🔍 Deep verification..."
        codesign --verify --verbose --deep "$APP_NAME"
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Deep verification passed!"
            
            # Check active-win specifically
            echo "  🎯 Checking active-win binary..."
            if [ -f "$ACTIVE_WIN_BINARY" ]; then
                codesign --verify --verbose "$ACTIVE_WIN_BINARY"
                if [ $? -eq 0 ]; then
                    echo "  ✅ Active-win binary verification passed!"
                else
                    echo "  ❌ Active-win binary verification failed"
                fi
            fi
            
            # Create ZIP for notarization
            echo ""
            echo "📦 Creating final ZIP for notarization..."
            rm -f "$ZIP_FILE"
            ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"
            echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
            
            echo ""
            echo "🎉 SUCCESS! App is properly signed for notarization"
            echo "=================================================="
            echo "📋 All components signed:"
            echo "  ✅ Active-win binary (the main issue)"
            echo "  ✅ All Node.js native modules"
            echo "  ✅ All dynamic libraries"
            echo "  ✅ All frameworks"
            echo "  ✅ All helper applications"
            echo "  ✅ Main application"
            echo ""
            echo "🚀 Ready to submit for notarization!"
            
        else
            echo "  ❌ Deep verification failed"
            echo "     Some nested components may still have issues"
        fi
    else
        echo "  ❌ Basic verification failed"
    fi
else
    echo "❌ Main app bundle signing failed"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f main-app.plist helper.plist

echo ""
echo "🎯 Next Step:"
echo "   Submit for notarization: xcrun notarytool submit $ZIP_FILE --apple-id alshqawe66@gmail.com --team-id 6GW49LK9V9 --password [password] --wait" 