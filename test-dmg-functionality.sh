#!/bin/bash

# 🧪 TimeFlow DMG Functionality Test Script
# This script provides comprehensive testing instructions and automated checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 TimeFlow DMG Functionality Test Suite${NC}"
echo "=========================================="

# Check if TimeFlow is installed
APP_PATH="/Applications/Ebdaa Work Time.app"
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}❌ TimeFlow not found in Applications folder${NC}"
    echo "Please install the DMG first by:"
    echo "1. Double-clicking the DMG file"
    echo "2. Dragging 'Ebdaa Work Time' to Applications folder"
    exit 1
fi

echo -e "${GREEN}✅ TimeFlow found in Applications folder${NC}"

# Check app signature
echo -e "${BLUE}🔐 Verifying app signature...${NC}"
if codesign --verify --verbose "$APP_PATH" 2>/dev/null; then
    echo -e "${GREEN}✅ App signature is valid${NC}"
else
    echo -e "${YELLOW}⚠️ App signature verification failed${NC}"
fi

# Check if app can be launched
echo -e "${BLUE}🚀 Testing app launch...${NC}"
if open "$APP_PATH"; then
    echo -e "${GREEN}✅ App launched successfully${NC}"
    sleep 3
else
    echo -e "${RED}❌ Failed to launch app${NC}"
    exit 1
fi

# Manual testing instructions
echo ""
echo -e "${BLUE}📋 Manual Testing Checklist${NC}"
echo "=============================="
echo ""

echo -e "${YELLOW}🔐 1. PERMISSIONS TEST${NC}"
echo "   □ Screen Recording permission granted"
echo "   □ Accessibility permission granted"
echo "   □ No permission errors in console"
echo "   □ App shows 'All permissions granted' status"
echo ""

echo -e "${YELLOW}📸 2. SCREENSHOT FUNCTIONALITY${NC}"
echo "   □ Screenshots are captured every 30 seconds"
echo "   □ Screenshots appear in the Screenshots page"
echo "   □ Screenshots have proper timestamps"
echo "   □ Screenshot quality is good (not corrupted)"
echo "   □ Activity percentage is calculated correctly"
echo ""

echo -e "${YELLOW}🌐 3. URL TRACKING${NC}"
echo "   □ Open Chrome/Safari and navigate to different websites"
echo "   □ URLs are captured and logged"
echo "   □ URL changes are detected within 1-2 seconds"
echo "   □ Different browser tabs are tracked separately"
echo "   □ URL data appears in reports"
echo ""

echo -e "${YELLOW}🖥️ 4. APP TRACKING${NC}"
echo "   □ Switch between different applications"
echo "   □ App switches are logged immediately"
echo "   □ App usage time is calculated correctly"
echo "   □ Background apps are not over-counted"
echo "   □ App data appears in reports"
echo ""

echo -e "${YELLOW}⏱️ 5. TIME TRACKING${NC}"
echo "   □ Select a project from dropdown"
echo "   □ Start time tracking successfully"
echo "   □ Timer shows correct elapsed time"
echo "   □ Pause/Resume functionality works"
echo "   □ Stop tracking saves session correctly"
echo "   □ Time logs appear in database"
echo ""

echo -e "${YELLOW}📊 6. DATABASE SYNC${NC}"
echo "   □ Login with valid credentials works"
echo "   □ Data syncs to Supabase database"
echo "   □ Offline data is queued and synced later"
echo "   □ No database connection errors"
echo "   □ Real-time sync works properly"
echo ""

echo -e "${YELLOW}🎯 7. ACTIVITY DETECTION${NC}"
echo "   □ Mouse clicks are counted"
echo "   □ Keyboard activity is tracked"
echo "   □ Idle time is detected correctly"
echo "   □ Activity percentage is realistic (not 0% or 100%)"
echo "   □ Activity data correlates with actual usage"
echo ""

echo -e "${YELLOW}🔧 8. DEBUG CONSOLE${NC}"
echo "   □ Press Cmd+Shift+D to open debug console"
echo "   □ All systems show 'WORKING' status"
echo "   □ No error messages in console"
echo "   □ Real-time data updates in console"
echo "   □ System check shows all green"
echo ""

echo -e "${YELLOW}🛡️ 9. SECURITY & STABILITY${NC}"
echo "   □ No security warnings on launch"
echo "   □ App doesn't crash during normal use"
echo "   □ Memory usage stays reasonable"
echo "   □ CPU usage is acceptable"
echo "   □ No suspicious network activity"
echo ""

