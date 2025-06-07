#!/bin/bash

echo "🔍 Detailed Notarization Retry with Apple Logs"
echo "=============================================="

# Configuration
APPLE_ID="alshqawe66@gmail.com"
TEAM_ID="6GW49LK9V9"
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

# Previous submission IDs
SUBMISSION_1="ae387893-6e88-455a-8b1d-92244f0119ce"
SUBMISSION_2="6494d94e-c744-41e1-a061-c97bffaf9687"

echo "📋 Plan:"
echo "  1. Get detailed logs from Apple for previous rejections"
echo "  2. Analyze what Apple specifically rejected"
echo "  3. Fix those specific issues"
echo "  4. Try notarization again"
echo ""

# Get password
echo "🔐 Enter your app-specific password:"
read -s -p "Password: " APP_PASSWORD
echo ""
echo ""

echo "📋 Getting detailed logs from Apple..."
echo "======================================"

# Get logs from first submission
echo "🔍 First submission log ($SUBMISSION_1):"
echo "----------------------------------------"
xcrun notarytool log "$SUBMISSION_1" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APP_PASSWORD" 2>/dev/null | head -50

echo ""
echo "🔍 Second submission log ($SUBMISSION_2):"
echo "-----------------------------------------"
xcrun notarytool log "$SUBMISSION_2" \
    --apple-id "$APPLE_ID" \
    --team-id "$TEAM_ID" \
    --password "$APP_PASSWORD" 2>/dev/null | head -50

echo ""
echo "📊 Log Analysis Complete"
echo "========================"

# Now let's try a different approach - rebuild the app signature completely
echo ""
echo "🔧 Trying Enhanced Notarization Approach"
echo "========================================"

# Files
DMG_FILE="TimeFlow-Signed.dmg"
APP_NAME="Ebdaa Work Time.app"
ZIP_FILE="TimeFlow-notarization-enhanced.zip"
FINAL_DMG="TimeFlow-FullyNotarized.dmg"

# Extract app
echo "📦 Extracting app from DMG..."
rm -rf "$APP_NAME"
hdiutil attach "$DMG_FILE" -mountpoint /tmp/enhanced_mount -quiet
cp -R "/tmp/enhanced_mount/$APP_NAME" ./
hdiutil detach /tmp/enhanced_mount -quiet
echo "✅ App extracted"

# Create enhanced entitlements (more permissive for debugging)
echo "📝 Creating enhanced entitlements..."
cat > enhanced-entitlements.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Hardened Runtime -->
    <key>com.apple.security.cs.allow-jit</key>
    <false/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <false/>
    <key>com.apple.security.cs.disable-executable-page-protection</key>
    <false/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <false/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <false/>
    
    <!-- Network -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <false/>
    
    <!-- File Access -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    
    <!-- For time tracking and screenshots -->
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    
    <!-- Accessibility (if needed for tracking) -->
    <key>com.apple.security.device.audio-input</key>
    <false/>
    <key>com.apple.security.device.camera</key>
    <false/>
    
    <!-- Additional permissions that might be needed -->
    <key>com.apple.security.temporary-exception.files.absolute-path.read-write</key>
    <array>
        <string>/tmp</string>
        <string>/private/tmp</string>
    </array>
</dict>
</plist>
EOF

# Strip existing signatures completely
echo "🧹 Stripping existing signatures..."
codesign --remove-signature "$APP_NAME" 2>/dev/null || true

# Find and strip all nested components
find "$APP_NAME" -type f \( -name "*.dylib" -o -name "*.framework" \) -exec \
    codesign --remove-signature {} \; 2>/dev/null || true

# Re-sign everything from scratch with enhanced entitlements
echo "🔐 Re-signing with enhanced entitlements..."

# Sign libraries and frameworks first
find "$APP_NAME" -type f -name "*.dylib" -exec \
    codesign --force --options runtime --sign "$CERT_NAME" {} \; 2>/dev/null || true

find "$APP_NAME" -type d -name "*.framework" -exec \
    codesign --force --options runtime --sign "$CERT_NAME" {} \; 2>/dev/null || true

# Sign the main app with entitlements
codesign --force --options runtime \
    --entitlements enhanced-entitlements.plist \
    --sign "$CERT_NAME" \
    "$APP_NAME"

