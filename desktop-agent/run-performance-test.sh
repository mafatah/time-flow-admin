#!/bin/bash

echo "🚀 Running Desktop Agent Tab Switching Performance Test..."
echo "========================================================="

# Change to desktop-agent directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the performance test
echo "🧪 Starting performance test..."
npm start test-tab-performance.js

echo ""
echo "✅ Performance test completed!"
echo ""
echo "💡 You can also test manually by running:"
echo "   npm start"
echo "   Then open DevTools and switch between tabs while watching console output" 