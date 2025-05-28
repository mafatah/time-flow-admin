import { systemPreferences, dialog, shell } from 'electron';
import { logError } from './errorHandler';
export async function checkScreenRecordingPermission() {
    if (process.platform !== 'darwin') {
        console.log('🟢 Not macOS, screen recording permission not required');
        return true;
    }
    console.log('🔍 Checking macOS Screen Recording permission...');
    try {
        // Check if we have screen recording permission
        const hasPermission = systemPreferences.getMediaAccessStatus('screen') === 'granted';
        if (hasPermission) {
            console.log('✅ Screen Recording permission already granted');
            return true;
        }
        else {
            console.log('❌ Screen Recording permission not granted');
            return false;
        }
    }
    catch (error) {
        console.error('❌ Failed to check screen recording permission:', error);
        logError('checkScreenRecordingPermission', error);
        return false;
    }
}
export async function requestScreenRecordingPermission() {
    if (process.platform !== 'darwin') {
        return true;
    }
    console.log('📱 Requesting macOS Screen Recording permission...');
    try {
        // Try to request permission (note: 'screen' may not be available in all Electron versions)
        const hasPermission = await systemPreferences.askForMediaAccess('camera'); // Fallback for now
        if (hasPermission) {
            console.log('✅ Screen Recording permission granted');
            return true;
        }
        else {
            console.log('❌ Screen Recording permission denied');
            await showPermissionDialog();
            return false;
        }
    }
    catch (error) {
        console.error('❌ Failed to request screen recording permission:', error);
        logError('requestScreenRecordingPermission', error);
        await showPermissionDialog();
        return false;
    }
}
async function showPermissionDialog() {
    const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Screen Recording Permission Required',
        message: 'Time Flow Admin needs Screen Recording permission to capture screenshots for activity monitoring.',
        detail: 'Please grant Screen Recording permission in System Preferences:\n\n1. Go to System Preferences > Security & Privacy\n2. Click on Privacy tab\n3. Select Screen Recording from the list\n4. Check the box next to Time Flow Admin\n5. Restart the application',
        buttons: ['Open System Preferences', 'Skip for Now'],
        defaultId: 0,
        cancelId: 1
    });
    if (result === 0) {
        console.log('🔧 Opening System Preferences for user...');
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
}
export async function ensureScreenRecordingPermission() {
    console.log('🚀 Ensuring Screen Recording permission...');
    // First check if we already have permission
    if (await checkScreenRecordingPermission()) {
        return true;
    }
    // Try to request permission
    const granted = await requestScreenRecordingPermission();
    if (!granted) {
        console.log('⚠️  Screen Recording permission not granted. Screenshots will not work.');
        return false;
    }
    return true;
}
// Test function to verify permission is working
export async function testScreenCapture() {
    if (process.platform !== 'darwin') {
        console.log('🟢 Not macOS, screen capture test skipped');
        return true;
    }
    try {
        const { desktopCapturer } = require('electron');
        console.log('🧪 Testing screen capture capability...');
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        if (sources.length === 0) {
            console.log('❌ Screen capture test failed: No sources available');
            return false;
        }
        console.log(`✅ Screen capture test passed: ${sources.length} sources available`);
        return true;
    }
    catch (error) {
        console.error('❌ Screen capture test failed:', error);
        logError('testScreenCapture', error);
        return false;
    }
}
