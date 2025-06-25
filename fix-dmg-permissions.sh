#!/bin/bash

echo "🔧 TimeFlow DMG Permission Fix Script v2.0"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "This script will help you fix permission issues with TimeFlow installed from DMG."
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is only for macOS. You're running: $OSTYPE"
    exit 1
fi

print_status "Running on macOS"

# Check if TimeFlow is installed in Applications
TIMEFLOW_APP="/Applications/TimeFlow.app"
TIMEFLOW_ALT="/Applications/Ebdaa Work Time.app"

if [ -d "$TIMEFLOW_APP" ]; then
    APP_PATH="$TIMEFLOW_APP"
    print_status "Found TimeFlow at: $APP_PATH"
elif [ -d "$TIMEFLOW_ALT" ]; then
    APP_PATH="$TIMEFLOW_ALT"
    print_status "Found TimeFlow at: $APP_PATH"
else
    print_error "TimeFlow not found in Applications folder!"
    echo ""
    echo "Please make sure TimeFlow is installed properly:"
    echo "1. Open the DMG file"
    echo "2. Drag TimeFlow.app to Applications folder"
    echo "3. Eject the DMG"
    echo "4. Run this script again"
    exit 1
fi

echo ""
echo "🔍 Checking Current Permission Status..."
echo "======================================"

# Check Screen Recording permission
echo ""
print_info "Checking Screen Recording permission..."

# Use AppleScript to check Screen Recording permission
SCREEN_CHECK=$(osascript -e 'tell application "System Events" to get name of every application process' 2>&1)

if [[ $SCREEN_CHECK == *"error"* ]] || [[ $SCREEN_CHECK == *"not allowed"* ]]; then
    print_error "Screen Recording permission NOT granted"
    SCREEN_PERMISSION=false
else
    print_status "Screen Recording permission appears to be granted"
    SCREEN_PERMISSION=true
fi

# Check Accessibility permission by trying to access accessibility features
print_info "Checking Accessibility permission..."

ACCESSIBILITY_CHECK=$(osascript -e 'tell application "System Events" to get frontmost of first process whose frontmost is true' 2>&1)

if [[ $ACCESSIBILITY_CHECK == *"error"* ]] || [[ $ACCESSIBILITY_CHECK == *"not authorized"* ]]; then
    print_error "Accessibility permission NOT granted"
    ACCESSIBILITY_PERMISSION=false
else
    print_status "Accessibility permission appears to be granted"
    ACCESSIBILITY_PERMISSION=true
fi

echo ""
echo "📊 Permission Summary:"
echo "===================="
if [ "$SCREEN_PERMISSION" = true ]; then
    print_status "Screen Recording: ✅ Granted"
else
    print_error "Screen Recording: ❌ Missing"
fi

if [ "$ACCESSIBILITY_PERMISSION" = true ]; then
    print_status "Accessibility: ✅ Granted"
else
    print_error "Accessibility: ❌ Missing"
fi

# If both permissions are granted, we're done
if [ "$SCREEN_PERMISSION" = true ] && [ "$ACCESSIBILITY_PERMISSION" = true ]; then
    echo ""
    print_status "All permissions are granted! TimeFlow should work properly."
    echo ""
    print_info "If you're still having issues:"
    echo "1. Restart TimeFlow completely"
    echo "2. Try logging out and logging back in"
    echo "3. Check the TimeFlow debug console"
    exit 0
fi

# Show permission fix instructions
echo ""
echo "🔧 Permission Fix Instructions:"
echo "=============================="

if [ "$SCREEN_PERMISSION" = false ]; then
    echo ""
    print_warning "Screen Recording Permission Missing"
    echo ""
    echo "To fix Screen Recording permission:"
    echo "1. Open System Settings (or System Preferences)"
    echo "2. Go to Privacy & Security > Screen & System Audio Recording"
    echo "3. Look for 'TimeFlow' or 'Electron' in the list"
    echo "4. Turn ON the toggle switch next to it"
    echo "5. If not in the list, click '+' and add TimeFlow from Applications"
    echo ""
    read -p "Press Enter to open Screen Recording settings..." -r
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    echo ""
    print_info "Screen Recording settings opened. Please grant permission and press Enter to continue..."
    read -r
