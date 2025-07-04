#!/bin/bash

# 🗑️ Complete TimeFlow Uninstall Script
# This script completely removes TimeFlow and all associated files

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗑️ TimeFlow Complete Uninstall Script${NC}"
echo "====================================="

# Step 1: Kill all running processes
echo -e "${BLUE}🔴 Killing all TimeFlow processes...${NC}"
sudo pkill -f "Ebdaa Work Time" 2>/dev/null
sudo pkill -f "TimeFlow" 2>/dev/null
sleep 2

# Force kill any remaining processes
PIDS=$(pgrep -f "Ebdaa Work Time\|TimeFlow" 2>/dev/null)
if [ ! -z "$PIDS" ]; then
    echo -e "${YELLOW}⚠️ Force killing remaining processes...${NC}"
    sudo kill -9 $PIDS 2>/dev/null
fi

echo -e "${GREEN}✅ All processes stopped${NC}"

# Step 2: Unmount any DMG files
echo -e "${BLUE}💿 Unmounting any TimeFlow DMG files...${NC}"
for mount in $(df -h | grep -i "timeflow\|ebdaa" | awk '{print $9}' 2>/dev/null); do
    echo "Unmounting: $mount"
    hdiutil detach "$mount" -force 2>/dev/null
done

echo -e "${GREEN}✅ DMG files unmounted${NC}"

# Step 3: Remove applications
echo -e "${BLUE}🗂️ Removing applications...${NC}"
sudo rm -rf "/Applications/Ebdaa Work Time.app"
sudo rm -rf "/Applications/TimeFlow Agent.app"
sudo rm -rf "/Applications/TimeFlow.app"

echo -e "${GREEN}✅ Applications removed${NC}"

# Step 4: Remove user data
echo -e "${BLUE}📁 Removing user data...${NC}"
rm -rf ~/Library/Application\ Support/ebdaa-work-time-agent
rm -rf ~/Library/Application\ Support/timeflow
rm -rf ~/Library/Caches/ebdaa-work-time-agent
rm -rf ~/Library/Caches/timeflow
rm -rf ~/Library/Preferences/com.ebdaa.work-time-agent.plist
rm -rf ~/Library/Preferences/com.timeflow.agent.plist
rm -rf ~/Library/LaunchAgents/com.ebdaa.work-time-agent.plist
rm -rf ~/Library/LaunchAgents/com.timeflow.agent.plist

echo -e "${GREEN}✅ User data removed${NC}"

# Step 5: Remove DMG files from project directory
echo -e "${BLUE}💾 Removing DMG files...${NC}"
rm -f TimeFlow*.dmg
rm -f Ebdaa*.dmg
rm -f *timeflow*.dmg

echo -e "${GREEN}✅ DMG files removed${NC}"

# Step 6: Clean up build artifacts
echo -e "${BLUE}🧹 Cleaning build artifacts...${NC}"
rm -rf dist/
rm -rf build/
rm -rf desktop-agent/dist/

echo -e "${GREEN}✅ Build artifacts cleaned${NC}"

echo ""
echo -e "${GREEN}🎉 TimeFlow Completely Uninstalled!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}📋 Manual Steps (Optional):${NC}"
echo "1. System Preferences → Privacy & Security → Screen Recording"
echo "   Remove any TimeFlow/Ebdaa entries"
echo ""
echo "2. System Preferences → Privacy & Security → Accessibility" 
echo "   Remove any TimeFlow/Ebdaa entries"
echo ""
echo "3. Empty Trash to permanently delete files"
echo ""
echo -e "${GREEN}✅ Uninstall Complete - System is clean!${NC}" 