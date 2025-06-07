#!/bin/bash

echo "🎯 Final Notarization Fix - ShipIt Binary"
echo "========================================"

# Configuration
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-final-notarized.zip"

echo "📋 Fixing the specific issue Apple identified:"
echo "   Squirrel.framework/Resources/ShipIt is not signed"
echo ""

# Clean up any previous attempts
rm -rf "$APP_NAME" "$ZIP_FILE"

# Extract app
echo "📦 Extracting app from DMG..."
hdiutil attach "$DMG_FILE" -mountpoint /tmp/final_fix_mount -quiet
cp -R "/tmp/final_fix_mount/$APP_NAME" ./
hdiutil detach /tmp/final_fix_mount -quiet
echo "✅ App extracted"

# Create entitlements
echo "📝 Creating entitlements..."
cat > final-entitlements.plist << 'EOF'
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

# Specifically target the problematic ShipIt binary
SHIPIT_BINARY="$APP_NAME/Contents/Frameworks/Squirrel.framework/Versions/A/Resources/ShipIt"

echo ""
echo "🎯 Targeting the specific ShipIt binary..."
echo "File: $SHIPIT_BINARY"

if [ -f "$SHIPIT_BINARY" ]; then
    echo "✅ Found ShipIt binary"
    
    # Check current signature
    echo "🔍 Current signature status:"
    codesign -dv "$SHIPIT_BINARY" 2>&1 || echo "   Not signed"
    
    # Sign the ShipIt binary specifically
    echo ""
    echo "🔐 Signing ShipIt binary..."
    codesign --remove-signature "$SHIPIT_BINARY" 2>/dev/null || true
    codesign --force --options runtime \
        --sign "$CERT_NAME" \
        --timestamp \
        "$SHIPIT_BINARY"
    
    if [ $? -eq 0 ]; then
        echo "✅ ShipIt binary signed successfully"
        
        # Verify the ShipIt signature
        echo "🔍 Verifying ShipIt signature..."
        codesign --verify --verbose "$SHIPIT_BINARY"
        
        if [ $? -eq 0 ]; then
            echo "✅ ShipIt signature verification passed"
            
            # Re-sign the Squirrel framework
            echo ""
            echo "🔐 Re-signing Squirrel framework..."
            SQUIRREL_FRAMEWORK="$APP_NAME/Contents/Frameworks/Squirrel.framework"
            codesign --force --options runtime \
                --sign "$CERT_NAME" \
                --timestamp \
                "$SQUIRREL_FRAMEWORK"
            
            if [ $? -eq 0 ]; then
                echo "✅ Squirrel framework re-signed"
                
                # Re-sign the main app
                echo ""
                echo "🔐 Re-signing main app..."
                codesign --force --options runtime \
                    --entitlements final-entitlements.plist \
                    --sign "$CERT_NAME" \
                    --timestamp \
                    "$APP_NAME"
                
                if [ $? -eq 0 ]; then
                    echo "✅ Main app re-signed"
                    
                    # Final verification
                    echo ""
                    echo "🔍 Final verification..."
                    codesign --verify --verbose --deep "$APP_NAME"
                    
                    if [ $? -eq 0 ]; then
                        echo "✅ Complete signature verification passed!"
                        
                        # Create ZIP for notarization
                        echo ""
                        echo "📁 Creating final ZIP..."
                        ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"
                        echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
                        
                        echo ""
                        echo "🎉 Ready for final notarization attempt!"
                        echo "======================================"
                        echo "All issues fixed:"
                        echo "✅ ShipIt binary properly signed"
                        echo "✅ Squirrel framework re-signed"
                        echo "✅ Main app re-signed"
                        echo "✅ Deep verification passed"
                        echo ""
                        echo "🚀 Run this to submit:"
                        echo "xcrun notarytool submit $ZIP_FILE \\"
                        echo "  --apple-id alshqawe66@gmail.com \\"
                        echo "  --team-id 6GW49LK9V9 \\"
                        echo "  --password [YOUR_APP_SPECIFIC_PASSWORD] \\"
                        echo "  --wait"
                        
                    else
                        echo "❌ Final verification failed"
                    fi
                else
                    echo "❌ Main app signing failed"
                fi
            else
                echo "❌ Squirrel framework signing failed"
            fi
        else
            echo "❌ ShipIt signature verification failed"
        fi
    else
        echo "❌ ShipIt signing failed"
    fi
else
    echo "❌ ShipIt binary not found at: $SHIPIT_BINARY"
    echo "🔍 Searching for ShipIt..."
    find "$APP_NAME" -name "ShipIt" -type f
fi

# Cleanup
rm -f final-entitlements.plist

echo ""
echo "🎯 This should be the final fix needed for notarization!" 