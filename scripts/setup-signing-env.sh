#!/bin/bash

# Setup Signing Environment Script
# Creates the necessary environment file for code signing

set -e

echo "🔐 Setting up code signing environment..."

# Create .env.signing file
cat > .env.signing << 'EOF'
# Code Signing Environment Variables
# DO NOT COMMIT THIS FILE TO GIT

# Apple Developer Credentials
APPLE_ID=alshqawe66@gmail.com
APPLE_APP_SPECIFIC_PASSWORD=icmi-tdzi-ydvi-lszi
APPLE_TEAM_ID=6GW49LK9V9

# Certificate paths
CSC_LINK=~/Desktop/CertificateSigningRequest.certSigningRequest
CSC_KEY_PASSWORD=icmi-tdzi-ydvi-lszi

# Keychain password for automated signing
KEYCHAIN_PASSWORD=icmi-tdzi-ydvi-lszi

# GitHub credentials (if needed for automated releases)
GITHUB_TOKEN=

# Build configuration
NOTARIZE=true
SIGN_APPS=true
EOF

echo "✅ Created .env.signing file"

# Make sure the file is not tracked by git
if ! grep -q ".env.signing" .gitignore; then
    echo ".env.signing" >> .gitignore
    echo "✅ Added .env.signing to .gitignore"
fi

# Check for certificate
if [ -f "~/Desktop/CertificateSigningRequest.certSigningRequest" ]; then
    echo "✅ Certificate signing request found"
else
    echo "⚠️  Certificate signing request not found at ~/Desktop/"
    echo "📋 Make sure CertificateSigningRequest.certSigningRequest is in your Desktop folder"
fi

# Set up keychain for automated signing
echo "🔑 Setting up keychain for automated signing..."
security unlock-keychain -p "icmi-tdzi-ydvi-lszi" ~/Library/Keychains/login.keychain-db 2>/dev/null || true

echo ""
echo "🎉 Signing environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Ensure your developer certificate is installed in Keychain Access"
echo "2. Run: ./scripts/deploy-release.sh"
echo "3. Or run: ./scripts/deploy-release.sh minor (for minor version bump)"
echo "4. Or run: ./scripts/deploy-release.sh major (for major version bump)" 