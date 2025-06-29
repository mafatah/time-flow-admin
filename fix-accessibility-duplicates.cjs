#!/usr/bin/env node

/**
 * Fix Duplicate Accessibility Entries
 * 
 * This script helps clean up duplicate "Ebdaa Work Time" entries in macOS Accessibility settings.
 * The duplicates happen when the app is run from different locations (development vs installed).
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 TimeFlow Accessibility Cleanup Tool');
console.log('=====================================');
console.log('');

console.log('📋 Current Accessibility permissions:');
console.log('');

try {
  // Get current accessibility permissions
  const result = execSync('sqlite3 "/Library/Application Support/com.apple.TCC/TCC.db" "SELECT client FROM access WHERE service=\'kTCCServiceAccessibility\' AND client LIKE \'%Ebdaa%\' OR client LIKE \'%TimeFlow%\' OR client LIKE \'%Electron%\';"', { encoding: 'utf8' });
  
  if (result.trim()) {
    console.log('Found entries:');
    result.trim().split('\n').forEach((entry, index) => {
      console.log(`${index + 1}. ${entry}`);
    });
  } else {
    console.log('No duplicate entries found.');
  }
} catch (error) {
  console.log('⚠️ Could not read TCC database (this is normal on newer macOS versions)');
}

console.log('');
console.log('🛠️ To fix duplicate Accessibility entries:');
console.log('');
console.log('1. Open System Preferences → Security & Privacy → Privacy → Accessibility');
console.log('2. Look for duplicate "Ebdaa Work Time" entries');
console.log('3. Remove the OLD entries (usually the ones with longer paths)');
console.log('4. Keep only the entry from /Applications/Ebdaa Work Time.app');
console.log('5. Make sure the remaining entry is checked (enabled)');
console.log('');
console.log('✅ After cleanup, restart the TimeFlow app for best results.');
console.log('');

// Check if app is properly installed
const expectedPath = '/Applications/Ebdaa Work Time.app';
const fs = require('fs');

if (fs.existsSync(expectedPath)) {
  console.log('✅ App is properly installed in Applications folder');
} else {
  console.log('⚠️ App not found in Applications folder');
  console.log('   Please install the app to /Applications/ to avoid permission issues');
}

console.log('');
console.log('🔍 If you continue to see permission issues:');
console.log('1. Completely quit TimeFlow');
console.log('2. Remove ALL Ebdaa Work Time entries from Accessibility settings');
console.log('3. Launch TimeFlow from Applications folder');
console.log('4. Grant permissions when prompted');
console.log(''); 