import { supabase } from './supabase';
// Using crypto.randomUUID instead of nanoid for CommonJS compatibility
import { randomUUID } from 'crypto';
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
  console.log('🚀 startTracking() called');
  console.log(`📊 Current state - trackingActive: ${trackingActive}, userId: ${userId}, taskId: ${currentTaskId}`);
  
  if (trackingActive) {
    console.log('⚠️ Tracking already active, returning early');
    return;
  }
  if (!userId || !currentTaskId) {
    console.log('❌ Cannot start tracking: missing user ID or task ID');
    console.log(`   - userId: ${userId}`);
    console.log(`   - currentTaskId: ${currentTaskId}`);
    return;
  }

  console.log('✅ Starting tracking...');
  trackingActive = true;
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
      currentTimeLogId = randomUUID();
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
    currentTimeLogId = randomUUID();
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

  if (!screenshotInterval) {
    console.log(`🚀 Setting up screenshot interval: ${screenshotIntervalSeconds} seconds`);
    console.log(`📊 Current state - userId: ${userId}, taskId: ${currentTaskId}`);
    
    screenshotInterval = setInterval(() => {
      console.log(`⏰ Screenshot interval triggered - userId: ${userId}, taskId: ${currentTaskId}`);
      if (!userId || !currentTaskId) {
        console.log('❌ Missing userId or taskId, skipping screenshot');
        return;
      }
      console.log('📸 Calling captureAndUpload...');
      captureAndUpload(userId, currentTaskId);
    }, screenshotIntervalSeconds * 1000);
    
    console.log(`✅ Screenshot interval set up successfully - will capture every ${screenshotIntervalSeconds}s`);
  }

  if (!appInterval) {
    appInterval = setInterval(() => {
      if (!userId || !currentTaskId) return;
      void captureAppLog(userId, currentTaskId);
    }, 10000);
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
