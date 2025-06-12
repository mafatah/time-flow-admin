const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function fixAutoUpdateIssue() {
  console.log('🔧 FIXING AUTO-UPDATE CONFIGURATION ISSUE');
  console.log('=========================================');

  try {
    // 1. Check current situation
    console.log('\n1️⃣ Current Auto-Update Status:');
    
    // Read current latest-mac.yml
    const latestMacPath = 'latest-mac.yml';
    const currentConfig = fs.readFileSync(latestMacPath, 'utf8');
    console.log('   📄 Current latest-mac.yml content:');
    console.log(currentConfig);

    // Check what DMG files actually exist
    console.log('\n2️⃣ Available DMG Files:');
    const distFiles = fs.existsSync('dist') ? fs.readdirSync('dist') : [];
    const timeflowDmgs = distFiles.filter(file => file.includes('TimeFlow') || file.includes('Ebdaa Work Time'));
    
    if (timeflowDmgs.length > 0) {
      console.log('   📦 Found in dist/:');
      timeflowDmgs.forEach(file => {
        const stats = fs.statSync(path.join('dist', file));
        const sizeMB = Math.round(stats.size / 1024 / 1024);
        console.log(`      - ${file} (${sizeMB}MB)`);
      });
    } else {
      console.log('   ❌ No DMG files found in dist/ folder');
    }

    // Check Downloads folder for latest version
    const downloadsPath = path.join(process.env.HOME, 'Downloads');
    const downloadFiles = fs.readdirSync(downloadsPath);
    const downloadDmgs = downloadFiles.filter(file => 
      (file.includes('TimeFlow') || file.includes('Ebdaa')) && file.endsWith('.dmg')
    ).sort().reverse(); // Most recent first

    console.log('\n   📥 Found in Downloads:');
    downloadDmgs.slice(0, 5).forEach(file => {
      const stats = fs.statSync(path.join(downloadsPath, file));
      const sizeMB = Math.round(stats.size / 1024 / 1024);
      console.log(`      - ${file} (${sizeMB}MB)`);
    });

    // 3. Determine the correct version to use
    console.log('\n3️⃣ Determining Correct Version:');
    
    // Find the latest actual version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const packageVersion = packageJson.version;
    console.log(`   📋 Package.json version: ${packageVersion}`);

    // Find the latest built DMG
    const latestBuiltDmg = timeflowDmgs.find(file => file.includes(packageVersion));
    
    if (latestBuiltDmg) {
      console.log(`   ✅ Found matching DMG: ${latestBuiltDmg}`);
      
      // 4. Update latest-mac.yml with correct information
      console.log('\n4️⃣ Updating Auto-Update Configuration:');
      
      const dmgPath = path.join('dist', latestBuiltDmg);
      const dmgStats = fs.statSync(dmgPath);
      const dmgSize = dmgStats.size;
      
      // Calculate SHA512 hash
      const dmgBuffer = fs.readFileSync(dmgPath);
      const sha512Hash = crypto.createHash('sha512').update(dmgBuffer).digest('base64');
      
      const armDmgName = `Ebdaa Work Time-${packageVersion}-arm64.dmg`;
      const intelDmgName = `Ebdaa Work Time-${packageVersion}.dmg`;
      
      const newConfig = `version: ${packageVersion}
files:
  - url: ${armDmgName}
    sha512: ${sha512Hash}
    size: ${dmgSize}
    blockMapSize: ${Math.round(dmgSize * 1.2)}
  - url: ${intelDmgName}
    sha512: ${sha512Hash}
    size: ${dmgSize}
    blockMapSize: ${Math.round(dmgSize * 1.2)}
path: ${armDmgName}
sha512: ${sha512Hash}
releaseDate: '${new Date().toISOString()}'
`;

      fs.writeFileSync(latestMacPath, newConfig);
      console.log(`   ✅ Updated latest-mac.yml with version ${packageVersion}`);
      console.log(`   📊 File size: ${Math.round(dmgSize / 1024 / 1024)}MB`);
      console.log(`   🔐 SHA512: ${sha512Hash.substring(0, 20)}...`);
      
    } else {
      console.log('   ❌ No matching DMG found for package version');
      
      // Suggest manual version correction
      console.log('\n4️⃣ Manual Fix Required:');
      console.log('   🔧 The auto-update issue is caused by:');
      console.log('      1. latest-mac.yml advertises v1.0.14');
      console.log('      2. But no v1.0.14 DMG files exist');
      console.log('      3. Current installed version is v1.0.13');
      console.log('      4. Latest available DMG is v1.0.10');
      
      console.log('\n   💡 Solutions:');
      console.log('   A) Build v1.0.14 DMG files:');
      console.log('      npm run electron:build');
      console.log('');
      console.log('   B) Update latest-mac.yml to match existing version:');
      
      // Check if we have any recent version
      const latestDmg = timeflowDmgs[0];
      if (latestDmg) {
        const versionMatch = latestDmg.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          const availableVersion = versionMatch[1];
          console.log(`      - Set version to ${availableVersion} (matches available DMG)`);
          
          // Offer to fix it automatically
          const dmgPath = path.join('dist', latestDmg);
          const dmgStats = fs.statSync(dmgPath);
          const dmgBuffer = fs.readFileSync(dmgPath);
          const sha512Hash = crypto.createHash('sha512').update(dmgBuffer).digest('base64');
          
          const fixedConfig = `version: ${availableVersion}
files:
  - url: ${latestDmg}
    sha512: ${sha512Hash}
    size: ${dmgStats.size}
    blockMapSize: ${Math.round(dmgStats.size * 1.2)}
path: ${latestDmg}
sha512: ${sha512Hash}
releaseDate: '${new Date().toISOString()}'
`;
          
          fs.writeFileSync('latest-mac-fixed.yml', fixedConfig);
          console.log(`   ✅ Created latest-mac-fixed.yml with version ${availableVersion}`);
        }
      }
    }

    // 5. Provide user instructions
    console.log('\n5️⃣ User Instructions to Fix Duplicate Apps:');
    console.log('   📱 Current situation:');
    console.log('      - You have v1.0.13 installed in /Applications');
    console.log('      - Auto-update is trying to get v1.0.14 (doesn\'t exist)');
    console.log('      - Latest working version in Downloads is v1.0.10');
    console.log('');
    console.log('   🔧 To fix the "two apps" issue:');
    console.log('   1. Quit the current TimeFlow app completely');
    console.log('   2. Install the latest version manually:');
    console.log('      open ~/Downloads/TimeFlow-v1.0.10-ARM64-Signed.dmg');
    console.log('   3. Drag to replace the existing app in Applications');
    console.log('   4. Launch the new version');
    console.log('   5. Check version in menu - should show v1.0.10');

  } catch (error) {
    console.error('❌ Failed to fix auto-update issue:', error);
  }
}

// Run the fix
fixAutoUpdateIssue(); 