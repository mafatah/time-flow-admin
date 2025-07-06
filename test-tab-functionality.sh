#!/bin/bash

echo "🧪 Testing Tab Performance Optimizations - Functional Tests"
echo "=========================================================="

DMG_FILE="TimeFlow-v1.0.48-TabPerformance-Signed.dmg"

# Check if DMG exists
if [ ! -f "$DMG_FILE" ]; then
    echo "❌ DMG file not found: $DMG_FILE"
    echo "Please run build script first"
    exit 1
fi

echo "📁 Found DMG: $DMG_FILE"

# Mount DMG
echo "📦 Mounting DMG for testing..."
MOUNT_POINT="/tmp/timeflow_functional_test_$$"
mkdir -p "$MOUNT_POINT"

if ! hdiutil attach "$DMG_FILE" -mountpoint "$MOUNT_POINT" -quiet; then
    echo "❌ Failed to mount DMG"
    exit 1
fi

APP_PATH="$MOUNT_POINT/Ebdaa Work Time.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ App not found in DMG"
    hdiutil detach "$MOUNT_POINT" -quiet
    exit 1
fi

echo "✅ DMG mounted successfully"
echo "📱 App path: $APP_PATH"

# Test 1: Basic Launch Test
echo ""
echo "🧪 Test 1: Basic App Launch"
echo "----------------------------"
echo "Opening app for basic functionality test..."
echo "Please perform the following tests manually:"
echo ""
echo "📋 CRITICAL FUNCTIONAL TESTS:"
echo ""
echo "1. 🔍 SCREENSHOT LOADING TEST (HIGH PRIORITY):"
echo "   a) Navigate to 'Screenshots' tab"
echo "   b) Wait 5 seconds"
echo "   c) VERIFY: Screenshots section loads (even if empty)"
echo "   d) VERIFY: No console errors in DevTools"
echo ""
echo "2. 📊 REPORTS LOADING TEST (HIGH PRIORITY):"
echo "   a) Navigate to 'Reports' tab" 
echo "   b) Wait 5 seconds"
echo "   c) VERIFY: Reports section loads with placeholders"
echo "   d) VERIFY: No console errors in DevTools"
echo ""
echo "3. ⚡ RAPID TAB SWITCHING TEST (HIGH PRIORITY):"
echo "   a) Rapidly click between Dashboard → Time Tracker → Screenshots → Reports"
echo "   b) Repeat 10+ times quickly"
echo "   c) VERIFY: All tabs respond and show content"
echo "   d) VERIFY: Switching feels fast (< 100ms perceived delay)"
echo "   e) VERIFY: No broken states or missing content"
echo ""
echo "4. 🖱️ SAME TAB CLICKING TEST (MEDIUM PRIORITY):"
echo "   a) Click Dashboard tab multiple times while already active"
echo "   b) Do same for other tabs"
echo "   c) VERIFY: No functionality breaks"
echo "   d) VERIFY: Content remains intact"
echo ""
echo "5. ⌨️ KEYBOARD SHORTCUTS TEST (NEW FEATURE):"
echo "   a) Press Ctrl+1 (or Cmd+1 on Mac) for Dashboard"
echo "   b) Press Ctrl+2 for Time Tracker"
echo "   c) Press Ctrl+3 for Screenshots"
echo "   d) Press Ctrl+4 for Reports"
echo "   e) VERIFY: Keyboard navigation works"
echo ""
echo "6. 🔍 PERFORMANCE MONITORING TEST:"
echo "   a) Open DevTools (F12 or Cmd+Option+I)"
echo "   b) Go to Console tab"
echo "   c) Switch between tabs multiple times"
echo "   d) VERIFY: See performance logs like 'Tab Switch Performance: X ms'"
echo "   e) VERIFY: Times are < 50ms on average"
echo ""

# Open the app
echo "🚀 Launching app..."
open "$APP_PATH"

echo ""
echo "⏱️ Please test for 2-3 minutes focusing on tab switching behavior"
echo ""
echo "🔴 CRITICAL ISSUES TO WATCH FOR:"
echo "  • Screenshots not loading when clicking Screenshots tab"
echo "  • Reports not loading when clicking Reports tab"
echo "  • Tab switching feeling sluggish (> 150ms delay)"
echo "  • Console errors during navigation"
echo "  • App freezing during rapid tab switching"
echo "  • Content disappearing after switching tabs"
echo ""
echo "🟡 MINOR ISSUES TO NOTE:"
echo "  • Slightly delayed response (50-100ms) - acceptable"
echo "  • Visual glitches during transitions"
echo "  • Performance logs in console"
echo ""

# Wait for user input
echo "Press ENTER when you've completed the functional tests..."
read -r

echo ""
echo "🧪 Test Results Summary"
echo "======================="
echo ""
echo "Please report any issues found:"
echo ""
read -p "Did screenshots load properly? (y/n): " screenshots_ok
read -p "Did reports load properly? (y/n): " reports_ok
read -p "Was tab switching fast and responsive? (y/n): " performance_ok
read -p "Did rapid clicking work without issues? (y/n): " rapid_ok
read -p "Did keyboard shortcuts work? (y/n): " keyboard_ok
read -p "Any console errors or crashes? (y/n): " errors_found

echo ""
echo "📊 Test Results:"
echo "  Screenshots loading: $screenshots_ok"
echo "  Reports loading: $reports_ok"
echo "  Performance: $performance_ok"
echo "  Rapid clicking: $rapid_ok"
echo "  Keyboard shortcuts: $keyboard_ok"
echo "  Errors/crashes: $errors_found"

# Calculate overall status
passing_tests=0
total_tests=5

[[ "$screenshots_ok" == "y" ]] && ((passing_tests++))
[[ "$reports_ok" == "y" ]] && ((passing_tests++))
[[ "$performance_ok" == "y" ]] && ((passing_tests++))
[[ "$rapid_ok" == "y" ]] && ((passing_tests++))
[[ "$keyboard_ok" == "y" ]] && ((passing_tests++))

echo ""
if [[ $passing_tests -eq $total_tests && "$errors_found" == "n" ]]; then
    echo "✅ ALL TESTS PASSED - Tab performance optimizations are working correctly!"
    echo "🚀 DMG is ready for distribution"
elif [[ $passing_tests -ge 3 && "$errors_found" == "n" ]]; then
    echo "⚠️ MOST TESTS PASSED ($passing_tests/$total_tests) - Minor issues may exist"
    echo "👍 DMG is likely safe for distribution with noted issues"
else
    echo "❌ TESTS FAILED ($passing_tests/$total_tests passed) - Critical issues found"
    echo "🛑 DO NOT DISTRIBUTE - Fix issues before release"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
rmdir "$MOUNT_POINT" 2>/dev/null

echo ""
echo "✅ Functional testing complete!"
echo ""
echo "📄 For detailed technical analysis, see: TAB_PERFORMANCE_RISK_ANALYSIS.md" 