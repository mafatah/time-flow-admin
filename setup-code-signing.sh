#!/bin/bash

# =====================================================
# SETUP CODE SIGNING FOR EBDAA WORK TIME
# =====================================================
# This script helps set up Apple Developer code signing
# for the time-flow-admin project
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
PROJECT_DIR="$(pwd)"
PACKAGE_JSON="${PROJECT_DIR}/package.json"
NOTARIZE_SCRIPT="${PROJECT_DIR}/scripts/notarize.cjs"
DESKTOP_DIR="/Users/$(whoami)/Desktop"
TEAM_ID=""
APPLE_ID=""
APP_PASSWORD=""
CERTIFICATE_NAME=""
CERTIFICATE_TYPE=""
CERTIFICATE_PATH=""

# =====================================================
# HELPER FUNCTIONS
# =====================================================

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}✗ Command '$1' not found. Please install it first.${RESET}"
    return 1
  fi
  return 0
}

prompt_yes_no() {
  local prompt="$1"
  local response
  
  while true; do
    echo -e -n "${CYAN}${prompt} (y/n): ${RESET}"
    read -r response
    case "$response" in
      [yY]|[yY][eE][sS]) return 0 ;;
      [nN]|[nN][oO]) return 1 ;;
      *) echo -e "${YELLOW}Please answer yes (y) or no (n).${RESET}" ;;
    esac
  done
}

backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    local backup="${file}.bak.$(date +%Y%m%d%H%M%S)"
    echo -e "${YELLOW}Creating backup of $file to $backup${RESET}"
    cp "$file" "$backup"
  fi
}

# =====================================================
# STEP 1: Check prerequisites
# =====================================================
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║         EBDAA WORK TIME - CODE SIGNING SETUP               ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}${PURPLE}STEP 1: Checking prerequisites...${RESET}"

# Check if we're in the project directory
if [ ! -f "$PACKAGE_JSON" ]; then
  echo -e "${RED}✗ Not in the project directory. Please run this script from the time-flow-admin root directory.${RESET}"
  exit 1
else
  echo -e "${GREEN}✓ Found package.json - we're in the project directory.${RESET}"
fi

# Check required tools
echo -e "${CYAN}Checking required tools...${RESET}"
MISSING_TOOLS=0

for cmd in node npm electron-builder security codesign xcrun; do
  if check_command "$cmd"; then
    echo -e "${GREEN}✓ $cmd is installed.${RESET}"
  else
    MISSING_TOOLS=1
  fi
done

if [ $MISSING_TOOLS -eq 1 ]; then
  echo -e "${RED}✗ Some required tools are missing. Please install them and try again.${RESET}"
  exit 1
fi

# =====================================================
# STEP 2: Check existing certificates
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 2: Checking existing certificates...${RESET}"

echo -e "${CYAN}Listing available code signing certificates:${RESET}"
security find-identity -v -p codesigning

echo ""
echo -e "${CYAN}Do you already have a Developer ID certificate installed in your keychain?${RESET}"
if prompt_yes_no "Would you like to use an existing certificate?"; then
  echo -e "${CYAN}Available certificates:${RESET}"
  security find-identity -v -p codesigning | grep -E "Developer ID Application|Mac App Store" | nl
  
  echo -e "${CYAN}Enter the number of the certificate you want to use:${RESET}"
  read -r cert_num
  
  CERTIFICATE_NAME=$(security find-identity -v -p codesigning | grep -E "Developer ID Application|Mac App Store" | sed -n "${cert_num}p" | sed -E 's/.*"([^"]+)".*/\1/')
  
  if [[ "$CERTIFICATE_NAME" == *"Developer ID Application"* ]]; then
    CERTIFICATE_TYPE="developer_id"
    echo -e "${GREEN}✓ Selected Developer ID certificate: $CERTIFICATE_NAME${RESET}"
  elif [[ "$CERTIFICATE_NAME" == *"Mac App Store"* ]]; then
    CERTIFICATE_TYPE="app_store"
    echo -e "${GREEN}✓ Selected Mac App Store certificate: $CERTIFICATE_NAME${RESET}"
  else
    echo -e "${RED}✗ Invalid certificate selected.${RESET}"
    exit 1
  fi
  
  # Extract Team ID from certificate
  TEAM_ID=$(security find-certificate -c "$CERTIFICATE_NAME" -p | openssl x509 -noout -subject | grep -o "OU=[A-Z0-9]*" | cut -d= -f2 | head -1)
  echo -e "${GREEN}✓ Team ID: $TEAM_ID${RESET}"
  
