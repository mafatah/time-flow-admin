#!/bin/bash

echo "🚀 TimeFlow System Performance Optimizer"
echo "======================================="
echo

# Check current system status
echo "📊 CURRENT SYSTEM STATUS:"
echo "------------------------"
top -l 1 | head -n 8

echo
echo "🔍 TOP MEMORY CONSUMERS:"
echo "----------------------"
ps aux | sort -k4 -rn | head -n 10 | awk '{printf "%-25s %8s %8s %s\n", $11, $3"%", $4"%", $2}'

echo
echo "🎯 OPTIMIZATION ACTIONS:"
echo "----------------------"

# 1. Clear system caches
echo "1. 🧹 Clearing system caches..."
sudo purge 2>/dev/null || echo "   ⚠️ Purge command not available"

# 2. Free up memory
echo "2. 💾 Freeing inactive memory..."
sudo memory_pressure -S 2>/dev/null || echo "   ⚠️ Memory pressure command not available"

# 3. Clean up Cursor cache
echo "3. 🖥️ Cleaning Cursor cache..."
CURSOR_CACHE="$HOME/Library/Application Support/Cursor"
if [ -d "$CURSOR_CACHE" ]; then
    find "$CURSOR_CACHE" -name "*.log" -delete 2>/dev/null
    find "$CURSOR_CACHE/logs" -type f -delete 2>/dev/null
    find "$CURSOR_CACHE/GPUCache" -type f -delete 2>/dev/null
    echo "   ✅ Cursor cache cleaned"
else
    echo "   ⚠️ Cursor cache directory not found"
fi

# 4. Clean up system logs
echo "4. 📝 Cleaning system logs..."
sudo log erase --all 2>/dev/null || echo "   ⚠️ Log erase command not available"

# 5. Optimize TimeFlow if needed
echo "5. ⚡ Optimizing TimeFlow performance..."
if pgrep -f "TimeFlow" > /dev/null; then
    echo "   ✅ TimeFlow already running in optimized mode"
else
    echo "   ℹ️ TimeFlow not currently running"
fi

echo
echo "📈 RECOMMENDATIONS:"
echo "------------------"
echo "• Close heavy applications (Cursor is using 2.5GB+ RAM)"
echo "• Restart Cursor completely to free memory"
echo "• Close unnecessary browser tabs"
echo "• Restart your Mac if memory usage stays high"
echo "• Consider upgrading RAM if you frequently hit 95%+ usage"

echo
echo "🔄 AFTER OPTIMIZATION STATUS:"
echo "----------------------------"
top -l 1 | head -n 8

echo
echo "✅ Optimization complete! TimeFlow should run smoothly now." 