#!/bin/bash
echo "🔍 Verifying DMG integrity..."
echo ""

echo "📦 Checking ARM DMG..."
if hdiutil verify EbdaaWorkTime-ARM.dmg; then
    echo "✅ ARM DMG is valid"
else
    echo "❌ ARM DMG has issues"
fi

echo ""
echo "📦 Checking Intel DMG..."
if hdiutil verify EbdaaWorkTime-Intel.dmg; then
    echo "✅ Intel DMG is valid"
else
    echo "❌ Intel DMG has issues"
fi

echo ""
echo "📊 File sizes:"
ls -lh *.dmg *.exe

echo ""
echo "🧪 Testing crash prevention..."
echo "Opening ARM DMG and trying to launch app..."
open EbdaaWorkTime-ARM.dmg
sleep 3

echo "Now manually try to launch the app from the mounted DMG to test crash prevention."
echo "Expected: Warning dialog should appear and app should close safely." 