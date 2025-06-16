#!/bin/bash

# Automated Release Pipeline for TimeFlow Desktop Applications
# Handles: Build → Sign → Notarize → GitHub Release → Web Link Updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="1.0.22"
CERT_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"
TEAM_ID="6GW49LK9V9"
APPLE_ID="alshqawe66@gmail.com"
KEYCHAIN_PROFILE="timeflow-notarization"
GITHUB_REPO="mafatah/time-flow-admin"

echo -e "${BLUE}🚀 TimeFlow Automated Release Pipeline v${VERSION}${NC}"
echo "=================================================================="

# Step 1: Setup notarization credentials (if not exists)
setup_notarization() {
    echo -e "${YELLOW}🔐 Setting up notarization credentials...${NC}"
    
    if ! xcrun notarytool history --keychain-profile "$KEYCHAIN_PROFILE" >/dev/null 2>&1; then
        echo "Setting up notarization profile..."
        
        # Check if app-specific password is available
        if [[ -z "$APPLE_APP_SPECIFIC_PASSWORD" ]]; then
            echo -e "${RED}❌ APPLE_APP_SPECIFIC_PASSWORD environment variable not set${NC}"
            echo "Please set it with your app-specific password:"
            echo "export APPLE_APP_SPECIFIC_PASSWORD='your-app-specific-password'"
            exit 1
        fi
        
        xcrun notarytool store-credentials "$KEYCHAIN_PROFILE" \
            --apple-id "$APPLE_ID" \
            --password "$APPLE_APP_SPECIFIC_PASSWORD" \
            --team-id "$TEAM_ID"
            
        echo -e "${GREEN}✅ Notarization profile created${NC}"
    else
        echo -e "${GREEN}✅ Notarization profile already exists${NC}"
    fi
}

# Step 2: Clean and build applications
build_applications() {
    echo -e "${YELLOW}🔧 Building applications...${NC}"
    
    # Clean previous builds
    rm -rf dist/
    rm -rf build/
    
    # Apply environment fixes
    node scripts/fix-desktop-env.cjs
    
    # Build web application
    npm run build
    
    # Build all components
    npm run build:all
    
    # Build unsigned apps for all platforms
    echo "Building unsigned Electron applications..."
    npx electron-builder --mac --win --linux \
        --config.mac.identity=null \
        --config.mac.notarize=false \
        --publish=never
        
    echo -e "${GREEN}✅ Applications built successfully${NC}"
}

# Step 3: Sign macOS DMG files
sign_macos_apps() {
    echo -e "${YELLOW}🔏 Signing macOS applications...${NC}"
    
    cd dist
    
    # Find and sign DMG files
    for dmg in *.dmg; do
        if [[ -f "$dmg" ]]; then
            echo "Signing $dmg..."
            
            # Sign the DMG
            codesign --force --sign "$CERT_NAME" \
                --options runtime \
                --timestamp \
                "$dmg"
                
            # Verify signature
            if codesign --verify --verbose "$dmg" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ $dmg signed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to sign $dmg${NC}"
                exit 1
            fi
        fi
    done
    
    cd ..
}

# Step 4: Sign Windows EXE files
sign_windows_apps() {
    echo -e "${YELLOW}🔏 Signing Windows applications...${NC}"
    
    cd dist
    
    # Find EXE files
    for exe in *.exe; do
        if [[ -f "$exe" ]]; then
            echo "Windows EXE found: $exe"
            echo -e "${YELLOW}⚠️  Note: Windows signing requires a Windows certificate${NC}"
            echo -e "${YELLOW}⚠️  For now, EXE will be included unsigned${NC}"
            # TODO: Add Windows signing when certificate is available
        fi
    done
    
    cd ..
}

