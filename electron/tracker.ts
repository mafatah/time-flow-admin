import { supabase } from '../src/lib/supabase';
import { nanoid } from 'nanoid';
import activeWin from 'active-win';
import { startIdleTracker, stopIdleTracker, setCurrentTimeLog } from './idleTracker';
import { captureAndUpload } from './screenshotManager';
import {
  saveSession as storeSession,
  loadSession as getSession,
  clearSession,
  SessionData
} from './sessionManager';

let screenshotInterval: ReturnType<typeof setInterval> | undefined;
let appInterval: ReturnType<typeof setInterval> | undefined;
let trackingActive = false;
let userId: string | null = null;
let currentTaskId: string | null = null;
let offlineData: {
  activeWindows: Array<{ title: string; app: string; timestamp: number; taskId: string }>;
} = {
  activeWindows: []
};

// Session persistence handled by sessionManager
let currentTimeLogId: string | null = null;

// Set the current user ID for tracking
export function setUserId(id: string) {
  userId = id;
}

// Set the current task ID for tracking
export function setTaskId(id: string) {
  currentTaskId = id;
}

// Start tracking activities
export function startTracking() {
  if (trackingActive) return;
  if (!userId || !currentTaskId) {
    console.log('Cannot start tracking: missing user ID or task ID');
    return;
  }

  trackingActive = true;
  currentTimeLogId = nanoid();

  const session: SessionData = {
    task_id: currentTaskId,
    user_id: userId,
    start_time: new Date().toISOString(),
    time_log_id: currentTimeLogId
  };
  storeSession(session);
  setCurrentTimeLog(currentTimeLogId);
  startIdleTracker();

  if (!screenshotInterval) {
    screenshotInterval = setInterval(() => {
      if (!userId || !currentTaskId) return;
      captureAndUpload(userId, currentTaskId);
    }, 60000); // Capture every minute
  }

  if (!appInterval) {
    appInterval = setInterval(async () => {
      // Implement application tracking
      try {
        if (!userId || !currentTaskId) {
          console.log('Cannot track application: missing user ID or task ID');
          return;
        }
        
        // Get active window information
        const activeWindow = await activeWin();
        
        if (activeWindow) {
          const windowData = {
            title: activeWindow.title,
            app: activeWindow.owner.name,
            timestamp: Date.now(),
            taskId: currentTaskId
          };
          
          // Try to log active window to server
          try {
            // Log active window to time_logs table or specialized table if available
            const { error: logError } = await supabase
              .from('time_logs')
              .insert({
                user_id: userId,
                task_id: currentTaskId,
                is_idle: false,
                // Add metadata about active window
                metadata: {
                  window_title: activeWindow.title,
                  application: activeWindow.owner.name
                }
              });
              
            if (logError) {
              console.error('Failed to log active window:', logError);
              offlineData.activeWindows.push(windowData);
            }
          } catch (e) {
            console.error('Error logging active window:', e);
            offlineData.activeWindows.push(windowData);
          }
        }
      } catch (error) {
        console.error('Error tracking application:', error);
      }
    }, 10000); // Track every 10 seconds
  }
}

// Stop tracking activities
export function stopTracking() {
  if (!trackingActive) return;
  trackingActive = false;
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = undefined;
  }
  if (appInterval) {
    clearInterval(appInterval);
    appInterval = undefined;
  }

  stopIdleTracker();
  setCurrentTimeLog(null);
  clearSession();
  currentTimeLogId = null;
}

// Sync offline data when online
export async function syncOfflineData() {
  if (!userId) return;
  
  // Sync active windows
  for (const window of offlineData.activeWindows) {
    try {
      // Log active window to time_logs table
      const { error: logError } = await supabase
        .from('time_logs')
        .insert({
          user_id: userId,
          task_id: window.taskId,
          is_idle: false,
          start_time: new Date(window.timestamp).toISOString(),
          metadata: {
            window_title: window.title,
            application: window.app
          }
        });
        
      if (!logError) {
        // Remove from offline data
        offlineData.activeWindows = offlineData.activeWindows.filter(w => 
          w.timestamp !== window.timestamp && w.title !== window.title);
      }
    } catch (e) {
      console.error('Failed to sync offline active window data:', e);
    }
  }
}

// Load a saved session from disk
export function loadSession(): SessionData | null {
  return getSession();
}

// Clear the saved session
export function clearSavedSession() {
  clearSession();
}
