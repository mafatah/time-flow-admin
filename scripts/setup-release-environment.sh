#!/bin/bash
set -e

# 🔧 TimeFlow Release Environment Setup
# Prepares environment for automated signing and notarization

echo "
🔧 ========================================
   TimeFlow Release Environment Setup
========================================
"

# Configuration
APPLE_ID="alshqawe66@gmail.com"
APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
APPLE_TEAM_ID="6GW49LK9V9"
GITHUB_TOKEN="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"
SIGNING_IDENTITY="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

# Functions
log_info() { echo "ℹ️  $1"; }
log_success() { echo "✅ $1"; }
log_warning() { echo "⚠️  $1"; }
log_error() { echo "❌ $1"; }

# Check if running on macOS
check_platform() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_error "This script must be run on macOS for signing and notarization"
        exit 1
    fi
    log_success "Running on macOS"
}

# Install required tools
install_tools() {
    log_info "Checking and installing required tools..."
    
    # Check for Homebrew
    if ! command -v brew >/dev/null 2>&1; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # Install GitHub CLI
    if ! command -v gh >/dev/null 2>&1; then
        log_info "Installing GitHub CLI..."
        brew install gh
    fi
    
    # Install Node.js if not present
    if ! command -v node >/dev/null 2>&1; then
        log_info "Installing Node.js..."
        brew install node
    fi
    
    log_success "All required tools are installed"
}

# Setup GitHub CLI authentication
setup_github_auth() {
    log_info "Setting up GitHub CLI authentication..."
    
    # Set the token
    echo "$GITHUB_TOKEN" | gh auth login --with-token
    
    # Verify authentication
    if gh auth status >/dev/null 2>&1; then
        log_success "GitHub CLI authenticated successfully"
        gh auth status
    else
        log_error "GitHub CLI authentication failed"
        exit 1
    fi
}

# Check signing certificate
check_certificate() {
    log_info "Checking signing certificate..."
    
    # List available signing identities
    log_info "Available signing identities:"
    security find-identity -v -p codesigning
    
    # Check for our specific identity
    if security find-identity -v -p codesigning | grep -q "$SIGNING_IDENTITY"; then
        log_success "Signing certificate found: $SIGNING_IDENTITY"
    else
        log_error "Signing certificate not found: $SIGNING_IDENTITY"
        log_info "Please install the Developer ID Application certificate from Apple Developer Portal"
        log_info "Or import the .p12 certificate file if you have one"
        exit 1
    fi
}

# Test notarization setup
test_notarization() {
    log_info "Testing notarization setup..."
    
    # Check if notarytool is available
    if ! command -v xcrun >/dev/null 2>&1; then
        log_error "Xcode Command Line Tools not found. Please install with: xcode-select --install"
        exit 1
    fi
    
    # Test authentication with Apple
    log_info "Testing Apple ID authentication..."
    
    # Create a test file to validate notarization credentials
    echo "Testing notarization credentials..." > /tmp/test-notarization.txt
    
    # We can't actually test without submitting a real app, so we'll just verify the credentials format
    if [[ "$APPLE_ID" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_success "Apple ID format is valid: $APPLE_ID"
    else
        log_error "Invalid Apple ID format: $APPLE_ID"
        exit 1
    fi
    
    if [[ ${#APPLE_APP_SPECIFIC_PASSWORD} -eq 19 && "$APPLE_APP_SPECIFIC_PASSWORD" =~ ^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$ ]]; then
        log_success "App-specific password format is valid"
    else
        log_error "Invalid app-specific password format. Should be xxxx-xxxx-xxxx-xxxx"
        exit 1
    fi
    
    if [[ ${#APPLE_TEAM_ID} -eq 10 && "$APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ ]]; then
        log_success "Team ID format is valid: $APPLE_TEAM_ID"
    else
        log_error "Invalid Team ID format: $APPLE_TEAM_ID"
        exit 1
    fi
    
    rm -f /tmp/test-notarization.txt
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p build
    mkdir -p dist
    mkdir -p public/downloads
    mkdir -p scripts
    
    log_success "Directories created"
}

# Set environment variables
set_environment() {
    log_info "Setting up environment variables..."
    
    # Create environment file
    cat > .env.release << EOF
# TimeFlow Release Environment Variables
APPLE_ID="$APPLE_ID"
APPLE_APP_SPECIFIC_PASSWORD="$APPLE_APP_SPECIFIC_PASSWORD"
APPLE_TEAM_ID="$APPLE_TEAM_ID"
GITHUB_TOKEN="$GITHUB_TOKEN"
CSC_NAME="$SIGNING_IDENTITY"
CSC_IDENTITY_AUTO_DISCOVERY=false
EOF
    
    log_success "Environment variables set in .env.release"
    log_warning "Remember to source this file before running the release pipeline:"
    log_warning "source .env.release"
}

# Verify project structure
verify_project() {
    log_info "Verifying project structure..."
    
    local required_files=(
        "package.json"
        "src/pages/download/index.tsx"
        "src/components/ui/desktop-download.tsx"
        "electron/main.ts"
        "build/entitlements.mac.plist"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            exit 1
        fi
    done
    
    log_success "Project structure verified"
}

# Make scripts executable
make_scripts_executable() {
    log_info "Making scripts executable..."
    
    chmod +x scripts/*.sh
    
    log_success "Scripts are now executable"
}

# Main setup function
main() {
    log_info "Starting TimeFlow release environment setup..."
    
    check_platform
    install_tools
    setup_github_auth
    check_certificate
    test_notarization
    create_directories
    set_environment
    verify_project
    make_scripts_executable
    
    echo ""
    log_success "🎉 Release environment setup completed!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Source the environment: source .env.release"
    echo "2. Run the release pipeline: ./scripts/automated-release-pipeline.sh"
    echo ""
    echo "🔗 Useful Commands:"
    echo "- Test signing: security find-identity -v -p codesigning"
    echo "- Check GitHub auth: gh auth status"
    echo "- Verify certificate: security find-certificate -c '$SIGNING_IDENTITY'"
    echo ""
}

# Run main function
main "$@" 