#!/bin/bash

echo "🍎 Complete TimeFlow App Notarization Process"
echo "=============================================="

# Configuration (update these with your actual values)
APPLE_ID="alshqawe66@gmail.com"  # Your Apple ID
APP_PASSWORD="your-app-specific-password"  # Replace with app-specific password
TEAM_ID="6GW49LK9V9"
KEYCHAIN_PROFILE="timeflow-notary"
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

# Files
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-notarization.zip"
NOTARIZED_DMG="TimeFlow-Notarized.dmg"

echo "📋 Configuration:"
echo "   Apple ID: $APPLE_ID"
echo "   Team ID: $TEAM_ID"
echo "   DMG File: $DMG_FILE"
echo ""

# Check if DMG exists
if [ ! -f "$DMG_FILE" ]; then
    echo "❌ DMG file not found: $DMG_FILE"
    echo "   Please ensure the signed DMG is in the current directory"
    exit 1
fi

# Step 1: Store credentials (if not already stored)
echo "🔐 Step 1: Setting up credentials..."
if ! xcrun notarytool history --keychain-profile "$KEYCHAIN_PROFILE" &>/dev/null; then
    echo "   Setting up keychain profile..."
    read -p "   Enter your Apple ID [$APPLE_ID]: " input_apple_id
    APPLE_ID=${input_apple_id:-$APPLE_ID}
    
    read -s -p "   Enter your app-specific password: " input_password
    echo ""
    APP_PASSWORD=${input_password:-$APP_PASSWORD}
    
    xcrun notarytool store-credentials "$KEYCHAIN_PROFILE" \
        --apple-id "$APPLE_ID" \
        --team-id "$TEAM_ID" \
        --password "$APP_PASSWORD"
    
    if [ $? -eq 0 ]; then
        echo "✅ Credentials stored successfully"
    else
        echo "❌ Failed to store credentials"
        exit 1
    fi
else
    echo "✅ Credentials already configured"
fi

# Step 2: Extract app from DMG
echo ""
echo "📦 Step 2: Extracting app from DMG..."
rm -rf "$APP_NAME"  # Clean up any existing app
hdiutil attach "$DMG_FILE" -mountpoint /tmp/timeflow_mount

if [ $? -eq 0 ]; then
    cp -R "/tmp/timeflow_mount/$APP_NAME" ./
    hdiutil detach /tmp/timeflow_mount
    echo "✅ App extracted successfully"
else
    echo "❌ Failed to mount DMG"
    exit 1
fi

# Verify app signature
echo ""
echo "🔍 Verifying app signature..."
codesign --verify --verbose "$APP_NAME"
if [ $? -eq 0 ]; then
    echo "✅ App signature is valid"
else
    echo "❌ App signature verification failed"
    exit 1
fi

# Step 3: Create ZIP for notarization
echo ""
echo "📁 Step 3: Creating ZIP archive..."
rm -f "$ZIP_FILE"  # Clean up any existing ZIP
ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ ZIP created: $ZIP_FILE"
    echo "   Size: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
else
    echo "❌ Failed to create ZIP"
    exit 1
fi

# Step 4: Submit for notarization
echo ""
echo "🚀 Step 4: Submitting for notarization..."
echo "   This may take 2-10 minutes..."
echo "   Apple will scan the app for malicious content..."

xcrun notarytool submit "$ZIP_FILE" \
    --keychain-profile "$KEYCHAIN_PROFILE" \
    --wait

NOTARIZATION_RESULT=$?

if [ $NOTARIZATION_RESULT -eq 0 ]; then
    echo "✅ Notarization successful!"
    
    # Step 5: Staple the ticket
    echo ""
    echo "📎 Step 5: Stapling notarization ticket..."
    xcrun stapler staple "$APP_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✅ Stapling successful!"
        
        # Step 6: Verify notarization
        echo ""
        echo "🔍 Step 6: Verifying notarization..."
        xcrun stapler validate "$APP_NAME"
        spctl --assess --type exec "$APP_NAME"
        
        if [ $? -eq 0 ]; then
            echo "✅ App is properly notarized!"
            
            # Step 7: Create notarized DMG
            echo ""
            echo "💿 Step 7: Creating notarized DMG..."
            rm -f "$NOTARIZED_DMG"  # Clean up any existing DMG
            
            # Create DMG with Applications link
            mkdir -p temp_dmg_contents
            cp -R "$APP_NAME" temp_dmg_contents/
            ln -s /Applications temp_dmg_contents/Applications
            
            hdiutil create -volname "Install Ebdaa Work Time" \
                -srcfolder temp_dmg_contents \
                -ov -format UDZO \
                "$NOTARIZED_DMG"
            
            # Clean up temp folder
            rm -rf temp_dmg_contents
            
            # Sign the DMG
            codesign --force --sign "$CERT_NAME" "$NOTARIZED_DMG"
            
            if [ $? -eq 0 ]; then
                echo "✅ Notarized DMG created: $NOTARIZED_DMG"
                echo ""
                echo "🎉 SUCCESS! Complete notarization finished!"
                echo ""
                echo "📊 Results:"
                ls -lh "$NOTARIZED_DMG"
                echo ""
                echo "🧪 Final verification:"
                codesign --verify --verbose "$NOTARIZED_DMG"
                spctl --assess --type open --context context:primary-signature "$NOTARIZED_DMG"
                
            else
                echo "❌ Failed to sign notarized DMG"
            fi
        else
            echo "❌ Notarization verification failed"
        fi
    else
        echo "❌ Stapling failed"
    fi
else
    echo "❌ Notarization failed!"
    echo ""
    echo "🔍 Checking submission history..."
    xcrun notarytool history --keychain-profile "$KEYCHAIN_PROFILE" | head -5
    echo ""
    echo "💡 Possible issues:"
    echo "   - App contains prohibited APIs"
    echo "   - Hardened runtime not properly configured"
    echo "   - Invalid signature"
    echo "   - Network connectivity issues"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f "$ZIP_FILE"
rm -rf "$APP_NAME"

echo ""
echo "📋 Summary:"
if [ -f "$NOTARIZED_DMG" ]; then
    echo "✅ Notarized DMG ready: $NOTARIZED_DMG"
    echo "📝 Next steps:"
    echo "   1. Test on a fresh Mac to verify no security warnings"
    echo "   2. Upload to GitHub releases as v1.0.6"
    echo "   3. Update download links to use notarized version"
    echo "   4. Celebrate! 🎉"
else
    echo "❌ Notarization process incomplete"
    echo "📝 Check the error messages above and try again"
fi 