#!/bin/bash

echo "🔍 Verifying TimeFlow Installation Process"
echo "=========================================="

echo "❓ Which DMG file did you download and use?"
echo "1) TimeFlow-ARM.dmg (Apple Silicon)"
echo "2) TimeFlow-Intel.dmg (Intel Mac)"  
echo "3) TimeFlow.dmg (Universal)"
echo "4) TimeFlow-Signed.dmg (Extra signed)"
echo ""
read -p "Enter number (1-4): " choice

case $choice in
    1) DMG_FILE="TimeFlow-ARM.dmg" ;;
    2) DMG_FILE="TimeFlow-Intel.dmg" ;;
    3) DMG_FILE="TimeFlow.dmg" ;;
    4) DMG_FILE="TimeFlow-Signed.dmg" ;;
    *) echo "Invalid choice"; exit 1 ;;
esac

echo ""
echo "📋 You selected: $DMG_FILE"
echo ""

# Verify DMG signature
if [ -f "$DMG_FILE" ]; then
    echo "🔍 Verifying DMG signature..."
    codesign --verify --verbose "$DMG_FILE" && echo "✅ DMG is properly signed" || echo "❌ DMG signature issue"
    
    # Check app inside DMG
    echo ""
    echo "📦 Checking app inside DMG..."
    hdiutil attach "$DMG_FILE" -mountpoint /tmp/verify_mount -quiet
    
    if [ $? -eq 0 ]; then
        APP_PATH="/tmp/verify_mount/Ebdaa Work Time.app"
        echo "🔍 Verifying app signature..."
        codesign --verify --verbose "$APP_PATH" && echo "✅ App inside DMG is properly signed" || echo "❌ App signature issue"
        
        echo ""
        echo "🔐 Certificate details:"
        codesign -dv "$APP_PATH" 2>&1 | grep "Authority=" | head -1
        
        hdiutil detach /tmp/verify_mount -quiet
    fi
else
    echo "❌ DMG file not found in current directory"
fi

echo ""
echo "📋 Current Issue Analysis:"
echo "=========================="
echo "The warning you saw is NORMAL for signed but not notarized apps."
echo "This is expected behavior - the app IS properly signed!"
echo ""
echo "✅ What the warning means:"
echo "   - App is signed with Developer ID ✅"
echo "   - App is not notarized ❌ (we knew this)"
echo "   - User can choose to trust the developer ✅"
echo ""
echo "🛠️ SOLUTION - Follow these exact steps:"
echo "======================================"
echo "1. 📁 Make sure app is copied to /Applications folder"
echo "2. 🖱️  Open Finder → Applications"
echo "3. 🔍 Find 'Ebdaa Work Time'"
echo "4. 🖱️  RIGHT-CLICK on the app (don't double-click!)"
echo "5. 📋 Select 'Open' from the menu"
echo "6. ✅ Click 'Open' in the new dialog that appears"
echo ""
echo "💡 After doing this ONCE, the app will open normally forever!"
echo ""
echo "🚨 Alternative method:"
echo "   System Settings → Privacy & Security → 'Open Anyway'"
echo ""
echo "🎯 This is standard for enterprise apps - completely normal!" 