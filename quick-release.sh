#!/bin/bash
set -e

# 🚀 TimeFlow Quick Release v1.0.38
# Run this script to create a complete release with signing and notarization

echo "🚀 TimeFlow Quick Release Started..."
echo "===================================="
echo ""

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS for code signing and notarization"
    echo "   Use ./scripts/build-cross-platform.sh for Windows/Linux builds on other platforms"
    exit 1
fi

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "📦 Installing GitHub CLI..."
    brew install gh
fi

# Check if signed in to GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub:"
    gh auth login
fi

echo "✅ Environment ready!"
echo ""

# Show current version
CURRENT_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
echo "📦 Current Version: v$CURRENT_VERSION"
echo ""

# Ask user which release type to run
echo "🚀 Choose Release Type:"
echo "1. Ultimate Release (ALL platforms - macOS, Windows, Linux)"
echo "2. Complete Release (macOS only with signing)"
echo "3. Cross-Platform Build (Windows + Linux only)"
echo ""

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🌟 Running Ultimate Release (All Platforms)..."
        ./scripts/ultimate-release.sh
        ;;
    2)
        echo "🍎 Running Complete Release (macOS only)..."
        ./scripts/complete-release.sh
        ;;
    3)
        echo "🔧 Running Cross-Platform Build..."
        ./scripts/build-cross-platform.sh
        ;;
    *)
        echo "❌ Invalid choice. Please run again and select 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "🎉 Release process completed!"
echo ""
echo "📋 What to do next:"
echo "==================="
echo "1. Check GitHub release: https://github.com/mafatah/time-flow-admin/releases"
echo "2. Verify download page: https://time-flow-admin.vercel.app/download"
echo "3. Test auto-updates on existing installations"
echo "4. Test fresh installations on clean machines"
echo ""
echo "🚀 TimeFlow v$CURRENT_VERSION is ready for users!" 