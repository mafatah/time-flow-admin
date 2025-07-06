#!/bin/bash

echo "🧪 Testing TimeFlow v1.0.48 Tab Performance DMG"
echo "=============================================="

DMG_FILE="TimeFlow-v1.0.48-TabPerformance-Signed.dmg"

# Check if DMG exists
if [ ! -f "$DMG_FILE" ]; then
    echo "❌ DMG file not found: $DMG_FILE"
    exit 1
fi

echo "📁 Found DMG: $DMG_FILE"
echo "📊 File size: $(ls -lh "$DMG_FILE" | awk '{print $5}')"

# Verify DMG signature
echo ""
echo "🔐 Verifying DMG signature..."
if codesign --verify --verbose "$DMG_FILE" 2>/dev/null; then
    echo "✅ DMG signature is valid"
else
    echo "⚠️ DMG signature verification failed (expected if not notarized)"
fi

# Mount DMG for testing
echo ""
echo "📦 Mounting DMG for inspection..."
MOUNT_POINT="/tmp/timeflow_test_$$"
mkdir -p "$MOUNT_POINT"

if hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -nobrowse -quiet; then
    echo "✅ DMG mounted successfully at $MOUNT_POINT"
    
    # Check app inside DMG
    APP_PATH="$MOUNT_POINT/Ebdaa Work Time.app"
    if [ -d "$APP_PATH" ]; then
        echo "✅ App found inside DMG"
        
        # Verify app signature
        echo "🔐 Verifying app signature..."
        if codesign --verify --verbose "$APP_PATH" 2>/dev/null; then
            echo "✅ App signature is valid"
            
            # Check app info
            echo "📋 App Information:"
            echo "   Bundle ID: $(defaults read "$APP_PATH/Contents/Info.plist" CFBundleIdentifier 2>/dev/null || echo 'Unknown')"
            echo "   Version: $(defaults read "$APP_PATH/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo 'Unknown')"
            echo "   Build: $(defaults read "$APP_PATH/Contents/Info.plist" CFBundleVersion 2>/dev/null || echo 'Unknown')"
        else
            echo "❌ App signature verification failed"
        fi
    else
        echo "❌ App not found inside DMG"
    fi
    
    # List DMG contents
    echo ""
    echo "📂 DMG Contents:"
    ls -la "$MOUNT_POINT"
    
    # Unmount DMG
    echo ""
    echo "📤 Unmounting DMG..."
    hdiutil detach "$MOUNT_POINT" -quiet
    rmdir "$MOUNT_POINT"
    echo "✅ DMG unmounted"
else
    echo "❌ Failed to mount DMG"
    exit 1
fi

echo ""
echo "🎯 Performance Testing Instructions:"
echo "====================================="
echo "1. Double-click the DMG to open it"
echo "2. Drag 'Ebdaa Work Time' to Applications folder"
echo "3. Right-click the app and select 'Open' (first time only)"
echo "4. Login with your credentials"
echo "5. Open Developer Tools (Cmd+Option+I) and watch Console"
echo "6. Test tab switching - look for performance timing logs"
echo "7. Try keyboard shortcuts: Cmd+1, Cmd+2, Cmd+3, Cmd+4"
echo ""
echo "🚀 Expected Results:"
echo "   • Instant tab switching (no noticeable delay)"
echo "   • Console logs showing timing: 'Tab Switch Performance: X.Xms'"
echo "   • Smooth animations between tabs"
echo "   • Keyboard shortcuts working"
echo ""
echo "✅ DMG is ready for testing!" 