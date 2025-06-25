#!/bin/bash

# 🚀 TimeFlow v1.0.38 File Upload Helper
# This script shows the files that need to be uploaded to GitHub release

echo "🚀 TimeFlow v1.0.38 Release Files Ready for Upload"
echo "=================================================="
echo ""

# Check if files exist
echo "📦 Checking built files in dist/ directory..."
echo ""

FILES=(
    "TimeFlow-v1.0.38-ARM64.dmg"
    "TimeFlow-v1.0.38-Intel.dmg" 
    "TimeFlow-v1.0.38-Setup.exe"
    "TimeFlow-v1.0.38-Linux.AppImage"
)

cd dist/

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(ls -lh "$file" | awk '{print $5}')
        echo "✅ $file ($size)"
    else
        echo "❌ $file (MISSING)"
    fi
done

echo ""
echo "🔗 Manual Upload Instructions:"
echo "1. Go to: https://github.com/mafatah/time-flow-admin/releases"
echo "2. Click 'Create a new release'"
echo "3. Tag version: v1.0.38"
echo "4. Upload all 4 files listed above"
echo "5. Publish the release"
echo ""
echo "📱 After publishing, these URLs will be live:"
echo "- https://github.com/mafatah/time-flow-admin/releases/download/v1.0.38/TimeFlow-v1.0.38-ARM64.dmg"
echo "- https://github.com/mafatah/time-flow-admin/releases/download/v1.0.38/TimeFlow-v1.0.38-Intel.dmg"
echo "- https://github.com/mafatah/time-flow-admin/releases/download/v1.0.38/TimeFlow-v1.0.38-Setup.exe"
echo "- https://github.com/mafatah/time-flow-admin/releases/download/v1.0.38/TimeFlow-v1.0.38-Linux.AppImage"
echo ""
echo "🌐 The login page at https://worktime.ebdaadt.com/login will automatically work!" 