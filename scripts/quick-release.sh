#!/bin/bash
set -e

# 🚀 QUICK TIMEFLOW RELEASE
# Fast patch release script for TimeFlow
# Usage: ./scripts/quick-release.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

print_info "🚀 TimeFlow Quick Release (Patch Version)"
print_info "============================================"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found. Please run from project root."
    exit 1
fi

# Source environment variables
if [[ -f "scripts/setup-environment.sh" ]]; then
    print_info "🔐 Loading environment variables..."
    source scripts/setup-environment.sh
else
    print_warning "⚠️ Environment setup script not found. Setting defaults..."
    export APPLE_ID="${APPLE_ID:-alshqawe66@gmail.com}"
    export APPLE_APP_SPECIFIC_PASSWORD="${APPLE_APP_SPECIFIC_PASSWORD:-icmi-tdzi-ydvi-lszi}"
    export APPLE_TEAM_ID="${APPLE_TEAM_ID:-6GW49LK9V9}"
    export GITHUB_TOKEN="${GITHUB_TOKEN:-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}"
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "📋 Current version: $CURRENT_VERSION"

# Confirm release
echo ""
read -p "🤔 Create a new patch release? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "❌ Release cancelled."
    exit 0
fi

print_info "🎯 Starting quick patch release..."
print_info "📊 This will:"
print_info "  • Increment patch version (x.x.X)"
print_info "  • Build and sign applications"
print_info "  • Create GitHub release"
print_info "  • Update auto-updater"
print_info "  • Deploy to web"

echo ""
read -p "🚀 Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "❌ Release cancelled."
    exit 0
fi

# Run the main release pipeline
print_info "🏃‍♂️ Running automated release pipeline..."
./scripts/automated-release-pipeline.sh patch

print_success "🎉 Quick release completed!"
print_success "🌐 Web deployment will be automatically triggered by Vercel"

# Show post-release checklist
print_info "📋 Post-Release Checklist:"
print_info "  1. ✅ GitHub release created"
print_info "  2. ✅ Auto-updater configured"
print_info "  3. ✅ Files uploaded"
print_info "  4. ⏳ Web deployment in progress"
print_info "  5. 🔍 Test auto-updater functionality"
print_info "  6. 📢 Announce release to users"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
print_success "🔗 Release URL: https://github.com/mafatah/time-flow-admin/releases/tag/v${NEW_VERSION}"

print_info "🎊 All done! TimeFlow v${NEW_VERSION} is ready!" 