# Step 5: Notarize macOS DMG files
notarize_macos_apps() {
    echo -e "${YELLOW}📋 Notarizing macOS applications...${NC}"
    
    cd dist
    
    for dmg in *.dmg; do
        if [[ -f "$dmg" ]]; then
            echo "Notarizing $dmg..."
            
            # Submit for notarization
            echo "Submitting to Apple for notarization (this may take several minutes)..."
            xcrun notarytool submit "$dmg" \
                --keychain-profile "$KEYCHAIN_PROFILE" \
                --wait \
                --timeout 30m
                
            # Staple the notarization ticket
            echo "Stapling notarization ticket..."
            xcrun stapler staple "$dmg"
            
            # Verify notarization
            if spctl -a -t open --context context:primary-signature -v "$dmg" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ $dmg notarized and stapled successfully${NC}"
            else
                echo -e "${RED}❌ Notarization verification failed for $dmg${NC}"
                exit 1
            fi
        fi
    done
    
    cd ..
}

# Step 6: Create GitHub release
create_github_release() {
    echo -e "${YELLOW}📦 Creating GitHub release...${NC}"
    
    # Check if GitHub CLI is installed
    if ! command -v gh &> /dev/null; then
        echo "Installing GitHub CLI..."
        brew install gh
    fi
    
    # Check if authenticated
    if ! gh auth status >/dev/null 2>&1; then
        echo "Please authenticate with GitHub:"
        gh auth login
    fi
    
    # Create release notes
    cat > release-notes-v${VERSION}.md << EOF
# TimeFlow Desktop Applications v${VERSION}

## 🎉 Latest Release

Professional employee time tracking desktop applications with enterprise-grade features.

### 📦 Downloads Available

$(cd dist && for file in *.dmg *.exe *.AppImage; do
    if [[ -f "$file" ]]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "- **$file** ($size)"
    fi
done)

### ✨ Key Features

- 📸 **Smart Screenshot Capture** - Automated screenshots at random intervals
- ⏱️ **Precise Time Tracking** - Automatic start/stop with idle detection  
- 📊 **Activity Monitoring** - Track mouse, keyboard, and application usage
- 🔄 **Real-time Sync** - Seamless integration with web dashboard
- 🛡️ **Enterprise Security** - Code-signed and notarized applications
- 🎯 **Cross-Platform** - macOS (ARM64 + Intel) and Windows support

### 📋 Installation Instructions

#### macOS:
1. Download the appropriate DMG file for your Mac
2. Open the DMG file  
3. Drag "Ebdaa Work Time.app" to your Applications folder
4. Launch from Applications

#### Windows:
1. Download the Setup.exe file
2. Right-click and "Run as administrator"
3. Follow the installation wizard

### 🔧 Technical Details

- **Version:** ${VERSION}
- **Built with:** Electron 28.3.3, React, TypeScript
- **Platforms:** macOS 10.12+, Windows 10+
- **Security:** Code-signed with Developer ID certificate
- **Notarization:** Apple notarized for enhanced security

### 🆘 Support

For technical support, contact your system administrator.

---
**Ebdaa Digital Technology © 2025**
EOF

    # Delete existing release if it exists
    gh release delete "v${VERSION}" --yes >/dev/null 2>&1 || true
    
    # Create new release
    echo "Creating GitHub release v${VERSION}..."
    gh release create "v${VERSION}" \
        --title "TimeFlow Desktop Applications v${VERSION}" \
        --notes-file "release-notes-v${VERSION}.md" \
        --repo "$GITHUB_REPO"
        
    # Upload all built files
    cd dist
    echo "Uploading release assets..."
    for file in *.dmg *.exe *.AppImage; do
        if [[ -f "$file" ]]; then
            echo "Uploading $file..."
            gh release upload "v${VERSION}" "$file" --repo "$GITHUB_REPO"
        fi
    done
    cd ..
    
    # Clean up
    rm -f "release-notes-v${VERSION}.md"
    
    echo -e "${GREEN}✅ GitHub release created successfully${NC}"
}

# Step 7: Update auto-update configuration files
update_auto_update_configs() {
    echo -e "${YELLOW}🔄 Updating auto-update configuration files...${NC}"
    
    # Run the auto-update configuration script
    ./scripts/update-auto-update-config.sh
    
    echo -e "${GREEN}✅ Auto-update configurations updated${NC}"
}

