#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TimeFlow Desktop Agent...');
console.log('📍 Current directory:', __dirname);

// Start Electron with the desktop agent
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
const electronProcess = spawn('npx', ['electron', '.'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    NODE_ENV: 'production'
  }
});

electronProcess.on('error', (error) => {
  console.error('❌ Failed to start Electron:', error);
  console.log('💡 Trying alternative method...');
  
  // Try alternative method
  const altProcess = spawn('node', [path.join(__dirname, 'node_modules', 'electron', 'cli.js'), '.'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: '1'
    }
  });
  
  altProcess.on('error', (altError) => {
    console.error('❌ Alternative method also failed:', altError);
    console.log('💡 Please ensure Electron is installed: npm install electron');
  });
});

electronProcess.on('close', (code) => {
  console.log(`📱 Desktop Agent exited with code: ${code}`);
});

console.log('✅ Desktop Agent startup initiated');
console.log('🔧 With screen lock fix: Screen lock now stops tracking completely');
console.log('💻 Laptop closure also stops tracking completely'); 