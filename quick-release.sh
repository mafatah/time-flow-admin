#!/bin/bash
set -e

# 🚀 Quick Release Menu for TimeFlow
# Interactive script to choose release type

clear
echo "🚀 TimeFlow Release Menu"
echo "========================"
echo ""
echo "Current version: $(node -p "require('./package.json').version")"
echo ""
echo "Choose your release option:"
echo ""
echo "1. 🍎 Ultimate Release (All Platforms + GitHub)"
echo "   - Builds macOS (signed & notarized), Windows, Linux"
echo "   - Creates GitHub release with all files"
echo "   - Updates web deployment"
echo "   - Full auto-update configuration"
echo ""
echo "2. 🍎 Complete Release (macOS Only + GitHub)"
echo "   - Builds macOS Intel & Apple Silicon"
echo "   - Code signing & notarization"
echo "   - Creates GitHub release"
echo "   - Faster than ultimate release"
echo ""
echo "3. 🪟🐧 Cross-Platform Build (Windows + Linux)"
echo "   - Builds Windows EXE and Linux AppImage"
echo "   - No GitHub release (manual upload needed)"
echo "   - For testing builds"
echo ""
echo "4. 📋 Web Build Only"
echo "   - Builds web application only"
echo "   - Updates download page"
echo "   - No desktop applications"
echo ""
echo "5. ❌ Cancel"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting Ultimate Release (All Platforms)..."
        echo "This will take 10-15 minutes due to Apple notarization..."
        echo ""
        read -p "Are you sure? This will create a new GitHub release. (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            chmod +x scripts/ultimate-release.sh
            ./scripts/ultimate-release.sh
        else
            echo "❌ Ultimate release cancelled"
        fi
        ;;
    2)
        echo ""
        echo "🍎 Starting Complete Release (macOS Only)..."
        echo "This will take 5-10 minutes due to Apple notarization..."
        echo ""
        read -p "Are you sure? This will create a new GitHub release. (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            chmod +x scripts/complete-release.sh
            ./scripts/complete-release.sh
        else
            echo "❌ Complete release cancelled"
        fi
        ;;
    3)
        echo ""
        echo "🪟🐧 Starting Cross-Platform Build..."
        echo "This will build Windows and Linux versions only..."
        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            chmod +x scripts/build-cross-platform.sh
            ./scripts/build-cross-platform.sh
        else
            echo "❌ Cross-platform build cancelled"
        fi
        ;;
    4)
        echo ""
        echo "📋 Building web application only..."
        npm run build
        echo "✅ Web build complete!"
        echo "🌐 Deploy with: git push origin main"
        ;;
    5)
        echo "❌ Release cancelled"
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-5."
        ;;
esac

echo ""
echo "🏁 Release menu finished" 