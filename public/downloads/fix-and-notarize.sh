#!/bin/bash

echo "🔧 Fix App Entitlements & Re-Notarize"
echo "===================================="

# Configuration
APPLE_ID="alshqawe66@gmail.com"
TEAM_ID="6GW49LK9V9"
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
ENTITLEMENTS_FILE="entitlements.plist"

# Files
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-notarization-fixed.zip"
FIXED_DMG="TimeFlow-NotarizedFixed.dmg"

echo "🎯 Plan:"
echo "   1. Extract app from DMG"
echo "   2. Re-sign with proper entitlements"
echo "   3. Submit for notarization"
echo "   4. Create new DMG if successful"
echo ""

# Check files exist
for file in "$DMG_FILE" "$ENTITLEMENTS_FILE"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing file: $file"
        exit 1
    fi
done

# Get password
echo "🔐 Enter your app-specific password:"
read -s -p "Password: " APP_PASSWORD
echo ""
echo ""

# Extract app
echo "📦 Extracting app from DMG..."
rm -rf "$APP_NAME"
hdiutil attach "$DMG_FILE" -mountpoint /tmp/fix_mount -quiet
cp -R "/tmp/fix_mount/$APP_NAME" ./
hdiutil detach /tmp/fix_mount -quiet
echo "✅ App extracted"

# Re-sign with entitlements
echo ""
echo "🔐 Re-signing app with proper entitlements..."
echo "   Entitlements file: $ENTITLEMENTS_FILE"

# Sign all internal components first
find "$APP_NAME" -type f \( -name "*.dylib" -o -name "*.framework" \) -exec \
    codesign --force --options runtime --entitlements "$ENTITLEMENTS_FILE" --sign "$CERT_NAME" {} \; 2>/dev/null

# Sign the main executable
codesign --force --options runtime --entitlements "$ENTITLEMENTS_FILE" --sign "$CERT_NAME" "$APP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ App re-signed successfully"
    
    # Verify entitlements were applied
    echo "🔍 Verifying entitlements..."
    codesign -d --entitlements - "$APP_NAME" | grep -q "com.apple.security"
    
    if [ $? -eq 0 ]; then
        echo "✅ Entitlements applied correctly"
        
        # Create ZIP for notarization
        echo ""
        echo "📁 Creating ZIP for notarization..."
        rm -f "$ZIP_FILE"
        ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"
        echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
        
        # Submit for notarization
        echo ""
        echo "🚀 Submitting for notarization (attempt #2)..."
        echo "   This time with proper entitlements!"
        
        xcrun notarytool submit "$ZIP_FILE" \
            --apple-id "$APPLE_ID" \
            --password "$APP_PASSWORD" \
            --team-id "$TEAM_ID" \
            --wait \
            --timeout 15m
        
        RESULT=$?
        
        if [ $RESULT -eq 0 ]; then
            echo ""
            echo "🎉 NOTARIZATION SUCCESSFUL!"
            
            # Staple the ticket
            echo "📎 Stapling notarization ticket..."
            xcrun stapler staple "$APP_NAME"
            
            if [ $? -eq 0 ]; then
                echo "✅ Stapling successful!"
                
                # Create final DMG
                echo ""
                echo "💿 Creating final notarized DMG..."
                rm -f "$FIXED_DMG"
                
                mkdir -p temp_final
                cp -R "$APP_NAME" temp_final/
                ln -s /Applications temp_final/Applications
                
                hdiutil create -volname "Install Ebdaa Work Time" \
                    -srcfolder temp_final \
                    -ov -format UDZO \
                    "$FIXED_DMG" -quiet
                
                rm -rf temp_final
                
                # Sign the DMG
                codesign --force --sign "$CERT_NAME" "$FIXED_DMG"
                
                echo ""
                echo "🎉 SUCCESS! Final notarized DMG created!"
                echo "📋 File: $FIXED_DMG"
                echo "📊 Size: $(ls -lh "$FIXED_DMG" | awk '{print $5}')"
                echo ""
                echo "🧪 Final verification:"
                spctl --assess --type open --context context:primary-signature "$FIXED_DMG"
                echo ""
                echo "✅ This DMG will install with ZERO security warnings!"
                
            else
                echo "❌ Stapling failed, but app is notarized"
            fi
        else
            echo ""
            echo "❌ Notarization failed again"
            echo "💡 The app may have other issues that need investigation"
        fi
    else
        echo "❌ Failed to apply entitlements"
    fi
else
    echo "❌ Re-signing failed"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f "$ZIP_FILE"
rm -rf "$APP_NAME"

if [ -f "$FIXED_DMG" ]; then
    echo ""
    echo "🎯 DONE! Upload $FIXED_DMG to GitHub releases"
else
    echo ""
    echo "❌ Process failed - check errors above"
fi 