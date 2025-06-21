#!/usr/bin/env node

/**
 * Simple Desktop Agent Starter
 * This script properly starts the TimeFlow desktop agent with Electron
 * and includes all the laptop closure and screenshot fixes.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 TimeFlow Desktop Agent Starter');
console.log('==================================');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
const mainJsPath = path.join(__dirname, 'src', 'main.js');

if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ Error: package.json not found. Are you in the desktop-agent directory?');
    process.exit(1);
}

if (!fs.existsSync(mainJsPath)) {
    console.error('❌ Error: src/main.js not found. Desktop agent files are missing.');
    process.exit(1);
}

console.log('✅ Desktop agent files found');

// Check Node.js version
const nodeVersion = process.version;
console.log(`🔧 Node.js Version: ${nodeVersion}`);

// Try to start with Electron
console.log('🎯 Starting TimeFlow Desktop Agent with Electron...');
console.log('📱 Features included:');
console.log('   ✅ Laptop closure detection');
console.log('   ✅ Smart screenshot management');
console.log('   ✅ System suspend/resume handling');
console.log('   ✅ Enhanced power management');
console.log('');

// Start the Electron app
const electronApp = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: '1',
        NODE_ENV: process.env.NODE_ENV || 'development'
    }
});

electronApp.on('error', (error) => {
    console.error('❌ Failed to start desktop agent:', error.message);
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Make sure you\'re in the desktop-agent directory');
    console.log('   2. Run: npm install');
    console.log('   3. Check Node.js is installed: node --version');
    console.log('   4. Try: npx electron . (directly)');
    process.exit(1);
});

electronApp.on('exit', (code) => {
    if (code === 0) {
        console.log('✅ Desktop agent closed normally');
    } else {
        console.log(`❌ Desktop agent exited with code: ${code}`);
    }
    process.exit(code);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n🔌 Shutting down desktop agent...');
    electronApp.kill('SIGTERM');
    setTimeout(() => {
        electronApp.kill('SIGKILL');
        process.exit(0);
    }, 5000);
});

console.log('🎉 Desktop agent starting...');
console.log('💡 Press Ctrl+C to stop');
console.log('📱 Look for the desktop agent window and system tray icon'); 