else
  echo -e "${YELLOW}! No existing certificate selected. Let's import one.${RESET}"
  
  # Check Desktop for certificates
  echo -e "${CYAN}Checking Desktop for certificate files...${RESET}"
  CERT_FILES=$(find "$DESKTOP_DIR" -maxdepth 1 -name "*.p12" -o -name "*.cer" | sort)
  
  if [ -z "$CERT_FILES" ]; then
    echo -e "${YELLOW}! No certificate files found on Desktop.${RESET}"
    echo -e "${CYAN}Please specify the full path to your certificate file (.p12 or .cer):${RESET}"
    read -r CERTIFICATE_PATH
  else
    echo -e "${GREEN}Found the following certificate files:${RESET}"
    echo "$CERT_FILES" | nl
    
    echo -e "${CYAN}Enter the number of the certificate file you want to use:${RESET}"
    read -r cert_file_num
    
    CERTIFICATE_PATH=$(echo "$CERT_FILES" | sed -n "${cert_file_num}p")
  fi
  
  # Import the certificate
  if [ -f "$CERTIFICATE_PATH" ]; then
    echo -e "${CYAN}Importing certificate from $CERTIFICATE_PATH...${RESET}"
    
    if [[ "$CERTIFICATE_PATH" == *.p12 ]]; then
      echo -e "${YELLOW}You'll be prompted for the certificate password.${RESET}"
      if security import "$CERTIFICATE_PATH" -k ~/Library/Keychains/login.keychain-db; then
        echo -e "${GREEN}✓ Certificate imported successfully.${RESET}"
      else
        echo -e "${RED}✗ Failed to import certificate.${RESET}"
        exit 1
      fi
    elif [[ "$CERTIFICATE_PATH" == *.cer ]]; then
      if security import "$CERTIFICATE_PATH" -k ~/Library/Keychains/login.keychain-db; then
        echo -e "${GREEN}✓ Certificate imported successfully.${RESET}"
      else
        echo -e "${RED}✗ Failed to import certificate.${RESET}"
        exit 1
      fi
    else
      echo -e "${RED}✗ Unsupported certificate format. Please use .p12 or .cer files.${RESET}"
      exit 1
    fi
    
    # Now select the imported certificate
    echo -e "${CYAN}Please select the imported certificate:${RESET}"
    security find-identity -v -p codesigning | grep -E "Developer ID Application|Mac App Store" | nl
    
    echo -e "${CYAN}Enter the number of the certificate you want to use:${RESET}"
    read -r cert_num
    
    CERTIFICATE_NAME=$(security find-identity -v -p codesigning | grep -E "Developer ID Application|Mac App Store" | sed -n "${cert_num}p" | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [[ "$CERTIFICATE_NAME" == *"Developer ID Application"* ]]; then
      CERTIFICATE_TYPE="developer_id"
      echo -e "${GREEN}✓ Selected Developer ID certificate: $CERTIFICATE_NAME${RESET}"
    elif [[ "$CERTIFICATE_NAME" == *"Mac App Store"* ]]; then
      CERTIFICATE_TYPE="app_store"
      echo -e "${GREEN}✓ Selected Mac App Store certificate: $CERTIFICATE_NAME${RESET}"
    else
      echo -e "${RED}✗ Invalid certificate selected.${RESET}"
      exit 1
    fi
    
    # Extract Team ID from certificate
    TEAM_ID=$(security find-certificate -c "$CERTIFICATE_NAME" -p | openssl x509 -noout -subject | grep -o "OU=[A-Z0-9]*" | cut -d= -f2 | head -1)
    echo -e "${GREEN}✓ Team ID: $TEAM_ID${RESET}"
  else
    echo -e "${RED}✗ Certificate file not found: $CERTIFICATE_PATH${RESET}"
    exit 1
  fi
fi

# =====================================================
# STEP 3: Collect Apple ID information for notarization
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 3: Setting up notarization credentials...${RESET}"

echo -e "${CYAN}Enter your Apple ID email:${RESET}"
read -r APPLE_ID

echo -e "${CYAN}For notarization, you need an app-specific password.${RESET}"
echo -e "${CYAN}You can create one at https://appleid.apple.com under Security > App-Specific Passwords.${RESET}"
echo -e "${CYAN}Enter your app-specific password:${RESET}"
read -rs APP_PASSWORD
echo ""

# =====================================================
# STEP 4: Update package.json
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 4: Updating package.json...${RESET}"

# Backup package.json
backup_file "$PACKAGE_JSON"

# Update package.json with proper code signing configuration
if [ "$CERTIFICATE_TYPE" = "developer_id" ]; then
  echo -e "${CYAN}Updating package.json for Developer ID signing...${RESET}"
  
  # Use jq if available, otherwise use sed
  if command -v jq &> /dev/null; then
    jq --arg cert "$CERTIFICATE_NAME" '.build.mac.identity = $cert | .build.mac.hardenedRuntime = true | .build.mac.gatekeeperAssess = false | .build.mac.notarize = true' "$PACKAGE_JSON" > "${PACKAGE_JSON}.new"
    mv "${PACKAGE_JSON}.new" "$PACKAGE_JSON"
  else
    # Backup original
    cp "$PACKAGE_JSON" "${PACKAGE_JSON}.orig"
    
    # Use sed to update package.json
    sed -i '' 's/"identity": null/"identity": "'"$CERTIFICATE_NAME"'"/' "$PACKAGE_JSON"
    sed -i '' 's/"hardenedRuntime": false/"hardenedRuntime": true/' "$PACKAGE_JSON"
    sed -i '' 's/"gatekeeperAssess": false/"gatekeeperAssess": false/' "$PACKAGE_JSON"
    sed -i '' 's/"notarize": null/"notarize": true/' "$PACKAGE_JSON"
  fi
  
  echo -e "${GREEN}✓ Updated package.json with Developer ID signing configuration.${RESET}"
  
elif [ "$CERTIFICATE_TYPE" = "app_store" ]; then
  echo -e "${CYAN}Updating package.json for Mac App Store signing...${RESET}"
  
  # Use jq if available, otherwise use sed
  if command -v jq &> /dev/null; then
    jq --arg cert "$CERTIFICATE_NAME" '.build.mac.identity = $cert | .build.mac.hardenedRuntime = true | .build.mac.entitlements = "build/entitlements.mac.plist" | .build.mac.provisioningProfile = "embedded.provisionprofile" | .build.mac.type = "distribution"' "$PACKAGE_JSON" > "${PACKAGE_JSON}.new"
    mv "${PACKAGE_JSON}.new" "$PACKAGE_JSON"
  else
    # Backup original
    cp "$PACKAGE_JSON" "${PACKAGE_JSON}.orig"
    
    # Use sed to update package.json
    sed -i '' 's/"identity": null/"identity": "'"$CERTIFICATE_NAME"'"/' "$PACKAGE_JSON"
    sed -i '' 's/"hardenedRuntime": false/"hardenedRuntime": true/' "$PACKAGE_JSON"
    # Add entitlements and provisioning profile
    sed -i '' '/"hardenedRuntime": true/a\
    "entitlements": "build/entitlements.mac.plist",\
    "provisioningProfile": "embedded.provisionprofile",\
    "type": "distribution",' "$PACKAGE_JSON"
  fi
  
  echo -e "${GREEN}✓ Updated package.json with Mac App Store signing configuration.${RESET}"
fi

# =====================================================
# STEP 5: Create notarization script
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 5: Creating notarization script...${RESET}"

# Create scripts directory if it doesn't exist
mkdir -p "$(dirname "$NOTARIZE_SCRIPT")"

# Backup existing script if it exists
backup_file "$NOTARIZE_SCRIPT"

# Create notarize.cjs script
cat > "$NOTARIZE_SCRIPT" << EOL
// scripts/notarize.cjs
const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');

exports.default = async function notarizing(context) {
  // Only notarize macOS builds
  if (context.electronPlatformName !== 'darwin') {
    console.log('Skipping notarization - not a macOS build');
    return;
  }

  // Skip notarization for MAS builds (Mac App Store)
  if (context.packager.config.mac && context.packager.config.mac.type === 'distribution') {
    console.log('Skipping notarization - MAS build');
    return;
  }

  // Get the app path
  const appBundleId = context.packager.appInfo.info._configuration.appId;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, \`\${appName}.app\`);
  
  if (!fs.existsSync(appPath)) {
    console.error(\`Cannot find application at: \${appPath}\`);
    return;
  }

  console.log(\`Notarizing \${appBundleId} at \${appPath}\`);

  try {
    // Start notarization
    await notarize({
      tool: 'notarytool',
      appBundleId,
      appPath,
      appleId: '${APPLE_ID}',
      appleIdPassword: '${APP_PASSWORD}',
      teamId: '${TEAM_ID}',
    });
    
    console.log(\`Successfully notarized \${appName}\`);
  } catch (error) {
    console.error(\`Notarization failed: \${error}\`);
    throw error;
  }
};
EOL

echo -e "${GREEN}✓ Created notarization script at $NOTARIZE_SCRIPT${RESET}"

# =====================================================
# STEP 6: Create entitlements file
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 6: Creating entitlements file...${RESET}"

# Create entitlements file
mkdir -p "build"
cat > "build/entitlements.mac.plist" << EOL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.personal-information.photos-library</key>
    <true/>
    <key>com.apple.security.personal-information.location</key>
    <true/>
</dict>
</plist>
EOL

echo -e "${GREEN}✓ Created entitlements file at build/entitlements.mac.plist${RESET}"

# =====================================================
# STEP 7: Install required dependencies
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 7: Installing required dependencies...${RESET}"

echo -e "${CYAN}Installing @electron/notarize package...${RESET}"
npm install --save-dev @electron/notarize

echo -e "${GREEN}✓ Installed required dependencies.${RESET}"

# =====================================================
# STEP 8: Build the app
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 8: Building the app...${RESET}"

if prompt_yes_no "Would you like to build the app now?"; then
  echo -e "${CYAN}Building the app with proper signing...${RESET}"
  
  # Clean previous builds
  rm -rf dist
  
  # Build the app
  if [ "$CERTIFICATE_TYPE" = "developer_id" ]; then
    npm run build
  elif [ "$CERTIFICATE_TYPE" = "app_store" ]; then
    # For Mac App Store build, we need to set the type to mas
    if command -v jq &> /dev/null; then
      jq '.build.mac.target = [{"target": "mas", "arch": ["arm64", "x64"]}]' "$PACKAGE_JSON" > "${PACKAGE_JSON}.new"
      mv "${PACKAGE_JSON}.new" "$PACKAGE_JSON"
    else
      sed -i '' 's/"target": "dmg"/"target": "mas"/' "$PACKAGE_JSON"
    fi
    
    npm run build
  fi
  
  # Check if build was successful
  if [ -d "dist" ]; then
    echo -e "${GREEN}✓ App built successfully!${RESET}"
  else
    echo -e "${RED}✗ App build failed.${RESET}"
    exit 1
  fi
else
  echo -e "${YELLOW}! Skipping build step. You can build the app later with 'npm run build'.${RESET}"
fi

# =====================================================
# STEP 9: Verify signing
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 9: Verifying code signing...${RESET}"

# Find the app bundle
APP_BUNDLE=$(find dist -name "*.app" -type d | head -1)

if [ -d "$APP_BUNDLE" ]; then
  echo -e "${CYAN}Verifying code signing for $APP_BUNDLE...${RESET}"
  
  # Verify code signing
  codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"
  VERIFY_RESULT=$?
  
  if [ $VERIFY_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ App is properly signed!${RESET}"
    
    # Check notarization status
    if [ "$CERTIFICATE_TYPE" = "developer_id" ]; then
      echo -e "${CYAN}Checking notarization status...${RESET}"
      spctl --assess --verbose=2 "$APP_BUNDLE"
      NOTARIZE_RESULT=$?
      
      if [ $NOTARIZE_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓ App is properly notarized!${RESET}"
      else
        echo -e "${YELLOW}! App may not be properly notarized. This is normal if you just built it.${RESET}"
        echo -e "${YELLOW}! Notarization can take a few minutes to complete.${RESET}"
      fi
    fi
  else
    echo -e "${RED}✗ App signing verification failed.${RESET}"
  fi
else
  echo -e "${YELLOW}! Could not find built app bundle to verify.${RESET}"
fi

# =====================================================
# STEP 10: App Store Connect instructions
# =====================================================
echo ""
echo -e "${BOLD}${PURPLE}STEP 10: Next steps...${RESET}"

if [ "$CERTIFICATE_TYPE" = "developer_id" ]; then
  echo -e "${CYAN}Your app is now set up for Developer ID distribution:${RESET}"
  echo -e "  1. The app has been signed with your Developer ID certificate."
  echo -e "  2. Notarization has been configured with your Apple ID."
  echo -e "  3. When you build the app with 'npm run build', it will be automatically notarized."
  echo -e ""
  echo -e "${CYAN}To distribute your app:${RESET}"
  echo -e "  1. Find the built DMG in the 'dist' folder."
  echo -e "  2. Test it on another Mac to ensure Gatekeeper doesn't block it."
  echo -e "  3. Distribute it via your website or other channels."
  
elif [ "$CERTIFICATE_TYPE" = "app_store" ]; then
  echo -e "${CYAN}Your app is now set up for Mac App Store distribution:${RESET}"
  echo -e "  1. The app has been signed with your Mac App Store certificate."
  echo -e "  2. When you build the app with 'npm run build', it will create a .pkg file."
  echo -e ""
  echo -e "${CYAN}To submit to the App Store:${RESET}"
  echo -e "  1. Log in to App Store Connect: https://appstoreconnect.apple.com"
  echo -e "  2. Create a new app entry if you haven't already."
  echo -e "  3. Use Transporter app or xcrun altool to upload your .pkg file:"
  echo -e "     xcrun altool --upload-app -f path/to/YourApp.pkg -t osx -u \"${APPLE_ID}\" -p \"@keychain:AC_PASSWORD\""
  echo -e "  4. Complete the app submission process in App Store Connect."
fi

echo ""
echo -e "${BOLD}${GREEN}✓ Code signing setup complete!${RESET}"
echo -e "${CYAN}If you encounter any issues, please refer to Apple's documentation:${RESET}"
echo -e "  - https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution"
echo -e "  - https://developer.apple.com/documentation/xcode/distributing_your_app_through_the_mac_app_store"
echo ""
