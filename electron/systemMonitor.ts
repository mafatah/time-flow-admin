import { dialog, powerMonitor, app } from 'electron';
import { stopTracking, startTracking, loadSession } from './tracker';
import { stopActivityMonitoring, startActivityMonitoring } from './activityMonitor';

// Track system state
let wasSystemSuspended = false;
let suspendTime: number | null = null;

export function initSystemMonitor() {
  console.log('🔌 Initializing system monitor...');

  // Handle system suspend (laptop closed, sleep mode)
  powerMonitor.on('suspend', () => {
    console.log('💤 System suspended (laptop closed or sleep mode)');
    wasSystemSuspended = true;
    suspendTime = Date.now();
    
    if (loadSession()) {
      console.log('⏰ Stopping tracking due to system suspend');
      stopTracking();
      stopActivityMonitoring();
    }
  });

  // Handle system resume (laptop opened, wake up)
  powerMonitor.on('resume', () => {
    console.log('🔆 System resumed');
    const suspendDuration = suspendTime ? Date.now() - suspendTime : 0;
    const suspendMinutes = Math.round(suspendDuration / 60000);
    
    console.log(`⏱️ System was suspended for ${suspendMinutes} minutes`);
    
    wasSystemSuspended = false;
    suspendTime = null;
    
    const session = loadSession();
    if (session) {
      // Auto-resume if suspend was brief (less than 5 minutes), otherwise ask user
      if (suspendDuration < 5 * 60 * 1000) {
        console.log('🔄 Auto-resuming tracking (short suspend)');
        startTracking();
        if (session.user_id) {
          startActivityMonitoring(session.user_id);
        }
      } else {
        // Show dialog for longer suspends
        try {
          const result = dialog.showMessageBoxSync({
            type: 'question',
            message: `System was suspended for ${suspendMinutes} minutes. Resume tracking?`,
            detail: 'Choose "Resume" to continue tracking from where you left off, or "Stop" to end the current session.',
            buttons: ['Resume', 'Stop'],
            defaultId: 0,
            cancelId: 1
          });
          
          if (result === 0) {
            console.log('👤 User chose to resume tracking');
            startTracking();
            if (session.user_id) {
              startActivityMonitoring(session.user_id);
            }
          } else {
            console.log('👤 User chose to stop tracking');
            stopTracking();
          }
        } catch (error) {
          console.log('⚠️ Could not show resume dialog, auto-stopping:', error);
          stopTracking();
        }
      }
    }
  });

  // Handle AC power changes (useful for laptops)
  powerMonitor.on('on-ac', () => {
    console.log('🔌 AC power connected');
  });

  powerMonitor.on('on-battery', () => {
    console.log('🔋 Running on battery power');
  });

  // Handle shutdown/logout
  powerMonitor.on('shutdown', () => {
    console.log('🚪 System shutdown detected');
    if (loadSession()) {
      stopTracking();
      stopActivityMonitoring();
    }
  });

  // Handle lock screen
  powerMonitor.on('lock-screen', () => {
    console.log('🔒 Screen locked');
    // Don't auto-stop on lock screen, but note it
    // Users might lock screen but continue working
  });

  powerMonitor.on('unlock-screen', () => {
    console.log('🔓 Screen unlocked');
  });

  // Handle thermal state changes (may indicate performance issues affecting screenshots)
  powerMonitor.on('thermal-state-change', (state: string) => {
    console.log('🌡️ Thermal state changed:', state);
    if (state === 'critical') {
      console.log('⚠️ System thermal state is critical - monitoring may be affected');
    }
  });

  // Handle app being put in background/foreground
  app.on('browser-window-blur', () => {
    console.log('👁️ App lost focus');
  });

  app.on('browser-window-focus', () => {
    console.log('👁️ App gained focus');
  });

  console.log('✅ System monitor initialized with enhanced event handling');
}
