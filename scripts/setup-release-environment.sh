#!/bin/bash

# Setup script for TimeFlow release environment

echo "🔧 TimeFlow Release Environment Setup"
echo "====================================="

# Check if app-specific password is already set
if [[ -n "$APPLE_APP_SPECIFIC_PASSWORD" ]]; then
    echo "✅ APPLE_APP_SPECIFIC_PASSWORD is already set"
else
    echo ""
    echo "⚠️  APPLE_APP_SPECIFIC_PASSWORD is not set"
    echo ""
    echo "To generate an app-specific password:"
    echo "1. Go to https://appleid.apple.com/account/manage"
    echo "2. Sign in with: alshqawe66@gmail.com"
    echo "3. Go to 'Security' section"
    echo "4. Under 'App-Specific Passwords', click 'Generate Password'"
    echo "5. Enter 'TimeFlow Notarization' as the label"
    echo "6. Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)"
    echo ""
    echo "Then set it as an environment variable:"
    echo "export APPLE_APP_SPECIFIC_PASSWORD='your-generated-password'"
    echo ""
    echo "Or create a .env file in the project root:"
    echo "APPLE_APP_SPECIFIC_PASSWORD=your-generated-password"
    echo ""
fi

# Check GitHub CLI authentication
echo ""
echo "🔍 Checking GitHub CLI..."
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found"
    echo "Installing GitHub CLI..."
    if command -v brew &> /dev/null; then
        brew install gh
    else
        echo "Please install GitHub CLI manually: https://cli.github.com/"
        exit 1
    fi
else
    echo "✅ GitHub CLI is installed"
fi

# Check GitHub authentication
if gh auth status >/dev/null 2>&1; then
    echo "✅ GitHub CLI is authenticated"
    GITHUB_USER=$(gh api user --jq '.login')
    echo "   Authenticated as: $GITHUB_USER"
else
    echo "❌ GitHub CLI not authenticated"
    echo "Please run: gh auth login"
    echo "And authenticate with your GitHub account"
fi

# Check certificates
echo ""
echo "🔍 Checking code signing certificates..."
CERT_COUNT=$(security find-identity -v -p codesigning | grep -c "Developer ID Application")
if [[ $CERT_COUNT -gt 0 ]]; then
    echo "✅ Found $CERT_COUNT Developer ID certificate(s)"
    security find-identity -v -p codesigning | grep "Developer ID Application"
else
    echo "❌ No Developer ID certificates found"
    echo ""
    echo "To install certificates:"
    echo "1. Download your certificates from Apple Developer Portal"
    echo "2. Double-click the .cer files to install them"
    echo "3. Or use: security import certificate.cer -k ~/Library/Keychains/login.keychain-db"
fi

# Check Node.js and npm
echo ""
echo "🔍 Checking build tools..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js not found"
    exit 1
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm not found"
    exit 1
fi

# Check other required tools
echo ""
echo "🔍 Checking signing tools..."
TOOLS=("codesign" "xcrun" "security" "spctl")
for tool in "${TOOLS[@]}"; do
    if command -v "$tool" &> /dev/null; then
        echo "✅ $tool is available"
    else
        echo "❌ $tool not found"
        echo "Please install Xcode Command Line Tools: xcode-select --install"
    fi
done

echo ""
echo "🎯 Ready to run release pipeline?"
echo ""
echo "If all checks passed, you can run:"
echo "  ./scripts/automated-release-pipeline.sh"
echo ""
echo "Or run individual steps:"
echo "  ./scripts/automated-release-pipeline.sh setup-only     # Setup notarization only"
echo "  ./scripts/automated-release-pipeline.sh build-only     # Build applications only"
echo "  ./scripts/automated-release-pipeline.sh sign-only      # Sign applications only"
echo "  ./scripts/automated-release-pipeline.sh notarize-only  # Notarize applications only"
echo "  ./scripts/automated-release-pipeline.sh release-only   # Create GitHub release only"
echo "  ./scripts/automated-release-pipeline.sh web-only       # Update web links only"
echo "" 