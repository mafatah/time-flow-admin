const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function fixDuplicateApps() {
  console.log('🔍 DIAGNOSING DUPLICATE TIMEFLOW APPS ISSUE');
  console.log('==========================================');

  try {
    // 1. Find all TimeFlow installations
    console.log('\n1️⃣ Searching for all TimeFlow installations...');
    
    const searchLocations = [
      '/Applications',
      '/Applications/Utilities',
      '~/Applications',
      '~/Desktop',
      '~/Downloads'
    ];

    const timeflowApps = [];

    for (const location of searchLocations) {
      try {
        const expandedPath = location.replace('~', process.env.HOME);
        if (fs.existsSync(expandedPath)) {
          const items = fs.readdirSync(expandedPath);
          
          items.forEach(item => {
            if (item.includes('TimeFlow') || item.includes('Ebdaa Work Time')) {
              const fullPath = path.join(expandedPath, item);
              const stats = fs.statSync(fullPath);
              
              if (stats.isDirectory() && item.endsWith('.app')) {
                // Get app version from Info.plist
                try {
                  const infoPlistPath = path.join(fullPath, 'Contents', 'Info.plist');
                  if (fs.existsSync(infoPlistPath)) {
                    const version = getAppVersion(infoPlistPath);
                    timeflowApps.push({
                      name: item,
                      path: fullPath,
                      version: version,
                      location: location,
                      size: getDirectorySize(fullPath)
                    });
                  }
                } catch (e) {
                  timeflowApps.push({
                    name: item,
                    path: fullPath,
                    version: 'Unknown',
                    location: location,
                    size: 0
                  });
                }
              }
            }
          });
        }
      } catch (error) {
        // Skip locations we can't access
      }
    }

    console.log(`\n📱 Found ${timeflowApps.length} TimeFlow app installations:`);
    timeflowApps.forEach((app, index) => {
      const sizeMB = Math.round(app.size / 1024 / 1024);
      console.log(`   ${index + 1}. ${app.name}`);
      console.log(`      📍 Location: ${app.location}`);
      console.log(`      🏷️  Version: ${app.version}`);
      console.log(`      📦 Size: ${sizeMB}MB`);
      console.log(`      📂 Path: ${app.path}`);
      console.log('');
    });

    // 2. Check running processes
    console.log('2️⃣ Checking running TimeFlow processes...');
    
    try {
      const psOutput = execSync('ps aux | grep -i timeflow | grep -v grep', { encoding: 'utf8' });
      if (psOutput.trim()) {
        console.log('   🏃 Running TimeFlow processes:');
        console.log(psOutput);
      } else {
        console.log('   ℹ️  No TimeFlow processes currently running');
      }
    } catch (error) {
      console.log('   ℹ️  No TimeFlow processes found');
    }

    // 3. Check which app is associated with auto-update
    console.log('3️⃣ Checking auto-update configuration...');
    
    timeflowApps.forEach((app, index) => {
      try {
        const infoPlistPath = path.join(app.path, 'Contents', 'Info.plist');
        if (fs.existsSync(infoPlistPath)) {
          const bundleId = getBundleId(infoPlistPath);
          console.log(`   ${index + 1}. ${app.name} - Bundle ID: ${bundleId}`);
        }
      } catch (error) {
        console.log(`   ${index + 1}. ${app.name} - Bundle ID: Unable to read`);
      }
    });

    // 4. Provide recommendations
    console.log('\n4️⃣ Recommendations to fix duplicate apps...');
    
    if (timeflowApps.length > 1) {
      console.log('   ⚠️  Multiple TimeFlow installations detected!');
      console.log('   🔧 To fix this issue:');
      console.log('');
      
      // Find the newest version
      const newestApp = timeflowApps.reduce((newest, current) => {
        const newestVersion = parseVersion(newest.version);
        const currentVersion = parseVersion(current.version);
        return currentVersion > newestVersion ? current : newest;
      });

      console.log(`   ✅ KEEP: ${newestApp.name} (v${newestApp.version})`);
      console.log(`      📍 Location: ${newestApp.path}`);
      console.log('');
      
      console.log('   🗑️  REMOVE (older versions):');
      timeflowApps.forEach(app => {
        if (app.path !== newestApp.path) {
          console.log(`      - ${app.name} (v${app.version})`);
          console.log(`        📍 ${app.path}`);
        }
      });

      console.log('');
      console.log('   📋 MANUAL STEPS:');
      console.log('   1. Quit all TimeFlow apps (use Activity Monitor if needed)');
      console.log('   2. Delete the older versions by dragging them to Trash');
      console.log('   3. Empty the Trash');
      console.log('   4. Launch only the newest version');
      console.log('   5. Check the version in the app menu');

      // Generate removal commands
      console.log('\n   💻 OR USE THESE TERMINAL COMMANDS:');
      console.log('');
      timeflowApps.forEach(app => {
        if (app.path !== newestApp.path) {
          console.log(`   # Remove ${app.name} (v${app.version})`);
          console.log(`   rm -rf "${app.path}"`);
          console.log('');
        }
      });

    } else if (timeflowApps.length === 1) {
      console.log('   ✅ Only one TimeFlow installation found');
      console.log('   🔍 The update issue might be:');
      console.log('     - Auto-update server not responding');
      console.log('     - Version check logic issue');
      console.log('     - Network connectivity problem');
    } else {
      console.log('   ❌ No TimeFlow installations found!');
      console.log('   📥 Please download and install TimeFlow from the official source');
    }

    // 5. Check auto-update server
    console.log('\n5️⃣ Testing auto-update server connection...');
    
    try {
      const testUrl = 'https://raw.githubusercontent.com/your-repo/time-flow-admin/main/latest-mac.yml';
      console.log(`   🌐 Testing: ${testUrl}`);
      
      // This would need to be implemented with a proper HTTP request
      console.log('   💡 Manual check: Visit the URL above to verify update server');
    } catch (error) {
      console.log('   ⚠️  Could not test auto-update server');
    }

  } catch (error) {
    console.error('❌ Failed to diagnose duplicate apps:', error);
  }
}

function getAppVersion(infoPlistPath) {
  try {
    const content = fs.readFileSync(infoPlistPath, 'utf8');
    
    // Simple regex to extract CFBundleShortVersionString
    const versionMatch = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/);
    
    if (versionMatch && versionMatch[1]) {
      return versionMatch[1];
    }
    
    // Fallback to CFBundleVersion
    const bundleVersionMatch = content.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
    
    if (bundleVersionMatch && bundleVersionMatch[1]) {
      return bundleVersionMatch[1];
    }
    
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

function getBundleId(infoPlistPath) {
  try {
    const content = fs.readFileSync(infoPlistPath, 'utf8');
    const bundleIdMatch = content.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/);
    
    return bundleIdMatch ? bundleIdMatch[1] : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

function getDirectorySize(dirPath) {
  try {
    const result = execSync(`du -sk "${dirPath}"`, { encoding: 'utf8' });
    const sizeKB = parseInt(result.split('\t')[0]);
    return sizeKB * 1024; // Convert to bytes
  } catch (error) {
    return 0;
  }
}

function parseVersion(versionString) {
  if (!versionString || versionString === 'Unknown') return 0;
  
  const parts = versionString.split('.').map(part => parseInt(part) || 0);
  return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

// Run the diagnosis
fixDuplicateApps(); 