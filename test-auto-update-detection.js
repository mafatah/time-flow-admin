#!/usr/bin/env node

/**
 * Test Auto-Update Detection
 * This script simulates how electron-updater checks for updates
 */

import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const GITHUB_OWNER = 'mafatah';
const GITHUB_REPO = 'time-flow-admin';
const CURRENT_VERSION = '1.0.13'; // The version your app is currently running
const PLATFORM = 'mac'; // or 'win'

console.log('🔍 AUTO-UPDATE DETECTION TEST');
console.log('===============================\n');

async function checkGitHubReleases() {
  return new Promise((resolve, reject) => {
    console.log('📡 Checking GitHub releases...');
    
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'TimeFlow-UpdateChecker',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          console.log(`✅ Latest GitHub release: ${release.tag_name}`);
          console.log(`📅 Published: ${new Date(release.published_at).toLocaleString()}`);
          console.log(`📦 Assets: ${release.assets.length} files`);
          
          // Check for DMG files
          const dmgAssets = release.assets.filter(asset => asset.name.endsWith('.dmg'));
          console.log(`💿 DMG files found: ${dmgAssets.length}`);
          dmgAssets.forEach(asset => {
            console.log(`   - ${asset.name} (${Math.round(asset.size / 1024 / 1024)}MB)`);
          });
          
          resolve(release);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkLocalUpdateFiles() {
  console.log('\n📁 Checking local update files...');
  
  // Check latest-mac.yml
  const macYmlPath = join(__dirname, 'latest-mac.yml');
  if (fs.existsSync(macYmlPath)) {
    const content = fs.readFileSync(macYmlPath, 'utf8');
    console.log('✅ latest-mac.yml found:');
    console.log(content);
  } else {
    console.log('❌ latest-mac.yml not found');
  }

  // Check latest.yml
  const winYmlPath = join(__dirname, 'latest.yml');
  if (fs.existsSync(winYmlPath)) {
    const content = fs.readFileSync(winYmlPath, 'utf8');
    console.log('\n✅ latest.yml found:');
    console.log(content);
  } else {
    console.log('\n❌ latest.yml not found');
  }
}

function compareVersions(current, latest) {
  console.log(`\n🔄 VERSION COMPARISON:`);
  console.log(`   Current: ${current}`);
  console.log(`   Latest:  ${latest}`);
  
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) {
      console.log('🆙 UPDATE AVAILABLE!');
      return true;
    } else if (latestPart < currentPart) {
      console.log('✅ Running newer version than published');
      return false;
    }
  }
  
  console.log('✅ Running latest version');
  return false;
}

async function simulateElectronUpdaterCheck() {
  console.log('\n🔧 SIMULATING ELECTRON-UPDATER CHECK:');
  
  try {
    // This is what electron-updater does internally
    const updateServerUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/latest-mac.yml`;
    console.log(`📡 Checking: ${updateServerUrl}`);
    
    const response = await fetch(updateServerUrl);
    if (response.ok) {
      const content = await response.text();
      console.log('✅ Update server response:');
      console.log(content);
      
      // Parse version from YAML
      const versionMatch = content.match(/version:\s*([\d.]+)/);
      if (versionMatch) {
        const serverVersion = versionMatch[1];
        compareVersions(CURRENT_VERSION, serverVersion);
      }
    } else {
      console.log(`❌ Failed to fetch update info: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error checking for updates:', error.message);
  }
}

async function main() {
  try {
    // Check GitHub releases
    await checkGitHubReleases();
    
    // Check local update files
    await checkLocalUpdateFiles();
    
    // Simulate what electron-updater does
    await simulateElectronUpdaterCheck();
    
    console.log('\n💡 TO FIX UPDATE DETECTION:');
    console.log('1. Build and sign version 1.0.14 (in progress)');
    console.log('2. Create GitHub release v1.0.14');
    console.log('3. Upload DMG files to release');
    console.log('4. Update latest-mac.yml with correct file info');
    console.log('5. Push changes to GitHub');
    console.log('\nThen your 1.0.13 app will detect the 1.0.14 update! 🎉');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main(); 