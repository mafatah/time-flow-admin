#!/bin/bash

# 🔐 Code Signing Setup Script for Ebdaa Work Time
# This script sets up Apple Developer certificates for macOS code signing and notarization

set -e

echo "🔐 Setting up Code Signing for Ebdaa Work Time"
echo "============================================="

# Apple Developer Credentials
APPLE_ID="alshqawe66@gmail.com"
APPLE_PASSWORD="icmi-tdzi-ydvi-lszi"
APPLE_TEAM_ID="6GW49LK9V9"

# Certificate paths
CERT_DIR="$(pwd)/certificates"
CSR_FILE="$HOME/Desktop/CertificateSigningRequest.certSigningRequest"

# Create certificates directory
mkdir -p "$CERT_DIR"

echo "📋 Apple Developer Account:"
echo "   Apple ID: $APPLE_ID"
echo "   Team ID: $APPLE_TEAM_ID"
echo ""

# Check if CSR file exists
if [ ! -f "$CSR_FILE" ]; then
    echo "❌ Certificate Signing Request not found at: $CSR_FILE"
    echo "📝 Please create a CSR file using Keychain Access:"
    echo "   1. Open Keychain Access"
    echo "   2. Certificate Assistant > Request a Certificate From a Certificate Authority"
    echo "   3. Enter your email: $APPLE_ID"
    echo "   4. Select 'Saved to disk' and save as CertificateSigningRequest.certSigningRequest"
    echo "   5. Save to Desktop and run this script again"
    exit 1
fi

echo "✅ Found CSR file: $CSR_FILE"

# Setup app-specific password for notarization
echo "🔑 Setting up App-Specific Password for notarization..."
echo "📝 You need to create an App-Specific Password:"
echo "   1. Go to https://appleid.apple.com/account/manage"
echo "   2. Sign in with: $APPLE_ID"
echo "   3. Go to 'App-Specific Passwords'"
echo "   4. Generate a new password for 'Ebdaa Work Time Notarization'"
echo "   5. Copy the generated password"
echo ""

read -p "📋 Enter your App-Specific Password: " APP_SPECIFIC_PASSWORD

# Store credentials in keychain for notarization
echo "🔐 Storing notarization credentials in keychain..."
xcrun notarytool store-credentials "ebdaa-notarization" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APP_SPECIFIC_PASSWORD"

echo "✅ Notarization credentials stored successfully!"

# Create certificate configuration
cat > "$CERT_DIR/certificate-config.json" << EOF
{
  "appleId": "$APPLE_ID",
  "teamId": "$APPLE_TEAM_ID",
  "appSpecificPassword": "$APP_SPECIFIC_PASSWORD",
  "notarytoolProfile": "ebdaa-notarization",
  "certificateTypes": {
    "developerIdApplication": "Developer ID Application",
    "developerIdInstaller": "Developer ID Installer"
  }
}
EOF

echo "📄 Certificate configuration saved to: $CERT_DIR/certificate-config.json"

# Instructions for manual certificate download
echo ""
echo "📋 Next Steps - Download Certificates Manually:"
echo "=============================================="
echo "1. Go to https://developer.apple.com/account/resources/certificates/list"
echo "2. Sign in with: $APPLE_ID"
echo "3. Create two certificates using your CSR file:"
echo ""
echo "   🔐 Developer ID Application Certificate:"
echo "   - Click '+' to create new certificate"
echo "   - Select 'Developer ID Application'"
echo "   - Upload: $CSR_FILE"
echo "   - Download as: developer_id_application.cer"
echo "   - Save to: $CERT_DIR/"
echo ""
echo "   📦 Developer ID Installer Certificate:"
echo "   - Click '+' to create new certificate"  
echo "   - Select 'Developer ID Installer'"
echo "   - Upload: $CSR_FILE"
echo "   - Download as: developer_id_installer.cer"
echo "   - Save to: $CERT_DIR/"
echo ""
echo "4. After downloading both certificates, run:"
echo "   ./scripts/install-certificates.sh"
echo ""

# Create certificate installation script
cat > scripts/install-certificates.sh << 'EOF'
#!/bin/bash

# Install downloaded certificates
CERT_DIR="$(pwd)/certificates"

echo "🔐 Installing Code Signing Certificates"
echo "======================================"

if [ -f "$CERT_DIR/developer_id_application.cer" ]; then
    echo "📱 Installing Developer ID Application certificate..."
    security import "$CERT_DIR/developer_id_application.cer" -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign
    echo "✅ Developer ID Application certificate installed"
else
    echo "❌ Developer ID Application certificate not found at: $CERT_DIR/developer_id_application.cer"
fi

if [ -f "$CERT_DIR/developer_id_installer.cer" ]; then
    echo "📦 Installing Developer ID Installer certificate..."
    security import "$CERT_DIR/developer_id_installer.cer" -k ~/Library/Keychains/login.keychain-db -T /usr/bin/codesign
    echo "✅ Developer ID Installer certificate installed"
else
    echo "❌ Developer ID Installer certificate not found at: $CERT_DIR/developer_id_installer.cer"
fi

echo ""
echo "🔍 Checking installed certificates..."
security find-identity -v -p codesigning

echo ""
echo "✅ Certificate installation complete!"
echo "📋 You can now run: npm run build:signed"
EOF

chmod +x scripts/install-certificates.sh

echo "✅ Setup script created: scripts/install-certificates.sh"
echo ""
echo "🚀 Code signing setup is ready!"
echo "📋 Follow the manual steps above to complete the setup." 