fi

if [ "$ACCESSIBILITY_PERMISSION" = false ]; then
    echo ""
    print_warning "Accessibility Permission Missing"
    echo ""
    echo "To fix Accessibility permission:"
    echo "1. Open System Settings (or System Preferences)"
    echo "2. Go to Privacy & Security > Accessibility"
    echo "3. Look for 'TimeFlow' or 'Electron' in the list"
    echo "4. Turn ON the toggle switch next to it"
    echo "5. If not in the list, click '+' and add TimeFlow from Applications"
    echo "6. You may need to unlock the settings first (click the lock icon)"
    echo ""
    read -p "Press Enter to open Accessibility settings..." -r
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
    echo ""
    print_info "Accessibility settings opened. Please grant permission and press Enter to continue..."
    read -r
fi

echo ""
echo "🔄 Verifying Permissions After Setup..."
echo "======================================"

# Re-check permissions
sleep 2

print_info "Re-checking Screen Recording permission..."
SCREEN_CHECK_2=$(osascript -e 'tell application "System Events" to get name of every application process' 2>&1)

if [[ $SCREEN_CHECK_2 == *"error"* ]] || [[ $SCREEN_CHECK_2 == *"not allowed"* ]]; then
    print_error "Screen Recording permission still not granted"
    SCREEN_FIXED=false
else
    print_status "Screen Recording permission now granted!"
    SCREEN_FIXED=true
fi

print_info "Re-checking Accessibility permission..."
ACCESSIBILITY_CHECK_2=$(osascript -e 'tell application "System Events" to get frontmost of first process whose frontmost is true' 2>&1)

if [[ $ACCESSIBILITY_CHECK_2 == *"error"* ]] || [[ $ACCESSIBILITY_CHECK_2 == *"not authorized"* ]]; then
    print_error "Accessibility permission still not granted"
    ACCESSIBILITY_FIXED=false
else
    print_status "Accessibility permission now granted!"
    ACCESSIBILITY_FIXED=true
fi

echo ""
echo "📋 Final Results:"
echo "================"

if [ "$SCREEN_FIXED" = true ] && [ "$ACCESSIBILITY_FIXED" = true ]; then
    print_status "🎉 All permissions successfully granted!"
    echo ""
    print_info "Next steps:"
    echo "1. Quit TimeFlow completely if it's running"
    echo "2. Restart TimeFlow"
    echo "3. Test app and URL detection in the debug console"
    echo ""
    echo "TimeFlow should now properly detect:"
    echo "• Active applications"
    echo "• Browser URLs"
    echo "• Mouse and keyboard activity"
    
elif [ "$SCREEN_FIXED" = false ] || [ "$ACCESSIBILITY_FIXED" = false ]; then
    print_warning "Some permissions are still missing"
    echo ""
    if [ "$SCREEN_FIXED" = false ]; then
        print_error "Screen Recording permission still needs to be granted"
    fi
    if [ "$ACCESSIBILITY_FIXED" = false ]; then
        print_error "Accessibility permission still needs to be granted"
    fi
    echo ""
    print_info "You may need to:"
    echo "1. Restart your Mac"
    echo "2. Try the permission setup again"
    echo "3. Make sure you're selecting the correct TimeFlow app from Applications"
    echo ""
    print_warning "Contact support if issues persist after restarting"
fi

echo ""
echo "🔧 Troubleshooting Tips:"
echo "======================"
echo "• If permissions don't work immediately, restart your Mac"
echo "• Make sure you're granting permission to the app in /Applications/, not the DMG"
echo "• Some macOS versions require apps to request permission before they appear in settings"
echo "• Try opening TimeFlow first, then grant permissions when prompted"
echo ""
print_info "Script completed. Thank you for using TimeFlow!" 