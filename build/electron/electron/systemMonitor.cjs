"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSystemMonitor = initSystemMonitor;
const electron_1 = require("electron");
const tracker_1 = require("./tracker.cjs");
const activityMonitor_1 = require("./activityMonitor.cjs");
// Track system state
let wasSystemSuspended = false;
let suspendTime = null;
function initSystemMonitor() {
    console.log('🔌 Initializing system monitor...');
    // Handle system suspend (laptop closed, sleep mode)
    electron_1.powerMonitor.on('suspend', () => {
        console.log('💤 System suspended (laptop closed or sleep mode)');
        wasSystemSuspended = true;
        suspendTime = Date.now();
        if ((0, tracker_1.loadSession)()) {
            console.log('⏰ Stopping tracking due to system suspend');
            (0, tracker_1.stopTracking)();
            (0, activityMonitor_1.stopActivityMonitoring)();
        }
    });
    // Handle system resume (laptop opened, wake up)
    electron_1.powerMonitor.on('resume', () => {
        console.log('🔆 System resumed');
        const suspendDuration = suspendTime ? Date.now() - suspendTime : 0;
        const suspendMinutes = Math.round(suspendDuration / 60000);
        console.log(`⏱️ System was suspended for ${suspendMinutes} minutes`);
        wasSystemSuspended = false;
        suspendTime = null;
        const session = (0, tracker_1.loadSession)();
        if (session) {
            // Auto-resume if suspend was brief (less than 5 minutes), otherwise ask user
            if (suspendDuration < 5 * 60 * 1000) {
                console.log('🔄 Auto-resuming tracking (short suspend)');
                (0, tracker_1.startTracking)();
                if (session.user_id) {
                    (0, activityMonitor_1.startActivityMonitoring)(session.user_id);
                }
            }
            else {
                // Show dialog for longer suspends
                try {
                    const result = electron_1.dialog.showMessageBoxSync({
                        type: 'question',
                        message: `System was suspended for ${suspendMinutes} minutes. Resume tracking?`,
                        detail: 'Choose "Resume" to continue tracking from where you left off, or "Stop" to end the current session.',
                        buttons: ['Resume', 'Stop'],
                        defaultId: 0,
                        cancelId: 1
                    });
                    if (result === 0) {
                        console.log('👤 User chose to resume tracking');
                        (0, tracker_1.startTracking)();
                        if (session.user_id) {
                            (0, activityMonitor_1.startActivityMonitoring)(session.user_id);
                        }
                    }
                    else {
                        console.log('👤 User chose to stop tracking');
                        (0, tracker_1.stopTracking)();
                    }
                }
                catch (error) {
                    console.log('⚠️ Could not show resume dialog, auto-stopping:', error);
                    (0, tracker_1.stopTracking)();
                }
            }
        }
    });
    // Handle AC power changes (useful for laptops)
    electron_1.powerMonitor.on('on-ac', () => {
        console.log('🔌 AC power connected');
    });
    electron_1.powerMonitor.on('on-battery', () => {
        console.log('🔋 Running on battery power');
    });
    // Handle shutdown/logout
    electron_1.powerMonitor.on('shutdown', () => {
        console.log('🚪 System shutdown detected');
        if ((0, tracker_1.loadSession)()) {
            (0, tracker_1.stopTracking)();
            (0, activityMonitor_1.stopActivityMonitoring)();
        }
    });
    // Handle lock screen
    electron_1.powerMonitor.on('lock-screen', () => {
        console.log('🔒 Screen locked');
        // Don't auto-stop on lock screen, but note it
        // Users might lock screen but continue working
    });
    electron_1.powerMonitor.on('unlock-screen', () => {
        console.log('🔓 Screen unlocked');
    });
    // Handle thermal state changes (may indicate performance issues affecting screenshots)
    electron_1.powerMonitor.on('thermal-state-change', (state) => {
        console.log('🌡️ Thermal state changed:', state);
        if (state === 'critical') {
            console.log('⚠️ System thermal state is critical - monitoring may be affected');
        }
    });
    // Handle app being put in background/foreground
    electron_1.app.on('browser-window-blur', () => {
        console.log('👁️ App lost focus');
    });
    electron_1.app.on('browser-window-focus', () => {
        console.log('👁️ App gained focus');
    });
    console.log('✅ System monitor initialized with enhanced event handling');
}
