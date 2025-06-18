#!/bin/bash

# 🔐 TIMEFLOW ENVIRONMENT SETUP
# Securely set up environment variables for the release process
# This script should be sourced, not executed: source scripts/setup-environment.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info "🔐 Setting up TimeFlow release environment..."

# Apple Developer Credentials
export APPLE_ID="alshqawe66@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="icmi-tdzi-ydvi-lszi"
export APPLE_TEAM_ID="6GW49LK9V9"

# GitHub Credentials
export GITHUB_TOKEN="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"

# Electron Builder Configuration
export CSC_IDENTITY_AUTO_DISCOVERY=false
export CSC_NAME="Developer ID Application: Ebdaa Digital Technology (6GW49LK9V9)"

# Notarization Configuration
export APPLEID="$APPLE_ID"
export APPLEIDPASS="$APPLE_APP_SPECIFIC_PASSWORD"

print_success "Environment variables set:"
print_info "  ✅ APPLE_ID: $APPLE_ID"
print_info "  ✅ APPLE_TEAM_ID: $APPLE_TEAM_ID"
print_info "  ✅ GITHUB_TOKEN: ${GITHUB_TOKEN:0:8}..."
print_info "  ✅ Signing identity configured"

print_warning "💡 Usage:"
print_warning "  source scripts/setup-environment.sh"
print_warning "  ./scripts/automated-release-pipeline.sh patch"

print_info "🚀 Ready for release!" 