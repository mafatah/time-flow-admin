#!/bin/bash

# =====================================================
# QUICK CERTIFICATE CHECK AND GATEKEEPER FIX
# =====================================================
# This script checks for available certificates and
# provides immediate fixes for Gatekeeper issues
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
DESKTOP_DIR="/Users/$(whoami)/Desktop"

echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║       CERTIFICATE CHECK & GATEKEEPER FIX UTILITY           ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# =====================================================
# STEP 1: Check if the app exists
# =====================================================
echo -e "${BOLD}${PURPLE}STEP 1: Checking if the app exists...${RESET}"

if [ -d "$APP_PATH" ]; then
    echo -e "${GREEN}✓ Found $APP_NAME in the Applications folder.${RESET}"
else
    echo -e "${YELLOW}! $APP_NAME not found in the Applications folder.${RESET}"
    echo -e "${YELLOW}! Please install the app first.${RESET}"
fi

# =====================================================
# STEP 2: Check for certificate files on Desktop
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 2: Checking for certificate files on Desktop...${RESET}"

CERT_FILES=$(find "$DESKTOP_DIR" -maxdepth 1 -name "*.p12" -o -name "*.cer" -o -name "*.certSigningRequest" -o -name "*.provisionprofile" | sort)

if [ -z "$CERT_FILES" ]; then
    echo -e "${YELLOW}! No certificate files found on Desktop.${RESET}"
else
    echo -e "${GREEN}✓ Found the following certificate files on Desktop:${RESET}"
    echo "$CERT_FILES" | nl
fi

# =====================================================
# STEP 3: Check certificates in keychain
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 3: Checking certificates in keychain...${RESET}"

echo -e "${CYAN}Developer certificates in keychain:${RESET}"
security find-identity -v -p codesigning | grep -E "Developer ID|Mac Developer|Apple Development" || echo -e "${YELLOW}! No developer certificates found in keychain.${RESET}"

# =====================================================
# STEP 4: Check app signing status
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 4: Checking app signing status...${RESET}"

if [ -d "$APP_PATH" ]; then
    echo -e "${CYAN}Current code signing status:${RESET}"
    codesign -dv --verbose=2 "$APP_PATH" 2>&1 || echo -e "${RED}✗ App is not properly signed.${RESET}"
    
    echo ""
    echo -e "${CYAN}Gatekeeper assessment:${RESET}"
    spctl --assess --verbose=2 "$APP_PATH" 2>&1 || echo -e "${RED}✗ App does not pass Gatekeeper assessment.${RESET}"
    
    echo ""
    echo -e "${CYAN}Checking quarantine attribute:${RESET}"
    xattr -l "$APP_PATH" | grep quarantine && echo -e "${YELLOW}! App has quarantine attribute (Gatekeeper will block it).${RESET}" || echo -e "${GREEN}✓ No quarantine attribute found.${RESET}"
fi

# =====================================================
# STEP 5: Provide immediate fix options
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 5: Immediate fix options:${RESET}"

echo -e "${BOLD}${CYAN}Option 1: Remove quarantine attribute (Quick Fix)${RESET}"
echo -e "  Run this command to bypass Gatekeeper for this app:"
echo -e "  ${BOLD}sudo xattr -rd com.apple.quarantine \"$APP_PATH\"${RESET}"
echo ""

echo -e "${BOLD}${CYAN}Option 2: Manual approval in Security & Privacy settings${RESET}"
echo -e "  1. Open System Preferences > Security & Privacy"
echo -e "  2. Look for message about blocked app"
echo -e "  3. Click 'Open Anyway' button"
echo ""

echo -e "${BOLD}${CYAN}Option 3: Sign the app with your developer certificate${RESET}"
echo -e "  If you have a Developer ID certificate, run:"
echo -e "  ${BOLD}codesign --force --deep --options runtime --sign \"Developer ID Application: YOUR NAME\" \"$APP_PATH\"${RESET}"
echo -e "  (Replace 'YOUR NAME' with your actual certificate name)"
echo ""

# =====================================================
# STEP 6: Offer to apply quick fix
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 6: Apply quick fix?${RESET}"

if [ -d "$APP_PATH" ]; then
    echo -e "${CYAN}Would you like to apply the quick fix (remove quarantine attribute)? (y/n)${RESET}"
    read -r APPLY_FIX
    
    if [[ "$APPLY_FIX" == "y" || "$APPLY_FIX" == "Y" ]]; then
        echo -e "${YELLOW}Removing quarantine attribute...${RESET}"
        sudo xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Quarantine attribute removed successfully!${RESET}"
            echo -e "${GREEN}✓ Try opening the app now - it should work.${RESET}"
        else
            echo -e "${RED}✗ Failed to remove quarantine attribute. Please try running the command manually.${RESET}"
        fi
    else
        echo -e "${YELLOW}Quick fix not applied. You can apply it manually using the commands above.${RESET}"
    fi
fi

echo ""
echo -e "${BOLD}${GREEN}Certificate check and fix options completed!${RESET}"
echo -e "${CYAN}For more advanced options like notarization and proper code signing setup,${RESET}"
echo -e "${CYAN}please run the setup-code-signing.sh script.${RESET}"
echo ""