# Step 8: Update web application download links
update_web_links() {
    echo -e "${YELLOW}🔗 Updating web application download links...${NC}"
    
    # Update download page with new release URLs
    BASE_URL="https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}"
    
    # Find the download page files
    DOWNLOAD_FILES=(
        "src/pages/download/index.tsx"
        "src/components/dashboard/QuickActions.tsx"
        "src/features/dashboard/components/QuickActions.tsx"
    )
    
    for file in "${DOWNLOAD_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            echo "Updating download links in $file..."
            
            # Create backup
            cp "$file" "${file}.backup"
            
            # Update download URLs using the GitHub release URLs
            sed -i '' -E "s|https://github.com/[^/]+/[^/]+/releases/download/v[0-9]+\.[0-9]+\.[0-9]+/|${BASE_URL}/|g" "$file"
            
            echo -e "${GREEN}✅ Updated $file${NC}"
        fi
    done
    
    # Deploy the web application
    echo "Deploying updated web application..."
    vercel --prod
    
    echo -e "${GREEN}✅ Web application updated and deployed${NC}"
}

# Step 9: Generate release summary
generate_summary() {
    echo -e "${YELLOW}📋 Generating release summary...${NC}"
    
    cd dist
    
    cat > "../RELEASE_SUMMARY_v${VERSION}.md" << EOF
# Release Summary - TimeFlow v${VERSION}

## 📦 Built Files

$(for file in *.dmg *.exe *.AppImage; do
    if [[ -f "$file" ]]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "- **$file** ($size)"
    fi
done)

## 🔗 Download URLs

$(for file in *.dmg *.exe *.AppImage; do
    if [[ -f "$file" ]]; then
        echo "- https://github.com/${GITHUB_REPO}/releases/download/v${VERSION}/$file"
    fi
done)

## ✅ Completed Steps

- [x] Applications built successfully  
- [x] macOS DMG files signed with Developer ID
- [x] macOS DMG files notarized by Apple
- [x] Windows EXE files prepared (signing pending certificate)
- [x] GitHub release created with all assets
- [x] Auto-update configuration files updated
- [x] Web application download links updated
- [x] Web application deployed to production

## 🎯 Next Steps

1. Test downloads from the web application
2. Verify applications install and run correctly
3. Monitor for any user issues or feedback

---
Generated: $(date)
EOF
    
    cd ..
    
    echo -e "${GREEN}✅ Release summary generated: RELEASE_SUMMARY_v${VERSION}.md${NC}"
}

# Main execution flow
main() {
    echo -e "${BLUE}Starting automated release pipeline...${NC}"
    
    # Check prerequisites
    if ! command -v codesign &> /dev/null; then
        echo -e "${RED}❌ codesign not found. Please install Xcode Command Line Tools.${NC}"
        exit 1
    fi
    
    if ! command -v xcrun &> /dev/null; then
        echo -e "${RED}❌ xcrun not found. Please install Xcode Command Line Tools.${NC}"
        exit 1
    fi
    
    # Execute pipeline steps
    setup_notarization
    build_applications
    sign_macos_apps
    sign_windows_apps
    notarize_macos_apps
    create_github_release
    update_auto_update_configs
    update_web_links
    generate_summary
    
    echo ""
    echo -e "${GREEN}🎉 Release pipeline completed successfully!${NC}"
    echo -e "${GREEN}🌟 TimeFlow v${VERSION} is now available for download${NC}"
    echo ""
    echo -e "${BLUE}📋 Summary:${NC}"
    echo "  • Version: v${VERSION}"
    echo "  • GitHub Release: https://github.com/${GITHUB_REPO}/releases/tag/v${VERSION}"
    echo "  • Web Admin: https://time-flow-admin-o13bwglim-m-afatah-hotmailcoms-projects.vercel.app"
    echo "  • Release Summary: RELEASE_SUMMARY_v${VERSION}.md"
}

# Handle script arguments
case "${1:-}" in
    "setup-only")
        setup_notarization
        ;;
    "build-only")
        build_applications
        ;;
    "sign-only")
        sign_macos_apps
        sign_windows_apps
        ;;
    "notarize-only")
        notarize_macos_apps
        ;;
    "release-only")
        create_github_release
        ;;
    "auto-update-only")
        update_auto_update_configs
        ;;
    "web-only")
        update_web_links
        ;;
    *)
        main
        ;;
esac 