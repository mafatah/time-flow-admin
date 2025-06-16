#!/bin/bash

# Complete Deployment Script for Ebdaa Work Time
# Handles version increment, building, signing, notarizing, GitHub release, and web updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 Ebdaa Work Time - Complete Deployment Pipeline${NC}"
echo "=================================================="

# Function to increment version
increment_version() {
    local version_type=${1:-patch}
    echo -e "${BLUE}📈 Incrementing version ($version_type)${NC}"
    
    # Get current version
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo "Current version: $CURRENT_VERSION"
    
    # Split version into parts
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    # Increment based on type
    case $version_type in
        "major")
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        "minor")
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        "patch"|*)
            PATCH=$((PATCH + 1))
            ;;
    esac
    
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
    echo "New version: $NEW_VERSION"
    
    # Update package.json
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$NEW_VERSION';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    "
    
    echo -e "${GREEN}✅ Version updated to $NEW_VERSION${NC}"
    return 0
}

# Function to setup signing credentials
setup_signing() {
    echo -e "${BLUE}🔐 Setting up code signing credentials${NC}"
    
    # Apple credentials for notarization
    export APPLE_ID="alshqawe66@gmail.com"
    export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
    export APPLE_TEAM_ID="6GW49LK9V9"
    
    # Check for certificate
    if [ -f "~/Desktop/CertificateSigningRequest.certSigningRequest" ]; then
        echo "✅ Certificate signing request found"
    else
        echo -e "${YELLOW}⚠️  Certificate signing request not found at ~/Desktop/${NC}"
    fi
    
    # Set up keychain access for signing
    security unlock-keychain -p "icmi-tdzi-ydvi-lszi" ~/Library/Keychains/login.keychain-db 2>/dev/null || true
    
    echo -e "${GREEN}✅ Signing credentials configured${NC}"
}

# Function to build applications
build_applications() {
    echo -e "${BLUE}🏗️  Building applications${NC}"
    
    # Clean previous builds
    rm -rf dist build/dist
    
    # Build web application
    echo "📦 Building web application..."
    npm run build
    
    # Prepare electron build
    echo "🔧 Preparing electron build..."
    npm run build:all
    
    # Build signed applications
    echo "🔨 Building signed applications..."
    
    # macOS builds with signing and notarization
    echo "🍎 Building macOS applications..."
    npx electron-builder --mac --arm64 --publish=never
    npx electron-builder --mac --x64 --publish=never
    
    # Windows build (if certificate available)
    if [ -f "build/code-signing-cert.p12" ]; then
        echo "🪟 Building Windows application..."
        npx electron-builder --win --x64 --publish=never
    else
        echo -e "${YELLOW}⚠️  Skipping Windows build - no code signing certificate${NC}"
    fi
    
    echo -e "${GREEN}✅ Applications built successfully${NC}"
}

