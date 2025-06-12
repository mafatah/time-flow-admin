#!/bin/bash

# Setup Build Environment
# This script prepares the build environment and makes scripts executable

echo "🔧 Setting up build environment..."

# Make scripts executable
chmod +x scripts/build-notarized.sh
chmod +x scripts/build-and-release.sh

echo "✅ Made build scripts executable"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found - please install Node.js"
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm not found - please install npm"
fi

# Check GitHub CLI
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI: $(gh --version | head -n1)"
else
    echo "⚠️ GitHub CLI not found - install with: brew install gh"
fi

# Check git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "❌ Git not found - please install Git"
fi

echo ""
echo "🚀 Build environment setup complete!"
echo ""
echo "Available commands:"
echo "  scripts/build-notarized.sh    - Build and notarize only"
echo "  scripts/build-and-release.sh  - Build, sign, notarize, and create GitHub release"
echo ""
echo "📋 Apple Developer credentials configured:"
echo "  Apple ID: alshqawe66@gmail.com"
echo "  Team ID: 6GW49LK9V9"
echo "  App-specific password: configured" 