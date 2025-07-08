#!/usr/bin/env node

/**
 * Quick Start Desktop Agent
 * Bypasses problematic health checks and starts with better error handling
 */

console.log('🚀 TimeFlow Desktop Agent - Quick Start Mode');
console.log('===========================================');

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Check if we're in the right directory
const mainJsPath = path.join(__dirname, 'main.js');
if (!fs.existsSync(mainJsPath)) {
    console.error('❌ Error: main.js not found in src directory');
    process.exit(1);
}

// Set environment variable to skip problematic health checks
process.env.SKIP_HEALTH_CHECKS = 'true';
process.env.QUICK_START_MODE = 'true';

console.log('🔧 Starting in Quick Start Mode...');
console.log('   - Skipping problematic health checks');
console.log('   - Using simplified startup process');
console.log('   - Enhanced error handling enabled');

// Start the desktop agent
const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
const agentProcess = spawn(electronPath, ['.'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
        ...process.env,
        SKIP_HEALTH_CHECKS: 'true',
        QUICK_START_MODE: 'true'
    }
});

let startupComplete = false;

// Handle stdout
agentProcess.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    
    // Check for successful startup indicators
    if (output.includes('Desktop Agent started successfully') || 
        output.includes('Configuration loaded successfully') ||
        output.includes('Supabase client initialized')) {
        startupComplete = true;
        console.log('\n✅ Desktop Agent startup complete!');
        console.log('📋 Health checks will run in background (non-blocking)');
    }
});

// Handle stderr
agentProcess.stderr.on('data', (data) => {
    const error = data.toString();
    process.stderr.write(error);
});

// Handle process exit
agentProcess.on('close', (code) => {
    console.log(`\n🔄 Desktop Agent exited with code ${code}`);
    
    if (code !== 0 && !startupComplete) {
        console.log('❌ Startup failed. Common issues:');
        console.log('   1. Screen Recording permission not granted');
        console.log('   2. Accessibility permission not granted');
        console.log('   3. .env file configuration issues');
        console.log('\n🔧 Try running: node test-health-checks.js');
        console.log('   to diagnose specific issues.');
    }
});

// Handle process error
agentProcess.on('error', (error) => {
    console.error('❌ Failed to start Desktop Agent:', error.message);
    
    if (error.code === 'ENOENT') {
        console.log('💡 Solution: Make sure Electron is installed');
        console.log('   Run: npm install');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Desktop Agent...');
    agentProcess.kill('SIGTERM');
    
    setTimeout(() => {
        console.log('👋 Desktop Agent shutdown complete');
        process.exit(0);
    }, 2000);
});

// Startup timeout
setTimeout(() => {
    if (!startupComplete) {
        console.log('\n⏰ Startup taking longer than expected...');
        console.log('   This is usually due to permission dialogs or health checks');
        console.log('   The agent may still be starting in the background');
    }
}, 10000);

console.log('\n📝 Quick Start Mode Active');
console.log('   - Press Ctrl+C to stop the agent');
console.log('   - Check System Preferences for permission requests');
console.log('   - Health checks will run in background without blocking'); 