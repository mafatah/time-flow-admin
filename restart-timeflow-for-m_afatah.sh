#!/bin/bash

echo "🔄 RESTARTING TIMEFLOW FOR NEW SMART DETECTION SYSTEM"
echo "======================================================"

# Kill any existing TimeFlow processes
echo "🛑 Stopping existing TimeFlow processes..."
pkill -f "TimeFlow" 2>/dev/null
pkill -f "Ebdaa Work Time" 2>/dev/null
pkill -f "time-flow" 2>/dev/null

# Wait for processes to fully terminate
sleep 3

echo "✅ All TimeFlow processes stopped"

# Check if TimeFlow.app exists in Applications
if [ -d "/Applications/TimeFlow.app" ]; then
    echo "🚀 Starting TimeFlow with NEW SMART DETECTION SYSTEM..."
    open /Applications/TimeFlow.app
    
    echo "⚡ NEW FEATURES ACTIVE:"
    echo "   - Immediate app/URL detection (500ms polling)"
    echo "   - Local storage + batch uploads (every 1 minute)" 
    echo "   - Random screenshots (3 per 10 minutes)"
    echo "   - Single instance only (no duplicates)"
    echo "   - Context-aware screenshots"
    
    sleep 5
    
    echo ""
    echo "🔐 IMPORTANT: If app detection still doesn't work:"
    echo "   1. System Settings → Privacy & Security → Accessibility"
    echo "   2. Find 'TimeFlow' → Toggle OFF then ON"
    echo "   3. Restart TimeFlow again"
    echo ""
    echo "✅ TimeFlow restarted with smart detection system!"
    
else
    echo "❌ TimeFlow.app not found in /Applications/"
    echo "📥 Please download and install the latest version first"
fi 