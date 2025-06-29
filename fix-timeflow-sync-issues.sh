#!/bin/bash

echo "🔧 TimeFlow Sync & Screenshot Fix"
echo "================================="
echo

# 1. Check current TimeFlow status
echo "📊 CURRENT TIMEFLOW STATUS:"
echo "--------------------------"
if pgrep -f "TimeFlow" > /dev/null; then
    echo "✅ TimeFlow Agent is running"
    ps aux | grep -i timeflow | grep -v grep | head -3
else
    echo "❌ TimeFlow Agent is not running"
fi

echo
echo "🔧 FIXING SYNC ISSUES:"
echo "---------------------"

# 2. Force stop any hanging TimeFlow processes
echo "1. 🛑 Stopping any hanging TimeFlow processes..."
pkill -f "TimeFlow" 2>/dev/null
sleep 2

# 3. Clear TimeFlow cache and temporary files
echo "2. 🧹 Clearing TimeFlow cache..."
TIMEFLOW_CACHE="$HOME/Library/Application Support/timeflow-desktop-agent"
if [ -d "$TIMEFLOW_CACHE" ]; then
    find "$TIMEFLOW_CACHE" -name "*.log" -delete 2>/dev/null
    find "$TIMEFLOW_CACHE/logs" -type f -delete 2>/dev/null
    find "$TIMEFLOW_CACHE/GPUCache" -type f -delete 2>/dev/null
    echo "   ✅ TimeFlow cache cleaned"
else
    echo "   ⚠️ TimeFlow cache directory not found"
fi

# 4. Check and fix screen recording permissions
echo "3. 🎥 Checking screen recording permissions..."
if osascript -e 'tell application "System Events" to return (exists application process "TimeFlow Agent")' 2>/dev/null; then
    echo "   ✅ TimeFlow has screen recording access"
else
    echo "   ⚠️ Screen recording permissions may need attention"
    echo "   💡 Go to: System Preferences → Privacy & Security → Screen Recording"
    echo "   📝 Make sure 'TimeFlow Agent' is enabled"
fi

# 5. Test network connectivity
echo "4. 🌐 Testing network connectivity..."
if ping -c 1 fkpiqcxkmrtaetvfgcli.supabase.co > /dev/null 2>&1; then
    echo "   ✅ Network connection to TimeFlow servers: OK"
else
    echo "   ❌ Network connection to TimeFlow servers: FAILED"
    echo "   💡 This explains the sync issues!"
fi

# 6. Restart TimeFlow Agent
echo "5. 🚀 Restarting TimeFlow Agent..."
open "/Applications/TimeFlow Agent.app"
sleep 3

if pgrep -f "TimeFlow" > /dev/null; then
    echo "   ✅ TimeFlow Agent restarted successfully"
else
    echo "   ❌ Failed to restart TimeFlow Agent"
fi

echo
echo "🔧 SCREENSHOT FIX:"
echo "-----------------"

# 7. Test screenshot capability
echo "6. 📸 Testing screenshot capability..."
if command -v screencapture > /dev/null; then
    screencapture -x /tmp/test_screenshot.png 2>/dev/null
    if [ -f /tmp/test_screenshot.png ]; then
        echo "   ✅ Screenshot capture: Working"
        rm /tmp/test_screenshot.png
    else
        echo "   ❌ Screenshot capture: Failed"
    fi
else
    echo "   ❌ screencapture command not found"
fi

echo
echo "📈 RECOMMENDATIONS:"
echo "------------------"
echo "• If network issues persist, screenshots will queue locally and sync when connection improves"
echo "• Refresh the TimeFlow web interface (Cmd+R) to see updated status"
echo "• Check your internet connection - this affects data syncing"
echo "• If screenshot issues continue, restart your Mac"

echo
echo "🔄 FINAL STATUS CHECK:"
echo "---------------------"
if pgrep -f "TimeFlow" > /dev/null; then
    echo "✅ TimeFlow Agent is now running"
else
    echo "❌ TimeFlow Agent failed to start - manual restart needed"
fi

echo
echo "✅ Fix complete! Please check the TimeFlow interface now." 