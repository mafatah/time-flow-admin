import { dialog, powerMonitor } from 'electron';
import { stopTracking, startTracking, loadSession } from './tracker';

export function initSystemMonitor() {
  powerMonitor.on('suspend', () => {
    if (loadSession()) {
      stopTracking();
    }
  });

  powerMonitor.on('resume', () => {
    const session = loadSession();
    if (session) {
      const result = dialog.showMessageBoxSync({
        type: 'question',
        message: 'Do you want to resume tracking?',
        buttons: ['Resume', 'Stop']
      });
      if (result === 0) {
        startTracking();
      } else {
        stopTracking();
      }
    }
  });
}
