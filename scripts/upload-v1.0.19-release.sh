#!/bin/bash

set -e

# Configuration
VERSION="v1.0.19"
REPO_OWNER="mafatah"
REPO_NAME="time-flow-admin"
RELEASE_DIR="releases/v1.0.19"
GITHUB_API="https://api.github.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting TimeFlow v1.0.19 Release Deployment${NC}"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Check if release files exist
if [ ! -f "$RELEASE_DIR/Ebdaa Work Time-1.0.19.dmg" ]; then
    echo -e "${RED}Error: Release files not found in $RELEASE_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Preparing release files...${NC}"

# Create temporary directory for renamed files
TEMP_DIR="/tmp/timeflow-release-$VERSION"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy and rename files with proper naming convention
if [ -f "$RELEASE_DIR/Ebdaa Work Time-1.0.19.dmg" ]; then
    cp "$RELEASE_DIR/Ebdaa Work Time-1.0.19.dmg" "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg"
fi

if [ -f "$RELEASE_DIR/Ebdaa Work Time-1.0.19-arm64.dmg" ]; then
    cp "$RELEASE_DIR/Ebdaa Work Time-1.0.19-arm64.dmg" "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg"
fi

# Create Windows and Linux placeholders (you'll need to build these)
echo -e "${YELLOW}⚠️  Note: You'll need to build and add Windows/Linux versions separately${NC}"

echo -e "${YELLOW}🏷️  Creating GitHub release...${NC}"

# Create the release
gh release create "$VERSION" \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --title "TimeFlow Desktop Agent $VERSION" \
    --notes "
# TimeFlow Desktop Agent $VERSION

## What's New
- Enhanced security and notarization
- Improved cross-platform compatibility
- Better auto-update mechanism
- Updated UI and performance improvements

## Downloads
- **macOS (Apple Silicon)**: TimeFlow-$VERSION-ARM64.dmg
- **macOS (Intel)**: TimeFlow-$VERSION-Intel.dmg
- **Windows**: TimeFlow-$VERSION-Setup.exe *(Coming Soon)*
- **Linux**: TimeFlow-$VERSION.AppImage *(Coming Soon)*

## Installation
1. Download the appropriate file for your platform
2. Follow the installation instructions on our [download page](https://worktime.ebdaadt.com/download)

## Security
All releases are code-signed and notarized for enhanced security.

---
*Built with ❤️ by Ebdaa Digital Technology*
" \
    --draft

echo -e "${YELLOW}📤 Uploading release assets...${NC}"

# Upload the DMG files
if [ -f "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg" ]; then
    echo -e "${YELLOW}📤 Uploading Intel DMG...${NC}"
    gh release upload "$VERSION" "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg" --repo "$REPO_OWNER/$REPO_NAME"
fi

if [ -f "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg" ]; then
    echo -e "${YELLOW}📤 Uploading ARM64 DMG...${NC}"
    gh release upload "$VERSION" "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg" --repo "$REPO_OWNER/$REPO_NAME"
fi

echo -e "${GREEN}✅ Release assets uploaded successfully!${NC}"

# Calculate SHA512 hashes for the uploaded files
echo -e "${YELLOW}🔐 Calculating file hashes...${NC}"

INTEL_SHA512=""
ARM64_SHA512=""
INTEL_SIZE=""
ARM64_SIZE=""

if [ -f "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg" ]; then
    INTEL_SHA512=$(shasum -a 512 "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg" | cut -d' ' -f1)
    INTEL_SIZE=$(stat -f%z "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg" 2>/dev/null || stat -c%s "$TEMP_DIR/TimeFlow-$VERSION-Intel.dmg")
fi

if [ -f "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg" ]; then
    ARM64_SHA512=$(shasum -a 512 "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg" | cut -d' ' -f1)
    ARM64_SIZE=$(stat -f%z "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg" 2>/dev/null || stat -c%s "$TEMP_DIR/TimeFlow-$VERSION-ARM64.dmg")
fi

echo -e "${YELLOW}📝 Updating auto-updater configuration files...${NC}"

# Update latest-mac.yml
if [ -n "$INTEL_SHA512" ] || [ -n "$ARM64_SHA512" ]; then
    cat > latest-mac.yml << EOF
version: 1.0.19
files:
EOF

    if [ -n "$INTEL_SHA512" ]; then
        cat >> latest-mac.yml << EOF
  - url: TimeFlow-$VERSION-Intel.dmg
    sha512: $INTEL_SHA512
    size: $INTEL_SIZE
EOF
    fi

    if [ -n "$ARM64_SHA512" ]; then
        cat >> latest-mac.yml << EOF
  - url: TimeFlow-$VERSION-ARM64.dmg
    sha512: $ARM64_SHA512
    size: $ARM64_SIZE
EOF
    fi

    # Set primary file (prefer Intel for backward compatibility)
    PRIMARY_FILE="TimeFlow-$VERSION-Intel.dmg"
    PRIMARY_SHA512="$INTEL_SHA512"
    if [ -z "$INTEL_SHA512" ]; then
        PRIMARY_FILE="TimeFlow-$VERSION-ARM64.dmg"
        PRIMARY_SHA512="$ARM64_SHA512"
    fi

    cat >> latest-mac.yml << EOF
path: $PRIMARY_FILE
sha512: $PRIMARY_SHA512
releaseDate: '$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'
EOF
fi

echo -e "${YELLOW}🌐 Updating download page...${NC}"

# Update the download page to use v1.0.19
sed -i.bak 's/const version = "v1.0.16";/const version = "v1.0.19";/' src/pages/download/index.tsx

echo -e "${GREEN}✅ Configuration files updated!${NC}"

# Clean up temporary directory
rm -rf "$TEMP_DIR"

echo -e "${GREEN}🎉 Release deployment completed!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Build and upload Windows (.exe) and Linux (.AppImage) versions"
echo "2. Update latest.yml with Windows/Linux file details"
echo "3. Publish the draft release on GitHub"
echo "4. Deploy the updated web app"
echo ""
echo -e "${GREEN}🔗 Release URL: https://github.com/$REPO_OWNER/$REPO_NAME/releases/tag/$VERSION${NC}"

# Ask if user wants to publish the release now
read -p "Do you want to publish the release now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    gh release edit "$VERSION" --repo "$REPO_OWNER/$REPO_NAME" --draft=false
    echo -e "${GREEN}✅ Release published successfully!${NC}"
else
    echo -e "${YELLOW}📋 Release created as draft. You can publish it later from GitHub.${NC}"
fi 