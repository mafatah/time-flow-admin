#!/bin/bash

# TimeFlow v1.0.26 Auto-Update Fix - Upload Script
# This script uploads the missing update files to GitHub release v1.0.26

set -e

echo "🔄 TimeFlow v1.0.26 Auto-Update Fix"
echo "=================================="
echo ""

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install it first:"
    echo "   https://cli.github.com/manual/installation"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Verify files exist
if [ ! -f "latest-mac.yml" ]; then
    echo "❌ latest-mac.yml not found in current directory"
    exit 1
fi

if [ ! -f "latest.yml" ]; then
    echo "❌ latest.yml not found in current directory"
    exit 1
fi

echo "✅ Update files found"
echo ""

# Show file contents for verification
echo "📄 Files to upload:"
echo ""
echo "--- latest-mac.yml ---"
head -5 latest-mac.yml
echo ""
echo "--- latest.yml ---"
head -5 latest.yml
echo ""

# Confirm upload
read -p "🤔 Upload these files to GitHub release v1.0.26? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Upload cancelled"
    exit 1
fi

echo ""
echo "📤 Uploading files to GitHub release v1.0.26..."

# Upload files
if gh release upload v1.0.26 latest-mac.yml latest.yml --clobber -R mafatah/time-flow-admin; then
    echo ""
    echo "✅ Files uploaded successfully!"
    echo ""
    echo "🔍 Verifying upload..."
    
    # Verify files are accessible
    if curl -s -I "https://github.com/mafatah/time-flow-admin/releases/download/v1.0.26/latest-mac.yml" | grep -q "200 OK"; then
        echo "✅ latest-mac.yml is accessible"
    else
        echo "❌ latest-mac.yml verification failed"
    fi
    
    if curl -s -I "https://github.com/mafatah/time-flow-admin/releases/download/v1.0.26/latest.yml" | grep -q "200 OK"; then
        echo "✅ latest.yml is accessible"
    else
        echo "❌ latest.yml verification failed"
    fi
    
    echo ""
    echo "🎉 Auto-update fix complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test auto-update in TimeFlow app (Help → Check for Updates)"
    echo "2. Should show 'You are running the latest version' message"
    echo "3. Future releases will auto-update correctly"
    
else
    echo ""
    echo "❌ Upload failed. Please check your GitHub authentication and try again."
    echo "   You can also upload manually via the GitHub web interface:"
    echo "   https://github.com/mafatah/time-flow-admin/releases/tag/v1.0.26"
    exit 1
fi