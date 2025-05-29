"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserId = setUserId;
exports.setProjectId = setProjectId;
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
const uuid_validator_1 = require("./utils/uuid-validator.cjs");
const sessionManager_1 = require("./sessionManager.cjs");
let screenshotInterval;
let appInterval;
let trackingActive = false;
let userId = null;
let currentProjectId = null;
// Session persistence handled by sessionManager
let currentTimeLogId = null;
// Set the current user ID for tracking
function setUserId(id) {
    const validatedId = (0, uuid_validator_1.validateAndGetUUID)(id, (0, crypto_1.randomUUID)());
    userId = validatedId;
    console.log(`Set user ID: ${userId}`);
}
// Set the current project ID for tracking
function setProjectId(id) {
    const validatedId = (0, uuid_validator_1.validateAndGetUUID)(id, (0, uuid_validator_1.generateDefaultProjectUUID)());
    currentProjectId = validatedId;
    console.log(`Set project ID: ${currentProjectId}`);
}
// Update the current time log's idle status
async function updateTimeLogStatus(idle) {
    if (!currentTimeLogId)
        return;
    try {
        const { error } = await supabase_1.supabase
            .from('time_logs')
            .update({ is_idle: idle })
            .eq('id', currentTimeLogId);
        if (error) {
            (0, unsyncedManager_1.queueTimeLog)({
                id: currentTimeLogId,
                user_id: userId,
                project_id: currentProjectId,
                is_idle: idle
            });
        }
    }
    catch (err) {
        console.error('Failed to update idle status:', err);
        (0, unsyncedManager_1.queueTimeLog)({
            id: currentTimeLogId,
            user_id: userId,
            project_id: currentProjectId,
            is_idle: idle
        });
    }
}
// Start tracking activities
async function startTracking() {
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
    // Validate UUIDs before starting
    const validUserId = (0, uuid_validator_1.validateAndGetUUID)(userId, (0, crypto_1.randomUUID)());
    const validProjectId = (0, uuid_validator_1.validateAndGetUUID)(currentProjectId, (0, uuid_validator_1.generateDefaultProjectUUID)());
    if (validUserId !== userId) {
        console.warn(`Invalid user ID corrected: ${userId} -> ${validUserId}`);
        userId = validUserId;
    }
    if (validProjectId !== currentProjectId) {
        console.warn(`Invalid project ID corrected: ${currentProjectId} -> ${validProjectId}`);
        currentProjectId = validProjectId;
    }
    console.log('✅ Starting tracking...');
    trackingActive = true;
    try {
        const { data, error } = await supabase_1.supabase
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
            console.error('Failed to create time log:', error);
            currentTimeLogId = (0, crypto_1.randomUUID)();
            (0, unsyncedManager_1.queueTimeLog)({
                user_id: userId,
                project_id: currentProjectId,
                start_time: new Date().toISOString(),
                is_idle: false
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
            project_id: currentProjectId,
            start_time: new Date().toISOString(),
            is_idle: false
        });
    }
    const session = {
        project_id: currentProjectId,
        user_id: userId,
        start_time: new Date().toISOString(),
        time_log_id: currentTimeLogId
    };
    (0, sessionManager_1.saveSession)(session);
    (0, idleMonitor_1.startIdleMonitoring)();
    if (!screenshotInterval) {
        console.log(`🚀 Setting up screenshot interval: ${config_1.screenshotIntervalSeconds} seconds`);
        console.log(`📊 Current state - userId: ${userId}, projectId: ${currentProjectId}`);
        screenshotInterval = setInterval(() => {
            console.log(`⏰ Screenshot interval triggered - userId: ${userId}, projectId: ${currentProjectId}`);
            if (!userId || !currentProjectId) {
                console.log('❌ Missing userId or projectId, skipping screenshot');
                return;
            }
            console.log('📸 Calling captureAndUpload...');
            (0, screenshotManager_1.captureAndUpload)(userId, currentProjectId);
        }, config_1.screenshotIntervalSeconds * 1000);
        console.log(`✅ Screenshot interval set up successfully - will capture every ${config_1.screenshotIntervalSeconds}s`);
    }
    if (!appInterval) {
        appInterval = setInterval(() => {
            if (!userId || !currentProjectId)
                return;
            void (0, appLogsManager_1.captureAppLog)(userId, currentProjectId);
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
                .update({ end_time: new Date().toISOString() })
                .eq('id', currentTimeLogId);
            if (error) {
                (0, unsyncedManager_1.queueTimeLog)({
                    id: currentTimeLogId,
                    user_id: userId,
                    project_id: currentProjectId,
                    end_time: new Date().toISOString()
                });
            }
        }
        catch (err) {
            console.error('Failed to stop time log:', err);
            (0, unsyncedManager_1.queueTimeLog)({
                id: currentTimeLogId,
                user_id: userId,
                project_id: currentProjectId,
                end_time: new Date().toISOString()
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