# Function to verify signatures and notarization
verify_builds() {
    echo -e "${BLUE}🔍 Verifying signatures and notarization${NC}"
    
    # Find DMG files
    for dmg in dist/*.dmg; do
        if [ -f "$dmg" ]; then
            echo "🔍 Verifying $(basename "$dmg")..."
            
            # Check code signature
            if codesign --verify --verbose "$dmg" 2>/dev/null; then
                echo -e "${GREEN}✅ Valid signature: $(basename "$dmg")${NC}"
            else
                echo -e "${RED}❌ Invalid signature: $(basename "$dmg")${NC}"
            fi
            
            # Check notarization
            if spctl --assess --verbose "$dmg" 2>/dev/null; then
                echo -e "${GREEN}✅ Notarized: $(basename "$dmg")${NC}"
            else
                echo -e "${YELLOW}⚠️  Not notarized: $(basename "$dmg")${NC}"
            fi
        fi
    done
    
    # Find EXE files
    for exe in dist/*.exe; do
        if [ -f "$exe" ]; then
            echo "🔍 Windows executable: $(basename "$exe")"
            # Note: Windows signature verification would need signtool on Windows
        fi
    done
}

# Function to create GitHub release
create_github_release() {
    local version=$1
    echo -e "${BLUE}🌐 Creating GitHub release${NC}"
    
    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI not installed${NC}"
        echo "📋 Install with: brew install gh"
        echo "📋 Then run: gh auth login"
        return 1
    fi
    
    # Create release directory
    RELEASE_DIR="releases/v$version"
    mkdir -p "$RELEASE_DIR"
    
    # Copy release files
    if [ -d "dist" ]; then
        cp dist/*.dmg "$RELEASE_DIR/" 2>/dev/null || true
        cp dist/*.exe "$RELEASE_DIR/" 2>/dev/null || true
        cp dist/*.AppImage "$RELEASE_DIR/" 2>/dev/null || true
        cp dist/latest*.yml "$RELEASE_DIR/" 2>/dev/null || true
    fi
    
    # Create release notes
    RELEASE_NOTES="# Ebdaa Work Time v$version

## 🎉 New Release

Professional employee time tracking with enterprise-grade features.

### 📦 Downloads Available

$(ls "$RELEASE_DIR"/*.dmg 2>/dev/null | while read file; do echo "- **$(basename "$file")** - macOS"; done)
$(ls "$RELEASE_DIR"/*.exe 2>/dev/null | while read file; do echo "- **$(basename "$file")** - Windows"; done)
$(ls "$RELEASE_DIR"/*.AppImage 2>/dev/null | while read file; do echo "- **$(basename "$file")** - Linux"; done)

### ✨ Features

- 📸 Smart Screenshot Capture
- ⏱️ Precise Time Tracking  
- 📊 Activity Monitoring
- 🔄 Real-time Sync
- 🛡️ Enterprise Security
- 🎯 Intelligent Detection

### 🔧 Installation Instructions

#### macOS:
1. Download the appropriate DMG file for your Mac
2. Open the DMG file
3. Drag 'Ebdaa Work Time.app' to your Applications folder
4. Launch from Applications

#### Windows:
1. Download the EXE installer
2. Right-click and 'Run as administrator'
3. Follow the installation wizard

---
**Ebdaa Digital Technology © $(date +%Y)**"

    # Create the GitHub release
    if gh release create "v$version" \
        --title "Ebdaa Work Time v$version" \
        --notes "$RELEASE_NOTES" \
        --draft \
        "$RELEASE_DIR"/*; then
        
        echo -e "${GREEN}✅ GitHub release created successfully!${NC}"
        echo "🔗 View at: https://github.com/mafatah/time-flow-admin/releases/tag/v$version"
        return 0
    else
        echo -e "${RED}❌ Failed to create GitHub release${NC}"
        return 1
    fi
}

# Function to update web download links
update_web_links() {
    local version=$1
    echo -e "${BLUE}🔗 Updating web download links${NC}"
    
    # Update latest-mac.yml for auto-updater
    if [ -f "dist/latest-mac.yml" ]; then
        cp "dist/latest-mac.yml" "latest-mac.yml"
        cp "dist/latest-mac.yml" "public/latest-mac.yml"
        echo -e "${GREEN}✅ Auto-updater configuration updated${NC}"
    fi
    
    # Update latest.yml for Windows
    if [ -f "dist/latest.yml" ]; then
        cp "dist/latest.yml" "latest.yml"
        echo -e "${GREEN}✅ Windows auto-updater configuration updated${NC}"
    fi
    
    # Run web link update script if it exists
    if [ -f "scripts/update-download-links.sh" ]; then
        ./scripts/update-download-links.sh "v$version"
    fi
}

# Function to commit and push changes
commit_and_push() {
    local version=$1
    echo -e "${BLUE}📝 Committing and pushing changes${NC}"
    
    # Add all changes
    git add .
    
    # Commit with version message
    git commit -m "🚀 Release v$version

- Version bump to $version
- Updated auto-updater configurations
- Built and signed applications
- Created GitHub release

Signed-off-by: Ebdaa Digital Technology <alshqawe66@gmail.com>"
    
    # Create version tag
    git tag -a "v$version" -m "Release v$version"
    
    # Push changes and tags
    git push origin main
    git push origin "v$version"
    
    echo -e "${GREEN}✅ Changes committed and pushed${NC}"
}

# Main deployment process
main() {
    echo "Starting complete deployment process..."
    
    # Parse command line arguments
    VERSION_TYPE=${1:-patch}
    
    echo "📋 Deployment Configuration:"
    echo "   Version increment: $VERSION_TYPE"
    echo "   Apple ID: alshqawe66@gmail.com"
    echo "   Team ID: 6GW49LK9V9"
    echo ""
    
    # Step 1: Increment version
    increment_version "$VERSION_TYPE"
    NEW_VERSION=$(node -p "require('./package.json').version")
    
    # Step 2: Setup signing
    setup_signing
    
    # Step 3: Build applications
    build_applications
    
    # Step 4: Verify builds
    verify_builds
    
    # Step 5: Create GitHub release
    if create_github_release "$NEW_VERSION"; then
        echo -e "${GREEN}✅ GitHub release created${NC}"
    else
        echo -e "${YELLOW}⚠️  GitHub release failed, continuing...${NC}"
    fi
    
    # Step 6: Update web links
    update_web_links "$NEW_VERSION"
    
    # Step 7: Commit and push
    commit_and_push "$NEW_VERSION"
    
    echo ""
    echo -e "${PURPLE}🎉 Deployment Complete!${NC}"
    echo "======================="
    echo "📦 Version: $NEW_VERSION"
    echo "🔗 GitHub: https://github.com/mafatah/time-flow-admin/releases/tag/v$NEW_VERSION"
    echo "📁 Files: releases/v$NEW_VERSION/"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Test the applications"
    echo "2. Publish the GitHub release"
    echo "3. Announce the release"
}

# Run main function with arguments
main "$@" 