#!/bin/bash

echo "🔧 Screen Recording Permission Fix for TimeFlow Desktop Agent"
echo "============================================================"
echo ""

# Check if the app is in the allowed list
echo "1. Current Screen Recording permissions:"
echo "   Open: System Settings > Privacy & Security > Screen & System Audio Recording"
echo ""

# Get the app bundle identifier
echo "2. Finding TimeFlow app bundle..."
APP_PATH="$PWD/node_modules/electron/dist/Electron.app"
if [ -d "$APP_PATH" ]; then
    echo "   ✅ Found: $APP_PATH"
else
    echo "   ❌ App not found at expected location"
fi

echo ""
echo "3. To fix the permission:"
echo "   a) Open System Settings"
echo "   b) Go to Privacy & Security > Screen & System Audio Recording"
echo "   c) Look for 'Electron' or 'TimeFlow' in the list"
echo "   d) Make sure it's ENABLED (toggle ON)"
echo "   e) If not in list, click '+' and add the Electron app manually"
echo ""

echo "4. After granting permission:"
echo "   - Close the desktop agent completely"
echo "   - Run: npm start"
echo "   - The permission should now work"
echo ""

echo "🔧 Alternative: Reset permissions and re-add"
echo "tccutil reset ScreenCapture"
echo ""

echo "Press Enter to continue..."
read 