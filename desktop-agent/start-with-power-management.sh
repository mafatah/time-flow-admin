#!/bin/bash

# TimeFlow Desktop Agent - Enhanced Power Management Startup Script
# This script starts the desktop agent with better laptop closure detection and screenshot management

echo "🔋 TimeFlow Desktop Agent - Enhanced Power Management"
echo "======================================================"

# Check if we're in the right directory
if [ ! -f "src/main.js" ]; then
    echo "❌ Error: This script must be run from the desktop-agent directory"
    echo "💡 Try: cd desktop-agent && ./start-with-power-management.sh"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    echo "💡 Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Set environment variables for enhanced power management
export TIMEFLOW_POWER_MANAGED=1
export ELECTRON_ENABLE_LOGGING=1
export NODE_ENV=${NODE_ENV:-production}

echo "🚀 Starting TimeFlow Desktop Agent with Enhanced Power Management..."
echo "📱 Platform: $(uname -s)"
echo "🔧 Node.js Version: $(node --version)"
echo "📁 Working Directory: $(pwd)"
echo ""
echo "✨ Enhanced Features:"
echo "   • Automatic laptop closure detection"
echo "   • Smart screenshot management"
echo "   • Crash recovery with restart"
echo "   • Memory usage monitoring"
echo "   • Graceful shutdown handling"
echo ""
echo "💡 Tips:"
echo "   • Press Ctrl+C to stop gracefully"
echo "   • Check logs in power-management.log"
echo "   • Screenshots will pause when laptop is closed"
echo "   • Tracking will auto-resume when laptop is opened"
echo ""
echo "🎯 Starting now..."
echo "==============================================="

# Start the enhanced power management system
node enhanced-power-management.js

echo ""
echo "👋 TimeFlow Desktop Agent stopped"
echo "📝 Check power-management.log for detailed logs" 