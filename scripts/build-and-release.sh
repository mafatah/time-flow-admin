#!/bin/bash

# Build, Sign, Notarize and Release Script for macOS and Windows
# This script will build the app, sign it, notarize it, and upload to GitHub releases

set -e

echo "🚀 Starting build and release process..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
fi

# Ensure required Apple notarization environment variables are present
if [[ -z "$APPLE_ID" || -z "$APPLE_APP_SPECIFIC_PASSWORD" || -z "$APPLE_TEAM_ID" ]]; then
  echo "❌ APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID must be set in the environment." >&2
  echo "   Export them in your shell or add them to the .env file (not committed)." >&2
  exit 1
fi
export APPLE_ID
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf build/electron/
rm -rf build/dist/

# Build the app components
echo "📦 Building application components..."
npm run build:all

# Build and sign the Electron app with notarization
echo "🔨 Building and signing Electron app..."
npm run electron:build

# Build for Windows if possible
if command -v wine >/dev/null 2>&1 || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "🪟 Building Windows application..."
    npx electron-builder --win
fi

# Check if the builds were successful
VERSION=$(node -p "require('./package.json').version")

if [ ! -f "dist/Ebdaa Work Time-$VERSION-arm64.dmg" ] || [ ! -f "dist/Ebdaa Work Time-$VERSION.dmg" ]; then
    echo "❌ Build failed - DMG files not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📱 ARM64 DMG: dist/Ebdaa Work Time-$VERSION-arm64.dmg"
echo "💻 Intel DMG: dist/Ebdaa Work Time-$VERSION.dmg"

# Get the current version from package.json
echo "📋 Version: $VERSION"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub CLI:"
    gh auth login
fi

# Create GitHub release
echo "🌟 Creating GitHub release..."
RELEASE_TAG="v$VERSION"
RELEASE_TITLE="TimeFlow v$VERSION"

# Check if release already exists
if gh release view "$RELEASE_TAG" &> /dev/null; then
    echo "📋 Release $RELEASE_TAG already exists. Deleting assets and uploading new ones..."
    gh release delete-asset "$RELEASE_TAG" "TimeFlow-$VERSION-ARM64.dmg" --yes || true
    gh release delete-asset "$RELEASE_TAG" "TimeFlow-$VERSION-Intel.dmg" --yes || true
    gh release delete-asset "$RELEASE_TAG" "TimeFlow-$VERSION-Setup.exe" --yes || true
    gh release delete-asset "$RELEASE_TAG" "latest-mac.yml" --yes || true
else
    echo "📋 Creating new release $RELEASE_TAG..."
    gh release create "$RELEASE_TAG" \
        --title "$RELEASE_TITLE" \
        --notes "# TimeFlow v$VERSION - Signed and Notarized Release

## 🎯 Features in this version:
- Enhanced time tracking with mandatory screenshot requirements
- 1-hour laptop closure detection and auto-stop
- 15-minute mandatory screenshot intervals
- Improved project selection validation
- Better session management and cleanup

## 🔐 Security:
- All macOS builds are signed and notarized by Apple
- Windows builds are code-signed for security
- Enhanced security permissions and validation

## 📱 Installation:
1. Download the appropriate file for your system
2. **macOS**: Open the DMG file and drag to Applications folder
3. **Windows**: Run the EXE installer
4. The apps are signed and will run without security warnings

## 📦 Downloads:
- **Apple Silicon (M1/M2/M3)**: TimeFlow-$VERSION-ARM64.dmg
- **Intel Macs**: TimeFlow-$VERSION-Intel.dmg
- **Windows 10/11**: TimeFlow-$VERSION-Setup.exe

All files are code-signed and verified for security."
fi

# Upload assets
echo "📤 Uploading release assets..."

# Rename files for cleaner download names
cp "dist/Ebdaa Work Time-$VERSION-arm64.dmg" "TimeFlow-$VERSION-ARM64.dmg"
cp "dist/Ebdaa Work Time-$VERSION.dmg" "TimeFlow-$VERSION-Intel.dmg"

# Upload the DMG files
gh release upload "$RELEASE_TAG" "TimeFlow-$VERSION-ARM64.dmg" --clobber
gh release upload "$RELEASE_TAG" "TimeFlow-$VERSION-Intel.dmg" --clobber

