#!/usr/bin/env node

/**
 * TimeFlow Screen Recording Permission Fix
 * 
 * This script helps users fix the screen recording permission issues
 * that are preventing app detection and other features from working.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🛠️  TimeFlow Screen Recording Permission Fix');
console.log('='.repeat(50));

/**
 * Check current permission status
 */
function checkCurrentPermissions() {
    console.log('\n🔍 Checking current permissions...');
    
    try {
        // Try to run active-win to check permission status
        const activeWinPath = path.join(__dirname, 'build/electron/node_modules/active-win/main');
        
        if (fs.existsSync(activeWinPath)) {
            try {
                execSync(activeWinPath, { timeout: 5000 });
                console.log('✅ Screen recording permission is already granted!');
                return true;
            } catch (error) {
                const errorOutput = error.stdout?.toString() || error.stderr?.toString() || '';
                
                if (errorOutput.includes('screen recording permission')) {
                    console.log('❌ Screen recording permission is NOT granted');
                    return false;
                } else {
                    console.log('⚠️  Permission status unclear - continuing with fix...');
                    return false;
                }
            }
        } else {
            console.log('⚠️  active-win not found at expected location');
            return false;
        }
    } catch (error) {
        console.log('⚠️  Could not check permission status');
        return false;
    }
}

/**
 * Provide step-by-step instructions
 */
function provideInstructions() {
    console.log('\n📋 STEP-BY-STEP PERMISSION FIX:');
    console.log('='.repeat(40));
    
    console.log('\n1️⃣  Open System Settings:');
    console.log('   • Click Apple menu > System Settings');
    console.log('   • Or press Cmd+Space and type "System Settings"');
    
    console.log('\n2️⃣  Navigate to Privacy & Security:');
    console.log('   • Click "Privacy & Security" in the left sidebar');
    console.log('   • Scroll down and click "Screen Recording"');
    
    console.log('\n3️⃣  Grant permission to TimeFlow:');
    console.log('   • Look for "TimeFlow" in the app list');
    console.log('   • Toggle the switch ON (blue) next to TimeFlow');
    console.log('   • If TimeFlow is not in the list, you may need to add it manually');
    
    console.log('\n4️⃣  Add TimeFlow manually (if needed):');
    console.log('   • Click the "+" button');
    console.log('   • Navigate to Applications folder');
    console.log('   • Select TimeFlow.app');
    console.log('   • Click "Open"');
    console.log('   • Toggle the switch ON');
    
    console.log('\n5️⃣  Restart TimeFlow:');
    console.log('   • Quit TimeFlow completely (Cmd+Q)');
    console.log('   • Reopen TimeFlow from Applications');
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   • macOS may ask you to restart TimeFlow after granting permission');
    console.log('   • Some features may need a few seconds to activate after permission is granted');
    console.log('   • If issues persist, try logging out and back into macOS');
}

/**
 * Try to open System Settings automatically
 */
function openSystemSettings() {
    console.log('\n🚀 Attempting to open System Settings automatically...');
    
    try {
        // Try to open Screen Recording settings directly
        execSync('open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"', { timeout: 5000 });
        console.log('✅ System Settings should now be open to Screen Recording section');
        return true;
    } catch (error) {
        try {
            // Fallback: open general Privacy & Security
            execSync('open "x-apple.systempreferences:com.apple.preference.security"', { timeout: 5000 });
            console.log('✅ System Settings opened - navigate to Screen Recording manually');
            return true;
        } catch (fallbackError) {
            console.log('⚠️  Could not auto-open System Settings - please open manually');
            return false;
        }
    }
}

/**
 * Test if fix worked
 */
function testPermissionFix() {
    console.log('\n🧪 Testing if permission fix worked...');
    
    return new Promise((resolve) => {
        console.log('   Please restart TimeFlow and then press Enter to test...');
        
        process.stdin.once('data', () => {
            const isFixed = checkCurrentPermissions();
            
            if (isFixed) {
                console.log('\n🎉 SUCCESS! Screen recording permission is now working!');
                console.log('✅ App detection should now function properly');
                console.log('✅ URL tracking should work in browsers');
                console.log('✅ All TimeFlow features should be available');
            } else {
                console.log('\n❌ Permission still not working. Try these additional steps:');
                console.log('   • Make sure you toggled the switch ON (blue)');
                console.log('   • Restart your Mac completely');
                console.log('   • Re-download TimeFlow if the issue persists');
            }
            
            resolve();
        });
    });
}

/**
 * Main execution
 */
async function main() {
    console.log('\nThis script will help you fix screen recording permission issues.');
    console.log('Screen recording permission is required for:');
    console.log('• App detection (knowing which apps you\'re using)');
    console.log('• Window title tracking');
    console.log('• Browser URL detection');
    console.log('• Enhanced activity monitoring');
    
    // Check current status
    const hasPermission = checkCurrentPermissions();
    
    if (hasPermission) {
        console.log('\n🎉 Great! Permission is already working correctly.');
        console.log('If you\'re still having issues, try restarting TimeFlow.');
        return;
    }
    
    // Provide instructions
    provideInstructions();
    
    // Try to auto-open settings
    console.log('\n' + '='.repeat(50));
    const opened = openSystemSettings();
    
    if (opened) {
        console.log('\n📍 System Settings should now be open.');
        console.log('Follow steps 3-5 above to complete the permission setup.');
    }
    
    // Wait for user to complete fix
    await testPermissionFix();
    
    console.log('\n✅ Permission fix process completed!');
    console.log('If you need more help, visit: https://timeflow.app/support');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkCurrentPermissions, provideInstructions, openSystemSettings }; 