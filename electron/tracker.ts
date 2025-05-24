import { supabase } from './supabase';
import { nanoid } from 'nanoid';
import { startIdleMonitoring, stopIdleMonitoring } from './idleMonitor';
import { captureAndUpload, processQueue as processScreenshotQueue } from './screenshotManager';
import { queueTimeLog, processQueue as processUnsyncedQueue } from './unsyncedManager';
import { captureAppLog } from './appLogsManager';
import { screenshotIntervalSeconds } from './config';
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

// Update the current time log's idle status
export async function updateTimeLogStatus(idle: boolean) {
  if (!currentTimeLogId) return;
  try {
    const { error } = await supabase
      .from('time_logs')
      .update({ is_idle: idle, status: idle ? 'idle' : 'active' })
      .eq('id', currentTimeLogId);
    if (error) {
      queueTimeLog({
        id: currentTimeLogId,
        user_id: userId!,
        task_id: currentTaskId!,
        status: idle ? 'idle' : 'active',
        is_idle: idle
      });
    }
  } catch (err) {
    console.error('Failed to update idle status:', err);
    queueTimeLog({
      id: currentTimeLogId,
      user_id: userId!,
      task_id: currentTaskId!,
      status: idle ? 'idle' : 'active',
      is_idle: idle
    });
  }
}

// Start tracking activities
export async function startTracking() {
  if (trackingActive) return;
  
  trackingActive = true;
  
  // Start screenshot capture regardless of user/task status
  if (!screenshotInterval) {
    screenshotInterval = setInterval(() => {
      // Pass userId and taskId if available, otherwise undefined for anonymous capture
      captureAndUpload(userId || undefined, currentTaskId || undefined);
    }, screenshotIntervalSeconds * 1000);
  }

  // Only start time logging and app logging if we have user and task
  if (userId && currentTaskId) {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userId,
          task_id: currentTaskId,
          start_time: new Date().toISOString(),
          status: 'active'
        })
        .select('id')
        .single();

      if (error || !data) {
        currentTimeLogId = nanoid();
        queueTimeLog({
          user_id: userId,
          task_id: currentTaskId,
          start_time: new Date().toISOString(),
          status: 'active'
        });
      } else {
        currentTimeLogId = data.id;
      }
    } catch (err) {
      console.error('Failed to start time log:', err);
      currentTimeLogId = nanoid();
      queueTimeLog({
        user_id: userId,
        task_id: currentTaskId,
        start_time: new Date().toISOString(),
        status: 'active'
      });
    }

    const session: SessionData = {
      task_id: currentTaskId!,
      user_id: userId!,
      start_time: new Date().toISOString(),
      time_log_id: currentTimeLogId!
    };
    storeSession(session);
    startIdleMonitoring();

    if (!appInterval) {
      appInterval = setInterval(() => {
        if (!userId || !currentTaskId) return;
        void captureAppLog(userId, currentTaskId);
      }, 10000);
    }
  } else {
    console.log('Starting screenshot-only tracking (no user ID or task ID provided)');
  }
}

// Stop tracking activities
export async function stopTracking() {
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

  stopIdleMonitoring();
  if (currentTimeLogId) {
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: new Date().toISOString(), status: 'completed' })
        .eq('id', currentTimeLogId);
      if (error) {
        queueTimeLog({
          id: currentTimeLogId,
          user_id: userId!,
          task_id: currentTaskId!,
          end_time: new Date().toISOString(),
          status: 'completed'
        });
      }
    } catch (err) {
      console.error('Failed to stop time log:', err);
      queueTimeLog({
        id: currentTimeLogId,
        user_id: userId!,
        task_id: currentTaskId!,
        end_time: new Date().toISOString(),
        status: 'completed'
      });
    }
  }

  clearSession();
  currentTimeLogId = null;
}

// Sync offline data when online
export async function syncOfflineData() {
  await processUnsyncedQueue();
  await processScreenshotQueue();
}

// Load a saved session from disk
export function loadSession(): SessionData | null {
  return getSession();
}

// Clear the saved session
export function clearSavedSession() {
  clearSession();
}
