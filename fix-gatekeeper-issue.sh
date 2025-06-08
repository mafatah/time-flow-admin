#!/bin/bash

# =====================================================
# FIX GATEKEEPER ISSUE FOR EBDAA WORK TIME
# =====================================================
# This script helps fix macOS Gatekeeper blocking issues
# for the Ebdaa Work Time application
# =====================================================

# ANSI color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# App details
APP_NAME="Ebdaa Work Time"
APP_PATH="/Applications/Ebdaa Work Time.app"

echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║            EBDAA WORK TIME - GATEKEEPER FIX                ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${CYAN}This script will help fix the Gatekeeper security issue:${RESET}"
echo -e "${YELLOW}\"Apple could not verify Ebdaa Work Time is free of malware...\"${RESET}"
echo ""

# =====================================================
# STEP 1: Check if the app exists in Applications
# =====================================================
echo -e "${BOLD}${PURPLE}STEP 1: Checking if the app exists...${RESET}"

if [ -d "$APP_PATH" ]; then
    echo -e "${GREEN}✓ Found $APP_NAME in the Applications folder.${RESET}"
else
    echo -e "${RED}✗ $APP_NAME not found in the Applications folder.${RESET}"
    echo -e "${YELLOW}Please make sure you've installed the app correctly:${RESET}"
    echo "  1. Open the DMG file"
    echo "  2. Drag the app to the Applications folder"
    echo "  3. Run this script again"
    exit 1
fi

# =====================================================
# STEP 2: Remove quarantine attributes
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 2: Removing Gatekeeper quarantine attributes...${RESET}"

if xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully removed quarantine attribute!${RESET}"
    echo -e "${GREEN}✓ Try opening the app now - it should work.${RESET}"
else
    echo -e "${YELLOW}! Could not remove quarantine attribute.${RESET}"
    echo -e "${YELLOW}! You might need to try the alternative methods below.${RESET}"
fi

# =====================================================
# STEP 3: Alternative solutions
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 3: Alternative solutions if the above didn't work:${RESET}"
echo ""
echo -e "${CYAN}Method A: Use Terminal to bypass Gatekeeper for this app only:${RESET}"
echo -e "  ${BOLD}sudo xattr -rd com.apple.quarantine \"$APP_PATH\"${RESET}"
echo -e "  (You'll need to enter your admin password)"
echo ""
echo -e "${CYAN}Method B: Use spctl to allow the app:${RESET}"
echo -e "  ${BOLD}sudo spctl --add \"$APP_PATH\"${RESET}"
echo -e "  ${BOLD}sudo spctl --enable --app \"$APP_PATH\"${RESET}"
echo ""

# =====================================================
# STEP 4: Manual approval through System Preferences
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 4: How to manually approve the app:${RESET}"
echo ""
echo -e "${CYAN}If the above methods don't work, you can manually approve the app:${RESET}"
echo "  1. Try to open the app (it will be blocked)"
echo "  2. Open System Preferences/System Settings"
echo "  3. Go to Security & Privacy/Privacy & Security"
echo "  4. Look for the message about the blocked app"
echo "  5. Click 'Open Anyway' or similar button"
echo "  6. Confirm in the dialog that appears"
echo ""
echo -e "${YELLOW}Note: On newer macOS versions, you might need to:${RESET}"
echo "  - Click the lock icon and enter your password first"
echo "  - Look under 'Security' section for the blocked app message"
echo "  - On macOS Ventura/Sonoma, check 'App Management' settings"
echo ""

# =====================================================
# STEP 5: Explain the code signing issue
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 5: Understanding the issue & long-term solution:${RESET}"
echo ""
echo -e "${CYAN}Why this happens:${RESET}"
echo "  The app is not properly code-signed or notarized with Apple."
echo "  This is a security feature of macOS called Gatekeeper that"
echo "  prevents unsigned applications from running."
echo ""
echo -e "${CYAN}Proper fix for developers:${RESET}"
echo "  1. Obtain an Apple Developer ID certificate"
echo "  2. Sign the app with: codesign -s \"Developer ID\" --deep --force \"$APP_PATH\""
echo "  3. Enable hardened runtime in package.json:"
echo "     \"hardenedRuntime\": true"
echo "  4. Notarize the app with Apple's notarization service"
echo "  5. Staple the notarization ticket to the app"
echo ""
echo -e "${CYAN}For Ebdaa Work Time developers:${RESET}"
echo "  Update package.json with:"
echo "  \"mac\": {"
echo "    \"identity\": \"Developer ID Application: Your Company Name\","
echo "    \"hardenedRuntime\": true,"
echo "    \"gatekeeperAssess\": false,"
echo "    \"notarize\": true"
echo "  }"
echo ""
echo "  And add notarization script in scripts/notarize.cjs"
echo ""

# =====================================================
# STEP 6: Attempt to open the app
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 6: Attempting to open the app...${RESET}"
echo ""
echo -e "${CYAN}Would you like to try opening the app now? (y/n)${RESET}"
read -p "> " OPEN_APP

if [[ $OPEN_APP == "y" || $OPEN_APP == "Y" ]]; then
    echo "Attempting to open $APP_NAME..."
    open "$APP_PATH"
    echo ""
    echo -e "${YELLOW}If the app still doesn't open, please try the manual approval method in Step 4.${RESET}"
else
    echo "You can open the app manually when ready."
fi

echo ""
echo -e "${BOLD}${GREEN}Script completed! ${RESET}"
echo -e "${CYAN}If you continue to have issues, please contact Ebdaa Work Time support.${RESET}"
echo ""
