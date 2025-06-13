#!/bin/bash

# Code Signing Setup Script for Ebdaa Work Time
# This script sets up code signing certificates for both macOS and Windows

set -e

echo "🔐 Ebdaa Work Time - Code Signing Setup"
echo "======================================"

# Apple Developer Credentials
APPLE_ID="alshqawe66@gmail.com"
APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
APPLE_TEAM_ID="6GW49LK9V9"

# Create build directory if it doesn't exist
mkdir -p build

echo "📋 Setting up environment variables..."

# Create or update .env file with signing credentials
cat > .env.signing << EOF
# Apple Developer Credentials
APPLE_ID=${APPLE_ID}
APPLE_APP_SPECIFIC_PASSWORD=${APPLE_APP_SPECIFIC_PASSWORD}
APPLE_TEAM_ID=${APPLE_TEAM_ID}

# Code Signing
CSC_LINK=
CSC_KEY_PASSWORD=
EOF

echo "✅ Created .env.signing file"

echo ""
echo "🍎 macOS Code Signing Setup"
echo "============================"

# Check if Developer ID certificate exists
if security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "✅ Developer ID Application certificate found"
    
    # Get certificate name
    CERT_NAME=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed 's/.*") \(.*\)/\1/')
    echo "📋 Certificate: $CERT_NAME"
    
    # Update package.json with correct identity
    sed -i '' "s/\"identity\": \".*\"/\"identity\": \"$CERT_NAME\"/" package.json
    echo "✅ Updated package.json with certificate identity"
else
    echo "❌ No Developer ID Application certificate found"
    echo ""
    echo "🛠️  TO SETUP macOS CODE SIGNING:"
    echo "================================"
    echo "1. Open Keychain Access"
    echo "2. Create Certificate Signing Request (CSR):"
    echo "   - Keychain Access → Certificate Assistant → Request Certificate from CA"
    echo "   - User Email: ${APPLE_ID}"
    echo "   - Common Name: Ebdaa Digital Technology"
    echo "   - Save to: Desktop/CertificateSigningRequest.certSigningRequest"
    echo ""
    echo "3. Go to Apple Developer Portal:"
    echo "   - https://developer.apple.com/account/resources/certificates/list"
    echo "   - Create new Certificate → Developer ID Application"
    echo "   - Upload your CSR file"
    echo "   - Download the certificate"
    echo ""
    echo "4. Double-click the downloaded certificate to install in Keychain"
    echo "5. Run this script again"
    echo ""
fi

echo ""
echo "🪟 Windows Code Signing Setup"
echo "============================"

if [ -f "build/code-signing-cert.p12" ]; then
    echo "✅ Windows code signing certificate found at build/code-signing-cert.p12"
else
    echo "❌ Windows code signing certificate not found"
    echo ""
    echo "🛠️  TO SETUP WINDOWS CODE SIGNING:"
    echo "================================="
    echo "1. Purchase/obtain a code signing certificate from:"
    echo "   - DigiCert, Sectigo, GlobalSign, or other CA"
    echo "   - Make sure it's for 'Code Signing' not just SSL"
    echo ""
    echo "2. Export certificate as .p12 file:"
    echo "   - Include private key"
    echo "   - Set a strong password"
    echo "   - Save as: build/code-signing-cert.p12"
    echo ""
    echo "3. Set password in .env.signing:"
    echo "   CSC_KEY_PASSWORD=your_cert_password"
    echo ""
fi

echo ""
echo "📱 App Store Connect API Setup"
echo "=============================="

if [ -f "build/AuthKey.p8" ]; then
    echo "✅ App Store Connect API key found"
else
    echo "❌ App Store Connect API key not found"
    echo ""
    echo "🛠️  TO SETUP NOTARIZATION:"
    echo "========================="
    echo "1. Go to App Store Connect:"
    echo "   - https://appstoreconnect.apple.com/access/api"
    echo "   - Create API Key with Developer role"
    echo "   - Download AuthKey_XXXXXXXXXX.p8"
    echo ""
    echo "2. Save as build/AuthKey.p8"
    echo "3. Note the Key ID and Issuer ID for notarization"
    echo ""
fi

echo ""
echo "🔧 Entitlements Setup"
echo "===================="

# Create macOS entitlements file
cat > build/entitlements.mac.plist << EOF
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
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ Created macOS entitlements file"

echo ""
echo "📊 Summary"
echo "=========="
echo "✅ Environment variables configured"
echo "✅ macOS entitlements created"
echo "📋 Next steps:"
echo "   1. Install certificates (see instructions above)"
echo "   2. Run: npm run build:signed"
echo "   3. Check build logs for any signing issues"

echo ""
echo "🔗 Useful Links:"
echo "================"
echo "Apple Developer Portal: https://developer.apple.com/account/"
echo "App Store Connect API: https://appstoreconnect.apple.com/access/api"
echo "Keychain Access: /Applications/Utilities/Keychain Access.app" 