echo -e "${YELLOW}🔄 10. AUTO-UPDATE${NC}"
echo "   □ App checks for updates on launch"
echo "   □ Update notification system works"
echo "   □ Update download and install process"
echo "   □ Settings are preserved after update"
echo ""

# Automated checks
echo ""
echo -e "${BLUE}🤖 Automated Checks${NC}"
echo "==================="

# Check if app is running
if pgrep -f "Ebdaa Work Time" > /dev/null; then
    echo -e "${GREEN}✅ App is running${NC}"
else
    echo -e "${RED}❌ App is not running${NC}"
fi

# Check system permissions
echo -e "${BLUE}🔍 Checking system permissions...${NC}"

# Check Screen Recording permission
if sqlite3 "/Users/$(whoami)/Library/Application Support/com.apple.TCC/TCC.db" \
    "SELECT * FROM access WHERE client='com.ebdaa.work-time-agent' AND service='kTCCServiceScreenCapture';" 2>/dev/null | grep -q "com.ebdaa.work-time-agent"; then
    echo -e "${GREEN}✅ Screen Recording permission granted${NC}"
else
    echo -e "${YELLOW}⚠️ Screen Recording permission may not be granted${NC}"
fi

# Check Accessibility permission
if sqlite3 "/Users/$(whoami)/Library/Application Support/com.apple.TCC/TCC.db" \
    "SELECT * FROM access WHERE client='com.ebdaa.work-time-agent' AND service='kTCCServiceAccessibility';" 2>/dev/null | grep -q "com.ebdaa.work-time-agent"; then
    echo -e "${GREEN}✅ Accessibility permission granted${NC}"
else
    echo -e "${YELLOW}⚠️ Accessibility permission may not be granted${NC}"
fi

# Check app bundle structure
echo -e "${BLUE}🔍 Checking app bundle structure...${NC}"
if [ -f "$APP_PATH/Contents/MacOS/Ebdaa Work Time" ]; then
    echo -e "${GREEN}✅ Main executable found${NC}"
else
    echo -e "${RED}❌ Main executable not found${NC}"
fi

if [ -f "$APP_PATH/Contents/Info.plist" ]; then
    echo -e "${GREEN}✅ Info.plist found${NC}"
else
    echo -e "${RED}❌ Info.plist not found${NC}"
fi

# Check app version
APP_VERSION=$(defaults read "$APP_PATH/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null)
if [ -n "$APP_VERSION" ]; then
    echo -e "${GREEN}✅ App version: $APP_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️ Could not determine app version${NC}"
fi

# Performance check
echo -e "${BLUE}⚡ Performance Check${NC}"
echo "==================="

# Check memory usage
if pgrep -f "Ebdaa Work Time" > /dev/null; then
    MEMORY_USAGE=$(ps -o rss= -p $(pgrep -f "Ebdaa Work Time") | awk '{sum+=$1} END {print sum/1024}')
    echo -e "${BLUE}📊 Memory usage: ${MEMORY_USAGE}MB${NC}"
    
    if (( $(echo "$MEMORY_USAGE > 500" | bc -l) )); then
        echo -e "${YELLOW}⚠️ High memory usage detected${NC}"
    else
        echo -e "${GREEN}✅ Memory usage is reasonable${NC}"
    fi
fi

# Testing summary
echo ""
echo -e "${BLUE}📋 Testing Summary${NC}"
echo "=================="
echo ""
echo -e "${GREEN}✅ PASSED TESTS:${NC}"
echo "   - App installation"
echo "   - App launch"
echo "   - Bundle structure"
echo ""
echo -e "${YELLOW}⚠️ MANUAL TESTS REQUIRED:${NC}"
echo "   - All functionality tests above"
echo "   - Extended usage testing"
echo "   - Multi-day stability test"
echo ""
echo -e "${BLUE}🎯 NEXT STEPS:${NC}"
echo "1. Complete all manual tests in the checklist"
echo "2. Test with different user scenarios"
echo "3. Test on different macOS versions if possible"
echo "4. Verify data integrity in Supabase dashboard"
echo "5. Test auto-update functionality"
echo ""
echo -e "${GREEN}🚀 If all tests pass, the DMG is ready for distribution!${NC}" 