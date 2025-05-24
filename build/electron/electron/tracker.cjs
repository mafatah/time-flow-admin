"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserId = setUserId;
exports.setTaskId = setTaskId;
exports.updateTimeLogStatus = updateTimeLogStatus;
exports.startTracking = startTracking;
exports.stopTracking = stopTracking;
exports.syncOfflineData = syncOfflineData;
exports.loadSession = loadSession;
exports.clearSavedSession = clearSavedSession;
const supabase_1 = require("./supabase.cjs");
// Using crypto.randomUUID instead of nanoid for CommonJS compatibility
const crypto_1 = require("crypto");
const idleMonitor_1 = require("./idleMonitor.cjs");
const screenshotManager_1 = require("./screenshotManager.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const appLogsManager_1 = require("./appLogsManager.cjs");
const config_1 = require("./config.cjs");
const sessionManager_1 = require("./sessionManager.cjs");
let screenshotInterval;
let appInterval;
let trackingActive = false;
let userId = null;
let currentTaskId = null;
// Session persistence handled by sessionManager
let currentTimeLogId = null;
// Set the current user ID for tracking
function setUserId(id) {
    userId = id;
}
// Set the current task ID for tracking
function setTaskId(id) {
    currentTaskId = id;
}
// Update the current time log's idle status
async function updateTimeLogStatus(idle) {
    if (!currentTimeLogId)
        return;
    try {
        const { error } = await supabase_1.supabase
            .from('time_logs')
            .update({ is_idle: idle, status: idle ? 'idle' : 'active' })
            .eq('id', currentTimeLogId);
        if (error) {
            (0, unsyncedManager_1.queueTimeLog)({
                id: currentTimeLogId,
                user_id: userId,
                task_id: currentTaskId,
                status: idle ? 'idle' : 'active',
                is_idle: idle
            });
        }
    }
    catch (err) {
        console.error('Failed to update idle status:', err);
        (0, unsyncedManager_1.queueTimeLog)({
            id: currentTimeLogId,
            user_id: userId,
            task_id: currentTaskId,
            status: idle ? 'idle' : 'active',
            is_idle: idle
        });
    }
}
// Start tracking activities
async function startTracking() {
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
        const { data, error } = await supabase_1.supabase
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
            currentTimeLogId = (0, crypto_1.randomUUID)();
            (0, unsyncedManager_1.queueTimeLog)({
                user_id: userId,
                task_id: currentTaskId,
                start_time: new Date().toISOString(),
                status: 'active'
            });
        }
        else {
            currentTimeLogId = data.id;
        }
    }
    catch (err) {
        console.error('Failed to start time log:', err);
        currentTimeLogId = (0, crypto_1.randomUUID)();
        (0, unsyncedManager_1.queueTimeLog)({
            user_id: userId,
            task_id: currentTaskId,
            start_time: new Date().toISOString(),
            status: 'active'
        });
    }
    const session = {
        task_id: currentTaskId,
        user_id: userId,
        start_time: new Date().toISOString(),
        time_log_id: currentTimeLogId
    };
    (0, sessionManager_1.saveSession)(session);
    (0, idleMonitor_1.startIdleMonitoring)();
    if (!screenshotInterval) {
        console.log(`🚀 Setting up screenshot interval: ${config_1.screenshotIntervalSeconds} seconds`);
        console.log(`📊 Current state - userId: ${userId}, taskId: ${currentTaskId}`);
        screenshotInterval = setInterval(() => {
            console.log(`⏰ Screenshot interval triggered - userId: ${userId}, taskId: ${currentTaskId}`);
            if (!userId || !currentTaskId) {
                console.log('❌ Missing userId or taskId, skipping screenshot');
                return;
            }
            console.log('📸 Calling captureAndUpload...');
            (0, screenshotManager_1.captureAndUpload)(userId, currentTaskId);
        }, config_1.screenshotIntervalSeconds * 1000);
        console.log(`✅ Screenshot interval set up successfully - will capture every ${config_1.screenshotIntervalSeconds}s`);
    }
    if (!appInterval) {
        appInterval = setInterval(() => {
            if (!userId || !currentTaskId)
                return;
            void (0, appLogsManager_1.captureAppLog)(userId, currentTaskId);
        }, 10000);
    }
}
// Stop tracking activities
async function stopTracking() {
    if (!trackingActive)
        return;
    trackingActive = false;
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = undefined;
    }
    if (appInterval) {
        clearInterval(appInterval);
        appInterval = undefined;
    }
    (0, idleMonitor_1.stopIdleMonitoring)();
    if (currentTimeLogId) {
        try {
            const { error } = await supabase_1.supabase
                .from('time_logs')
                .update({ end_time: new Date().toISOString(), status: 'completed' })
                .eq('id', currentTimeLogId);
            if (error) {
                (0, unsyncedManager_1.queueTimeLog)({
                    id: currentTimeLogId,
                    user_id: userId,
                    task_id: currentTaskId,
                    end_time: new Date().toISOString(),
                    status: 'completed'
                });
            }
        }
        catch (err) {
            console.error('Failed to stop time log:', err);
            (0, unsyncedManager_1.queueTimeLog)({
                id: currentTimeLogId,
                user_id: userId,
                task_id: currentTaskId,
                end_time: new Date().toISOString(),
                status: 'completed'
            });
        }
    }
    (0, sessionManager_1.clearSession)();
    currentTimeLogId = null;
}
// Sync offline data when online
async function syncOfflineData() {
    await (0, unsyncedManager_1.processQueue)();
    await (0, screenshotManager_1.processQueue)();
}
// Load a saved session from disk
function loadSession() {
    return (0, sessionManager_1.loadSession)();
}
// Clear the saved session
function clearSavedSession() {
    (0, sessionManager_1.clearSession)();
}
