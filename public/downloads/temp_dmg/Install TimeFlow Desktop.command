#!/bin/bash

# TimeFlow Desktop Installer Script
# This bypasses macOS Gatekeeper by using a .command file

APP_NAME="TimeFlow Desktop"
INSTALL_PATH="/Applications/$APP_NAME.app"

clear
echo "=================================================="
echo "        TimeFlow Desktop Installer"
echo "=================================================="
echo ""
echo "This installer will demonstrate the TimeFlow Desktop"
echo "installation process and create a demo app in your"
echo "Applications folder."
echo ""
echo "Features that the real TimeFlow Desktop would have:"
echo "• Automatic time tracking"
echo "• Random screenshot capture (2 per 10 minutes)"
echo "• Activity monitoring"
echo "• Productivity metrics"
echo "• Sync with TimeFlow web dashboard"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "🔧 Installing TimeFlow Desktop..."

# Create the app bundle
sudo mkdir -p "$INSTALL_PATH/Contents/MacOS"
sudo mkdir -p "$INSTALL_PATH/Contents/Resources"

# Create Info.plist
sudo tee "$INSTALL_PATH/Contents/Info.plist" > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>TimeFlow Desktop</string>
    <key>CFBundleIdentifier</key>
    <string>com.timeflow.desktop</string>
    <key>CFBundleName</key>
    <string>TimeFlow Desktop</string>
    <key>CFBundleDisplayName</key>
    <string>TimeFlow Desktop</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.14</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create the executable
sudo tee "$INSTALL_PATH/Contents/MacOS/TimeFlow Desktop" > /dev/null << 'EOF'
#!/bin/bash
osascript -e '
tell application "System Events"
    display dialog "TimeFlow Desktop (Demo Version)

This is a demonstration of the TimeFlow Desktop application.

Real Features:
✅ Automatic time tracking
✅ Random screenshot capture (2 per 10 minutes)  
✅ Activity monitoring
✅ Productivity insights
✅ Sync with web dashboard

This demo shows what the interface would look like.
Contact your administrator for the actual application." buttons {"Launch Web Dashboard", "Close"} default button "Launch Web Dashboard" with icon note with title "TimeFlow Desktop"
    
    if result = {button returned:"Launch Web Dashboard"} then
        do shell script "open https://your-timeflow-domain.com"
    end if
end tell
'
EOF

# Make executable
sudo chmod +x "$INSTALL_PATH/Contents/MacOS/TimeFlow Desktop"

# Copy icon if available
if [ -f "$(dirname "$0")/icon.icns" ]; then
    sudo cp "$(dirname "$0")/icon.icns" "$INSTALL_PATH/Contents/Resources/"
fi

echo "✅ Installation complete!"
echo ""
echo "TimeFlow Desktop has been installed to:"
echo "$INSTALL_PATH"
echo ""
read -p "Would you like to open Applications folder? (y/N): " open_apps

if [[ $open_apps =~ ^[Yy]$ ]]; then
    open -a Finder "/Applications"
    osascript -e "tell application \"Finder\" to select POSIX file \"$INSTALL_PATH\""
fi

echo ""
echo "Installation Summary:"
echo "• Demo app created in Applications folder"
echo "• Double-click 'TimeFlow Desktop.app' to see features"
echo "• This is a safe demonstration - no actual monitoring"
echo ""
echo "Thank you for trying TimeFlow Desktop!" 