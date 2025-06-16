#!/bin/bash

# TimeFlow Automated Release Script
# Signs, notarizes, and deploys DMG and EXE files to GitHub releases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Apple Developer Configuration
APPLE_ID="alshqawe66@gmail.com"
APPLE_PASSWORD="icmi-tdzi-ydvi-lszi"
TEAM_ID="6GW49LK9V9"
CERTIFICATE_PATH="~/Desktop/CertificateSigningRequest.certSigningRequest"

# App Configuration
APP_NAME="TimeFlow"
BUNDLE_ID="com.ebdaadt.timetracker"
DEVELOPER_ID="Ebdaa Digital Technology"

# GitHub Configuration
GITHUB_REPO="mafatah/time-flow-admin"
GITHUB_TOKEN=${GITHUB_TOKEN:-""}

echo -e "${BLUE}🚀 TimeFlow Automated Release Pipeline Starting...${NC}"
echo "=================================================="

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check prerequisites
check_prerequisites() {
    log "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if running on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log "${RED}❌ This script must be run on macOS for notarization${NC}"
        exit 1
    fi
    
    # Check required tools
    local tools=("node" "npm" "electron-builder" "xcrun" "git")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            log "${RED}❌ Required tool not found: $tool${NC}"
            exit 1
        fi
    done
    
    # Check GitHub token
    if [[ -z "$GITHUB_TOKEN" ]]; then
        log "${YELLOW}⚠️ GITHUB_TOKEN not set. Please set it for automatic release upload${NC}"
        read -p "Enter GitHub token (or press Enter to skip): " GITHUB_TOKEN
    fi
    
    log "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to get next version
get_next_version() {
    local current_version=$(node -p "require('./package.json').version")
    log "${BLUE}📦 Current version: $current_version${NC}"
    
    # Parse version (assuming semantic versioning)
    local IFS='.'
    read -ra VERSION_PARTS <<< "$current_version"
    local major=${VERSION_PARTS[0]}
    local minor=${VERSION_PARTS[1]}
    local patch=${VERSION_PARTS[2]}
    
    # Increment patch version
    patch=$((patch + 1))
    local new_version="$major.$minor.$patch"
    
    echo "$new_version"
}

# Function to update version in package.json
update_version() {
    local new_version=$1
    log "${BLUE}📝 Updating version to $new_version...${NC}"
    
    # Update package.json version
    npm version $new_version --no-git-tag-version
    
    # Update any other version references
    if [[ -f "src/version.ts" ]]; then
        sed -i '' "s/export const VERSION = .*/export const VERSION = '$new_version';/" src/version.ts
    fi
    
    log "${GREEN}✅ Version updated to $new_version${NC}"
}

# Function to build the application
build_app() {
    log "${BLUE}🔨 Building application...${NC}"
    
    # Clean previous builds
    rm -rf dist/
    rm -rf build/
    
    # Install dependencies
    npm install
    
    # Build web version
    npm run build
    
    # Build electron version
    npm run build:all
    
    log "${GREEN}✅ Application built successfully${NC}"
}

# Function to setup code signing
setup_code_signing() {
    log "${BLUE}🔐 Setting up code signing...${NC}"
    
    # Import certificate if needed
    if [[ -f "$CERTIFICATE_PATH" ]]; then
        log "${BLUE}📜 Importing developer certificate...${NC}"
        # The certificate should already be in keychain for electron-builder to use
    fi
    
    # Set up notarization credentials
    log "${BLUE}🔑 Setting up notarization credentials...${NC}"
    export APPLE_ID="$APPLE_ID"
    export APPLE_ID_PASSWORD="$APPLE_PASSWORD"
    export APPLE_TEAM_ID="$TEAM_ID"
    
    log "${GREEN}✅ Code signing setup complete${NC}"
}

# Function to build and sign releases
build_signed_releases() {
    log "${BLUE}🏗️ Building signed releases...${NC}"
    
    # Build signed DMG and EXE files
    npx electron-builder --mac --win --publish=never \
        --config.mac.identity="Developer ID Application: $DEVELOPER_ID ($TEAM_ID)" \
        --config.mac.notarize.teamId="$TEAM_ID" \
        --config.win.certificateFile="" \
        --config.win.publisherName="$DEVELOPER_ID"
    
    log "${GREEN}✅ Signed releases built${NC}"
}

# Function to notarize DMG
notarize_dmg() {
    log "${BLUE}📋 Starting notarization process...${NC}"
    
    # Find the DMG file
    local dmg_file=$(find dist/ -name "*.dmg" | head -1)
    if [[ -z "$dmg_file" ]]; then
        log "${RED}❌ No DMG file found for notarization${NC}"
        return 1
    fi
    
    log "${BLUE}🔄 Notarizing: $(basename $dmg_file)${NC}"
    
    # Submit for notarization
    local notarize_result=$(xcrun notarytool submit "$dmg_file" \
        --apple-id "$APPLE_ID" \
        --password "$APPLE_PASSWORD" \
        --team-id "$TEAM_ID" \
        --wait)
    
    if echo "$notarize_result" | grep -q "Successfully received"; then
        log "${GREEN}✅ Notarization successful${NC}"
        
        # Staple the notarization
        log "${BLUE}📎 Stapling notarization...${NC}"
        xcrun stapler staple "$dmg_file"
        log "${GREEN}✅ Notarization stapled${NC}"
    else
        log "${RED}❌ Notarization failed${NC}"
        echo "$notarize_result"
        return 1
    fi
}

# Function to create GitHub release
create_github_release() {
    local version=$1
    log "${BLUE}🌐 Creating GitHub release v$version...${NC}"
    
    if [[ -z "$GITHUB_TOKEN" ]]; then
        log "${YELLOW}⚠️ Skipping GitHub release - no token provided${NC}"
        return 0
    fi
    
    # Create release notes
    local release_notes="## TimeFlow v$version

### 🎉 New Features & Improvements

- Enhanced desktop agent with improved error handling
- Fixed anti-cheat detection system
- Improved screenshot display and capture
- Better configuration management with caching
- Enhanced user session handling

### 🔧 Technical Improvements

- Optimized config loading with TTL caching
- Fixed user ID validation during tracking
- Improved debug console functionality
- Enhanced activity monitoring
- Better cross-platform input detection

### 📱 Desktop App Features

- Signed and notarized for macOS
- Auto-update functionality
- System tray integration
- Real-time activity tracking
- Anti-cheat monitoring

### 🌐 Web Admin Features

- Complete admin dashboard
- Real-time user monitoring
- Screenshot management
- Time tracking reports
- Project management

---
**Download the appropriate version for your platform:**
- **macOS**: \`TimeFlow-v$version-ARM64.dmg\` (Apple Silicon) or \`TimeFlow-v$version-Intel.dmg\` (Intel)
- **Windows**: \`TimeFlow-v$version-Setup.exe\`

**Auto-update**: Existing users will be notified of this update automatically."

    # Create the release
    local release_response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPO/releases" \
        -d "{
            \"tag_name\": \"v$version\",
            \"target_commitish\": \"main\",
            \"name\": \"TimeFlow v$version\",
            \"body\": $(echo "$release_notes" | jq -R -s .),
            \"draft\": false,
            \"prerelease\": false
        }")
    
    local upload_url=$(echo "$release_response" | jq -r '.upload_url' | sed 's/{?name,label}//')
    
    if [[ "$upload_url" == "null" ]]; then
        log "${RED}❌ Failed to create GitHub release${NC}"
        echo "$release_response" | jq .
        return 1
    fi
    
    log "${GREEN}✅ GitHub release created${NC}"
    
    # Upload assets
    upload_release_assets "$upload_url" "$version"
}

# Function to upload release assets
upload_release_assets() {
    local upload_url=$1
    local version=$2
    
    log "${BLUE}📤 Uploading release assets...${NC}"
    
    # Find and upload DMG files
    for dmg_file in dist/*.dmg; do
        if [[ -f "$dmg_file" ]]; then
            local filename=$(basename "$dmg_file")
            local new_filename="TimeFlow-v$version-$(echo $filename | sed 's/.*-//')"
            
            log "${BLUE}📤 Uploading: $new_filename${NC}"
            curl -s -X POST \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Content-Type: application/octet-stream" \
                --data-binary @"$dmg_file" \
                "$upload_url?name=$new_filename"
        fi
    done
    
    # Find and upload EXE files
    for exe_file in dist/*.exe; do
        if [[ -f "$exe_file" ]]; then
            local filename=$(basename "$exe_file")
            local new_filename="TimeFlow-v$version-Setup.exe"
            
            log "${BLUE}📤 Uploading: $new_filename${NC}"
            curl -s -X POST \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Content-Type: application/octet-stream" \
                --data-binary @"$exe_file" \
                "$upload_url?name=$new_filename"
        fi
    done
    
    log "${GREEN}✅ Release assets uploaded${NC}"
}

# Function to update download links in web components
update_web_download_links() {
    local version=$1
    log "${BLUE}🌐 Updating web download links...${NC}"
    
    # Update desktop download component
    if [[ -f "src/components/ui/desktop-download.tsx" ]]; then
        sed -i '' "s/const currentVersion = \".*\";/const currentVersion = \"$version\";/" src/components/ui/desktop-download.tsx
        log "${GREEN}✅ Updated desktop-download.tsx${NC}"
    fi
    
    # Update download page component  
    if [[ -f "src/pages/download/index.tsx" ]]; then
        sed -i '' "s/const version = \"v.*\";/const version = \"v$version\";/" src/pages/download/index.tsx
        log "${GREEN}✅ Updated download page${NC}"
    fi
    
    # Update any README files with download links
    if [[ -f "public/README.md" ]]; then
        sed -i '' "s|releases/download/v[0-9]\+\.[0-9]\+\.[0-9]\+/|releases/download/v$version/|g" public/README.md
        log "${GREEN}✅ Updated public README${NC}"
    fi
    
    log "${GREEN}✅ Web download links updated${NC}"
}

# Function to update auto-updater links
update_auto_updater_links() {
    local version=$1
    log "${BLUE}🔗 Updating auto-updater links...${NC}"
    
    # Update latest-mac.yml
    cat > public/latest-mac.yml << EOF
version: $version
files:
  - url: https://github.com/$GITHUB_REPO/releases/download/v$version/TimeFlow-v$version-ARM64.dmg
    sha512: $(shasum -a 512 dist/*arm64*.dmg | cut -d ' ' -f1 | base64)
    size: $(stat -f%z dist/*arm64*.dmg 2>/dev/null || stat -c%s dist/*arm64*.dmg)
    blockMapSize: $(stat -f%z dist/*arm64*.dmg.blockmap 2>/dev/null || stat -c%s dist/*arm64*.dmg.blockmap)
  - url: https://github.com/$GITHUB_REPO/releases/download/v$version/TimeFlow-v$version-Intel.dmg
    sha512: $(shasum -a 512 dist/*x64*.dmg | cut -d ' ' -f1 | base64)
    size: $(stat -f%z dist/*x64*.dmg 2>/dev/null || stat -c%s dist/*x64*.dmg)
    blockMapSize: $(stat -f%z dist/*x64*.dmg.blockmap 2>/dev/null || stat -c%s dist/*x64*.dmg.blockmap)
path: TimeFlow-v$version-ARM64.dmg
sha512: $(shasum -a 512 dist/*arm64*.dmg | cut -d ' ' -f1 | base64)
releaseDate: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
EOF

    # Update latest.yml for Windows
    cat > public/latest.yml << EOF
version: $version
files:
  - url: https://github.com/$GITHUB_REPO/releases/download/v$version/TimeFlow-v$version-Setup.exe
    sha512: $(shasum -a 512 dist/*.exe | cut -d ' ' -f1 | base64)
    size: $(stat -f%z dist/*.exe 2>/dev/null || stat -c%s dist/*.exe)
path: TimeFlow-v$version-Setup.exe
sha512: $(shasum -a 512 dist/*.exe | cut -d ' ' -f1 | base64)
releaseDate: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
EOF
    
    log "${GREEN}✅ Auto-updater links updated${NC}"
}

# Function to commit and push changes
commit_and_push() {
    local version=$1
    log "${BLUE}📝 Committing and pushing changes...${NC}"
    
    # Add all changes
    git add .
    
    # Commit with version bump message
    git commit -m "🚀 Release v$version

- Signed and notarized DMG for macOS
- Signed EXE for Windows  
- Updated auto-updater links
- Enhanced desktop agent functionality
- Improved error handling and performance

[skip ci]"
    
    # Create and push tag
    git tag "v$version"
    git push origin main
    git push origin "v$version"
    
    log "${GREEN}✅ Changes committed and pushed${NC}"
}

# Function to cleanup
cleanup() {
    log "${BLUE}🧹 Cleaning up...${NC}"
    
    # Unset sensitive environment variables
    unset APPLE_ID_PASSWORD
    unset GITHUB_TOKEN
    
    log "${GREEN}✅ Cleanup complete${NC}"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Setup trap for cleanup
    trap cleanup EXIT
    
    # Execute pipeline
    check_prerequisites
    
    local new_version=$(get_next_version)
    log "${GREEN}🎯 Target version: $new_version${NC}"
    
    update_version "$new_version"
    build_app
    setup_code_signing
    build_signed_releases
    notarize_dmg
    create_github_release "$new_version"
    update_web_download_links "$new_version"
    update_auto_updater_links "$new_version"
    commit_and_push "$new_version"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "=================================================="
    log "${GREEN}🎉 TimeFlow Release Pipeline Complete!${NC}"
    log "${GREEN}📦 Version: $new_version${NC}"
    log "${GREEN}⏱️ Duration: ${duration}s${NC}"
    log "${GREEN}🌐 Release URL: https://github.com/$GITHUB_REPO/releases/tag/v$new_version${NC}"
    echo "=================================================="
}

# Run main function
main "$@" 