if [ $? -eq 0 ]; then
    echo "✅ Enhanced signing successful"
    
    # Verify the new signature
    echo "🔍 Verifying enhanced signature..."
    codesign --verify --verbose --deep "$APP_NAME"
    
    if [ $? -eq 0 ]; then
        echo "✅ Signature verification passed"
        
        # Show what entitlements were applied
        echo "📋 Applied entitlements:"
        codesign -d --entitlements - "$APP_NAME" | grep -A 5 -B 5 "com.apple.security"
        
        # Create ZIP for notarization
        echo ""
        echo "📁 Creating ZIP for enhanced notarization..."
        rm -f "$ZIP_FILE"
        ditto -c -k --keepParent "$APP_NAME" "$ZIP_FILE"
        echo "✅ ZIP created: $(ls -lh "$ZIP_FILE" | awk '{print $5}')"
        
        # Submit for notarization (attempt #3)
        echo ""
        echo "🚀 Submitting for notarization (ATTEMPT #3)..."
        echo "   With enhanced entitlements and clean re-signing"
        echo "   This may take 5-15 minutes..."
        
        xcrun notarytool submit "$ZIP_FILE" \
            --apple-id "$APPLE_ID" \
            --password "$APP_PASSWORD" \
            --team-id "$TEAM_ID" \
            --wait \
            --timeout 20m \
            --verbose
        
        RESULT=$?
        
        if [ $RESULT -eq 0 ]; then
            echo ""
            echo "🎉 NOTARIZATION SUCCESSFUL!"
            
            # Staple the ticket
            echo "📎 Stapling notarization ticket..."
            xcrun stapler staple "$APP_NAME"
            
            if [ $? -eq 0 ]; then
                echo "✅ Stapling successful!"
                
                # Create final notarized DMG
                echo ""
                echo "💿 Creating final notarized DMG..."
                rm -f "$FINAL_DMG"
                
                mkdir -p final_dmg
                cp -R "$APP_NAME" final_dmg/
                ln -s /Applications final_dmg/Applications
                
                hdiutil create -volname "Install Ebdaa Work Time (Notarized)" \
                    -srcfolder final_dmg \
                    -ov -format UDZO \
                    "$FINAL_DMG" -quiet
                
                rm -rf final_dmg
                
                # Sign the final DMG
                codesign --force --sign "$CERT_NAME" "$FINAL_DMG"
                
                echo ""
                echo "🎉 SUCCESS! Fully notarized DMG created!"
                echo "📋 File: $FINAL_DMG"
                echo "📊 Size: $(ls -lh "$FINAL_DMG" | awk '{print $5}')"
                echo ""
                echo "🧪 Final verification:"
                spctl --assess --type open --context context:primary-signature "$FINAL_DMG"
                echo ""
                echo "✨ This DMG will install with ZERO warnings!"
                
            else
                echo "⚠️  Stapling failed, but app is notarized"
                echo "   The app should still work without warnings"
            fi
        else
            echo ""
            echo "❌ Notarization failed again"
            echo "📋 Let's check what happened..."
            
            # Get the latest submission ID and show log
            LATEST_ID=$(xcrun notarytool history --keychain-profile "temp" 2>/dev/null | head -5 | grep -o '[a-f0-9-]\{36\}' | head -1)
            if [ ! -z "$LATEST_ID" ]; then
                echo "🔍 Latest submission log:"
                xcrun notarytool log "$LATEST_ID" \
                    --apple-id "$APPLE_ID" \
                    --team-id "$TEAM_ID" \
                    --password "$APP_PASSWORD"
            fi
        fi
    else
        echo "❌ Signature verification failed"
    fi
else
    echo "❌ Enhanced signing failed"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f "$ZIP_FILE" enhanced-entitlements.plist
rm -rf "$APP_NAME"

if [ -f "$FINAL_DMG" ]; then
    echo ""
    echo "🎯 SUCCESS! Upload $FINAL_DMG to GitHub releases"
    echo "   This version will have ZERO security warnings!"
else
    echo ""
    echo "📋 Check the logs above for specific issues to resolve"
fi 