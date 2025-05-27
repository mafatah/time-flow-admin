
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
let currentProjectId: string | null = null;

// Session persistence handled by sessionManager
let currentTimeLogId: string | null = null;

// Set the current user ID for tracking
export function setUserId(id: string) {
  userId = id;
}

// Set the current project ID for tracking
export function setProjectId(id: string) {
  currentProjectId = id;
}

// Legacy function for backward compatibility - now just sets project ID
export function setTaskId(id: string) {
  // For backward compatibility, treat task ID as project ID
  currentProjectId = id;
}

// Update the current time log's idle status
export async function updateTimeLogStatus(idle: boolean) {
  if (!currentTimeLogId) return;
  try {
    const { error } = await supabase
      .from('time_logs')
      .update({ is_idle: idle })
      .eq('id', currentTimeLogId);
    if (error) {
      queueTimeLog({
        id: currentTimeLogId,
        user_id: userId!,
        project_id: currentProjectId!,
        is_idle: idle
      });
    }
  } catch (err) {
    console.error('Failed to update idle status:', err);
    queueTimeLog({
      id: currentTimeLogId,
      user_id: userId!,
      project_id: currentProjectId!,
      is_idle: idle
    });
  }
}

// Start tracking activities
export async function startTracking() {
  console.log('🚀 startTracking() called');
  console.log(`📊 Current state - trackingActive: ${trackingActive}, userId: ${userId}, projectId: ${currentProjectId}`);
  
  if (trackingActive) {
    console.log('⚠️ Tracking already active, returning early');
    return;
  }
  if (!userId || !currentProjectId) {
    console.log('❌ Cannot start tracking: missing user ID or project ID');
    console.log(`   - userId: ${userId}`);
    console.log(`   - currentProjectId: ${currentProjectId}`);
    return;
  }

  console.log('✅ Starting tracking...');
  trackingActive = true;
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        user_id: userId,
        project_id: currentProjectId,
        start_time: new Date().toISOString(),
        is_idle: false
      })
      .select('id')
      .single();

    if (error || !data) {
      currentTimeLogId = randomUUID();
      queueTimeLog({
        user_id: userId,
        project_id: currentProjectId,
        start_time: new Date().toISOString(),
        is_idle: false
      });
    } else {
      currentTimeLogId = data.id;
    }
  } catch (err) {
    console.error('Failed to start time log:', err);
    currentTimeLogId = randomUUID();
    queueTimeLog({
      user_id: userId,
      project_id: currentProjectId,
      start_time: new Date().toISOString(),
      is_idle: false
    });
  }

  const session: SessionData = {
    project_id: currentProjectId!,
    user_id: userId!,
    start_time: new Date().toISOString(),
    time_log_id: currentTimeLogId!
  };
  storeSession(session);
  startIdleMonitoring();

  if (!screenshotInterval) {
    console.log(`🚀 Setting up screenshot interval: ${screenshotIntervalSeconds} seconds`);
    console.log(`📊 Current state - userId: ${userId}, projectId: ${currentProjectId}`);
    
    screenshotInterval = setInterval(() => {
      console.log(`⏰ Screenshot interval triggered - userId: ${userId}, projectId: ${currentProjectId}`);
      if (!userId || !currentProjectId) {
        console.log('❌ Missing userId or projectId, skipping screenshot');
        return;
      }
      console.log('📸 Calling captureAndUpload...');
      captureAndUpload(userId, currentProjectId);
    }, screenshotIntervalSeconds * 1000);
    
    console.log(`✅ Screenshot interval set up successfully - will capture every ${screenshotIntervalSeconds}s`);
  }

  if (!appInterval) {
    appInterval = setInterval(() => {
      if (!userId || !currentProjectId) return;
      void captureAppLog(userId, currentProjectId);
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
        .update({ end_time: new Date().toISOString() })
        .eq('id', currentTimeLogId);
      if (error) {
        queueTimeLog({
          id: currentTimeLogId,
          user_id: userId!,
          project_id: currentProjectId!,
          end_time: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to stop time log:', err);
      queueTimeLog({
        id: currentTimeLogId,
        user_id: userId!,
        project_id: currentProjectId!,
        end_time: new Date().toISOString()
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
