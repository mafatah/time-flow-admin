#!/bin/bash

echo "🍎 Quick TimeFlow Notarization (Direct Method)"
echo "=============================================="

# Configuration
APPLE_ID="alshqawe66@gmail.com"
TEAM_ID="6GW49LK9V9"
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

# Files
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-notarization.zip"
NOTARIZED_DMG="TimeFlow-Notarized.dmg"

echo "📋 Using Apple ID: $APPLE_ID"
echo "📋 Team ID: $TEAM_ID"
echo ""

# Check if DMG exists
if [ ! -f "$DMG_FILE" ]; then
    echo "❌ DMG file not found: $DMG_FILE"
    exit 1
fi

# Prompt for app-specific password
echo "🔐 Please enter your app-specific password:"
echo "   (This is NOT your regular Apple ID password)"
echo "   (Get it from: appleid.apple.com → App-Specific Passwords)"
read -s -p "App-specific password: " APP_PASSWORD
echo ""
echo ""

if [ -z "$APP_PASSWORD" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# Extract app from DMG
echo "📦 Extracting app from DMG..."
rm -rf "$APP_NAME"
hdiutil attach "$DMG_FILE" -mountpoint /tmp/timeflow_mount -quiet

if [ $? -eq 0 ]; then
    cp -R "/tmp/timeflow_mount/$APP_NAME" ./
    hdiutil detach /tmp/timeflow_mount -quiet
    echo "✅ App extracted"
else
    echo "❌ Failed to extract app"
    exit 1
fi

# Create ZIP for notarization
echo "📁 Creating ZIP archive..."
rm -f "$ZIP_FILE"
ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
else
    echo "❌ Failed to create ZIP"
    exit 1
fi

# Submit for notarization (direct method)
echo ""
echo "🚀 Submitting for notarization..."
echo "   Using direct Apple ID authentication"
echo "   This may take 2-10 minutes..."

xcrun notarytool submit "$ZIP_FILE" \
    --apple-id "$APPLE_ID" \
    --password "$APP_PASSWORD" \
    --team-id "$TEAM_ID" \
    --wait \
    --timeout 15m

RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "✅ Notarization successful!"
    
    # Staple the ticket
    echo "📎 Stapling notarization ticket..."
    xcrun stapler staple "$APP_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✅ Stapling complete!"
        
        # Verify
        echo "🔍 Verifying notarization..."
        xcrun stapler validate "$APP_NAME"
        
        if [ $? -eq 0 ]; then
            echo "✅ Verification passed!"
            
            # Create notarized DMG
            echo "💿 Creating notarized DMG..."
            rm -f "$NOTARIZED_DMG"
            
            # Create temp folder with app and Applications link
            mkdir -p temp_dmg
            cp -R "$APP_NAME" temp_dmg/
            ln -s /Applications temp_dmg/Applications
            
            hdiutil create -volname "Install Ebdaa Work Time" \
                -srcfolder temp_dmg \
                -ov -format UDZO \
                "$NOTARIZED_DMG" -quiet
            
            rm -rf temp_dmg
            
            # Sign the DMG
            codesign --force --sign "$CERT_NAME" "$NOTARIZED_DMG"
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "🎉 SUCCESS! Notarized DMG created!"
                echo ""
                echo "📊 Result:"
                ls -lh "$NOTARIZED_DMG"
                echo ""
                echo "🧪 Final verification:"
                spctl --assess --type open --context context:primary-signature "$NOTARIZED_DMG"
                echo ""
                echo "✅ Users can now install without any security warnings!"
                
            else
                echo "❌ Failed to sign DMG"
            fi
        else
            echo "❌ Verification failed"
        fi
    else
        echo "❌ Stapling failed"
    fi
else
    echo ""
    echo "❌ Notarization failed!"
    echo "💡 Check your app-specific password and try again"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f "$ZIP_FILE"
rm -rf "$APP_NAME"

echo ""
if [ -f "$NOTARIZED_DMG" ]; then
    echo "🎯 DONE! Upload $NOTARIZED_DMG to GitHub releases"
else
    echo "❌ Notarization incomplete - check errors above"
fi 