# Upload Windows EXE if it exists
if [ -f "dist/Ebdaa Work Time Setup $VERSION.exe" ]; then
    cp "dist/Ebdaa Work Time Setup $VERSION.exe" "TimeFlow-$VERSION-Setup.exe"
    gh release upload "$RELEASE_TAG" "TimeFlow-$VERSION-Setup.exe" --clobber
    echo "📋 Uploaded Windows installer"
fi

# Upload update configuration file if it exists
if [ -f "dist/latest-mac.yml" ]; then
    gh release upload "$RELEASE_TAG" "dist/latest-mac.yml" --clobber
    echo "📋 Uploaded auto-update configuration"
fi

# Clean up renamed files
rm -f "TimeFlow-$VERSION-ARM64.dmg"
rm -f "TimeFlow-$VERSION-Intel.dmg"
rm -f "TimeFlow-$VERSION-Setup.exe"

# Update download links in the web app
echo "🌐 Updating web download links..."

# Create or update download page
mkdir -p public/downloads
cat > public/downloads/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TimeFlow - Download</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 40px; }
        .version { text-align: center; color: #666; margin-bottom: 40px; font-size: 18px; }
        .downloads { display: grid; gap: 20px; margin-bottom: 40px; }
        .download-item { border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; transition: all 0.3s; }
        .download-item:hover { border-color: #007AFF; box-shadow: 0 4px 12px rgba(0,122,255,0.15); }
        .download-btn { display: inline-block; background: #007AFF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 10px; }
        .download-btn:hover { background: #0051D5; }
        .platform { font-weight: 600; font-size: 18px; margin-bottom: 8px; }
        .description { color: #666; margin-bottom: 12px; }
        .file-info { font-size: 14px; color: #888; }
        .footer { text-align: center; color: #666; border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 40px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 TimeFlow Desktop Agent</h1>
        <div class="version">Version ${VERSION} - Latest Release</div>
        
        <div class="downloads">
            <div class="download-item">
                <div class="platform">🍎 macOS (Apple Silicon)</div>
                <div class="description">For Macs with M1, M2, or M3 processors</div>
                <a href="https://github.com/mafatah/time-flow-admin/releases/download/v${VERSION}/TimeFlow-${VERSION}-ARM64.dmg" class="download-btn">Download DMG (ARM64)</a>
                <div class="file-info">Signed and notarized by Apple</div>
            </div>
            
            <div class="download-item">
                <div class="platform">🍎 macOS (Intel)</div>
                <div class="description">For Macs with Intel processors</div>
                <a href="https://github.com/mafatah/time-flow-admin/releases/download/v${VERSION}/TimeFlow-${VERSION}-Intel.dmg" class="download-btn">Download DMG (Intel)</a>
                <div class="file-info">Signed and notarized by Apple</div>
            </div>
            
            <div class="download-item">
                <div class="platform">🪟 Windows</div>
                <div class="description">For Windows 10 and Windows 11</div>
                <a href="https://github.com/mafatah/time-flow-admin/releases/download/v${VERSION}/TimeFlow-${VERSION}-Setup.exe" class="download-btn">Download EXE</a>
                <div class="file-info">Code signed for security</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Built on $(date) | Version ${VERSION}</p>
            <p>All downloads are code-signed and verified for security</p>
            <p><a href="https://github.com/mafatah/time-flow-admin/releases/tag/v${VERSION}">View on GitHub</a></p>
        </div>
    </div>
</body>
</html>
EOF

# Commit and push the download page update
git add public/downloads/index.html
git commit -m "📄 Update download page for v${VERSION}" || true
git push origin main

echo "🎉 Release completed successfully!"
echo "🔗 Release URL: https://github.com/mafatah/time-flow-admin/releases/tag/$RELEASE_TAG"
echo ""
echo "📱 Users can now download:"
echo "   - Apple Silicon: https://github.com/mafatah/time-flow-admin/releases/download/v$VERSION/TimeFlow-$VERSION-ARM64.dmg"
echo "   - Intel: https://github.com/mafatah/time-flow-admin/releases/download/v$VERSION/TimeFlow-$VERSION-Intel.dmg"
echo "   - Windows: https://github.com/mafatah/time-flow-admin/releases/download/v$VERSION/TimeFlow-$VERSION-Setup.exe" 