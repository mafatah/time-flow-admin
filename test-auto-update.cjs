#!/usr/bin/env node

/**
 * Auto-Update Test Script
 * Tests the auto-updater functionality without needing actual releases
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TimeFlow Auto-Update Test Script\n');

// Get current version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = packageJson.version;

console.log(`📦 Current Version: ${currentVersion}\n`);

function showTestOptions() {
  console.log('Available Tests:');
  console.log('1. 📊 Check Update Status (via tray menu)');
  console.log('2. 🔄 Simulate Version Check');
  console.log('3. 📝 Create Mock Release for Testing');
  console.log('4. 🎯 Test Update Flow End-to-End');
  console.log('5. 🚀 Real Release Test (requires GitHub setup)');
  console.log('\n');
}

function testMethod1() {
  console.log('📊 TEST 1: Check Update Status via Tray Menu');
  console.log('─'.repeat(50));
  console.log('✅ Steps to test:');
  console.log('1. Look at your system tray (top menu bar)');
  console.log('2. Find the TimeFlow icon');
  console.log('3. Right-click on it');
  console.log('4. Look for these options:');
  console.log('   • 🔄 Check for Updates');
  console.log('   • ℹ️ Version ' + currentVersion);
  console.log('5. Click "Check for Updates"');
  console.log('6. Should show "No Updates" dialog\n');
  
  console.log('💡 What this tests:');
  console.log('   • Menu integration working');
  console.log('   • Update check mechanism');
  console.log('   • Error handling for no updates');
  console.log('   • User interface flow\n');
}

function testMethod2() {
  console.log('🔄 TEST 2: Simulate Version Check');
  console.log('─'.repeat(50));
  
  // Create a temporary higher version to simulate available update
  const versionParts = currentVersion.split('.').map(Number);
  versionParts[2] += 1; // Increment patch version
  const fakeNewVersion = versionParts.join('.');
  
  console.log('✅ Creating simulated update scenario:');
  console.log(`   Current: ${currentVersion}`);
  console.log(`   Fake New: ${fakeNewVersion}`);
  console.log('\n');
  
  console.log('🛠️ To test this:');
  console.log('1. Open electron/autoUpdater.ts');
  console.log('2. In the checkForUpdates function, add this test code:');
  console.log(`
// TEST CODE - Add at start of checkForUpdates function
if (showNoUpdateDialog) {
  // Simulate update available
  updateAvailable = true;
  updateInfo = { version: '${fakeNewVersion}', releaseNotes: 'Test update' };
  dialog.showMessageBoxSync({
    type: 'info',
    title: 'TEST: Update Available',
    message: 'Simulated update found!',
    detail: 'Version ${fakeNewVersion} is available (this is a test)',
    buttons: ['OK']
  });
  return;
}
`);
  console.log('3. Rebuild with: npm run build:electron');
  console.log('4. Restart the desktop app');
  console.log('5. Try "Check for Updates" from tray menu\n');
}

function testMethod3() {
  console.log('📝 TEST 3: Create Mock Release for Testing');
  console.log('─'.repeat(50));
  
  console.log('✅ Setting up mock release server:');
  console.log('1. Install a simple HTTP server:');
  console.log('   npm install -g http-server');
  console.log('\n');
  
  console.log('2. Create mock update manifest:');
  const mockManifest = {
    version: '999.0.0',
    releaseDate: new Date().toISOString(),
    files: [
      {
        url: 'http://localhost:3001/TimeFlow-v999.0.0.dmg',
        sha512: 'mock-sha512-hash',
        size: 123456789
      }
    ],
    path: 'TimeFlow-v999.0.0.dmg',
    sha512: 'mock-sha512-hash',
    releaseNotes: 'This is a test release for auto-updater testing.'
  };
  
  console.log('   Create: mock-releases/latest.json');
  console.log('   Content:', JSON.stringify(mockManifest, null, 2));
  console.log('\n');
  
  console.log('3. Modify autoUpdater.ts to use local server:');
  console.log('   autoUpdater.setFeedURL({');
  console.log('     provider: "generic",');
  console.log('     url: "http://localhost:3001/mock-releases"');
  console.log('   });');
  console.log('\n');
  
  console.log('4. Start mock server: http-server mock-releases -p 3001');
  console.log('5. Test update check - should find "version 999.0.0"\n');
}

function testMethod4() {
  console.log('🎯 TEST 4: End-to-End Update Flow Test');
  console.log('─'.repeat(50));
  
  console.log('✅ Complete workflow test:');
  console.log('1. 📝 Create a test version:');
  console.log('   • Increment version: npm version patch --no-git-tag-version');
  console.log('   • Build app: npm run build:all');
  console.log('\n');
  
  console.log('2. 🏗️ Create fake release:');
  console.log('   • Build dmg: npm run electron:build-unsigned');
  console.log('   • Move to test location');
  console.log('\n');
  
  console.log('3. 🔄 Test sequence:');
  console.log('   • Check for updates (should find new version)');
  console.log('   • Download update (should download fake dmg)');
  console.log('   • Install update (should prompt for restart)');
  console.log('\n');
  
  console.log('💡 This tests the complete user journey!\n');
}

function testMethod5() {
  console.log('🚀 TEST 5: Real Release Test');
  console.log('─'.repeat(50));
  
  console.log('✅ Prerequisites:');
  console.log('1. GitHub repository set up');
  console.log('2. GH_TOKEN environment variable set');
  console.log('3. Code signing certificates (for production)');
  console.log('\n');
  
  console.log('✅ Test steps:');
  console.log('1. Create test release:');
  console.log('   ./scripts/release.sh patch --dry-run');
  console.log('\n');
  
  console.log('2. Actually release:');
  console.log('   ./scripts/release.sh patch');
  console.log('\n');
  
  console.log('3. Wait and test:');
  console.log('   • App should auto-check in 30 seconds');
  console.log('   • Or manually check via tray menu');
  console.log('   • Should find the new version on GitHub');
  console.log('\n');
  
  console.log('💡 This is the real production test!\n');
}

function createQuickTestSetup() {
  console.log('⚡ Quick Test Setup');
  console.log('─'.repeat(50));
  
  // Create test directory
  const testDir = 'auto-update-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  // Create mock manifest
  const mockManifest = {
    version: '999.0.0',
    releaseDate: new Date().toISOString(),
    files: [
      {
        url: 'http://localhost:3001/TimeFlow-v999.0.0.dmg',
        sha512: 'mock-sha512-hash',
        size: 123456789
      }
    ],
    path: 'TimeFlow-v999.0.0.dmg',
    sha512: 'mock-sha512-hash',
    releaseNotes: 'Test release for auto-updater functionality testing.'
  };
  
  fs.writeFileSync(
    path.join(testDir, 'latest.json'),
    JSON.stringify(mockManifest, null, 2)
  );
  
  // Create test instructions
  const instructions = `# Auto-Update Test Instructions

## Quick Test (Recommended)

1. Start mock update server:
   cd ${testDir}
   npx http-server . -p 3001 --cors

2. Modify electron/autoUpdater.ts temporarily:
   Add this after line 15:
   autoUpdater.setFeedURL({
     provider: "generic", 
     url: "http://localhost:3001"
   });

3. Rebuild and restart:
   npm run build:electron
   npm run start:desktop

4. Test update check:
   Right-click tray → "Check for Updates"
   Should find version 999.0.0!

## Files Created:
- ${testDir}/latest.json (mock update manifest)
- ${testDir}/instructions.md (this file)

## Current App Version: ${currentVersion}
## Mock Test Version: 999.0.0
`;

  fs.writeFileSync(path.join(testDir, 'instructions.md'), instructions);
  
  console.log('✅ Test setup created in:', testDir);
  console.log('📝 Instructions written to:', testDir + '/instructions.md');
  console.log('\n');
  
  console.log('🚀 To start testing:');
  console.log(`1. cd ${testDir}`);
  console.log('2. npx http-server . -p 3001 --cors');
  console.log('3. Follow instructions.md\n');
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--setup')) {
    createQuickTestSetup();
    return;
  }
  
  showTestOptions();
  
  if (args.includes('--all')) {
    console.log('🔄 Running all test descriptions:\n');
    testMethod1();
    testMethod2();
    testMethod3();
    testMethod4();
    testMethod5();
  } else {
    console.log('💡 Usage:');
    console.log('  node test-auto-update.js --setup    # Create quick test setup');
    console.log('  node test-auto-update.js --all      # Show all test methods');
    console.log('  node test-auto-update.js            # Show this menu');
    console.log('\n');
    console.log('🚀 Quick start: node test-auto-update.js --setup');
  }
}

main(); 