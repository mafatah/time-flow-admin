"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAndUpload = captureAndUpload;
exports.processQueue = processQueue;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const supabase_1 = require("./supabase.cjs");
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
const uuid_validator_1 = require("./utils/uuid-validator.cjs");
const activityMonitor_1 = require("./activityMonitor.cjs");
const UNSYNCED_LIST_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_screenshots.json');
function loadQueue() {
    try {
        if (fs_1.default.existsSync(UNSYNCED_LIST_PATH)) {
            return JSON.parse(fs_1.default.readFileSync(UNSYNCED_LIST_PATH, 'utf8'));
        }
    }
    catch (err) {
        (0, errorHandler_1.logError)('loadQueue', err);
    }
    return [];
}
function saveQueue(items) {
    try {
        fs_1.default.writeFileSync(UNSYNCED_LIST_PATH, JSON.stringify(items));
    }
    catch (err) {
        (0, errorHandler_1.logError)('saveQueue', err);
    }
}
const queue = loadQueue();
let retryInterval = null;
if (queue.length > 0) {
    startRetry();
}
async function captureAndUpload(userId, projectId) {
    // Validate UUIDs before processing
    const validUserId = (0, uuid_validator_1.validateAndGetUUID)(userId, (0, crypto_1.randomUUID)());
    const validProjectId = (0, uuid_validator_1.validateAndGetUUID)(projectId, (0, uuid_validator_1.generateDefaultProjectUUID)());
    if (validUserId !== userId) {
        console.warn(`Screenshot: Invalid user ID corrected: ${userId} -> ${validUserId}`);
    }
    if (validProjectId !== projectId) {
        console.warn(`Screenshot: Invalid project ID corrected: ${projectId} -> ${validProjectId}`);
    }
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const sources = await electron_1.desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
    });
    if (sources.length === 0)
        return;
    const buffer = sources[0].thumbnail.toPNG();
    const filename = `screenshot_${(0, crypto_1.randomUUID)()}.png`;
    const tempPath = path_1.default.join(electron_1.app.getPath('temp'), filename);
    fs_1.default.writeFileSync(tempPath, buffer);
    try {
        await uploadScreenshot(tempPath, validUserId, validProjectId, Date.now());
        fs_1.default.unlink(tempPath, () => { });
    }
    catch (err) {
        (0, errorHandler_1.logError)('captureAndUpload', err);
        (0, errorHandler_1.showError)('Screenshot Error', 'Failed to upload screenshot. It will be retried.');
        const unsyncedDir = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_screenshots');
        fs_1.default.mkdirSync(unsyncedDir, { recursive: true });
        const dest = path_1.default.join(unsyncedDir, filename);
        fs_1.default.copyFileSync(tempPath, dest);
        fs_1.default.unlink(tempPath, () => { });
        queue.push({ path: dest, userId: validUserId, projectId: validProjectId, timestamp: Date.now() });
        saveQueue(queue);
        startRetry();
    }
}
async function uploadScreenshot(filePath, userId, projectId, ts) {
    const fileData = fs_1.default.readFileSync(filePath);
    const filename = path_1.default.basename(filePath);
    const { error: uploadError } = await supabase_1.supabase.storage
        .from('screenshots')
        .upload(`${userId}/${filename}`, fileData);
    if (uploadError)
        throw uploadError;
    const { data: publicUrlData } = supabase_1.supabase.storage
        .from('screenshots')
        .getPublicUrl(`${userId}/${filename}`);
    const imageUrl = publicUrlData.publicUrl;
    // Get current activity metrics for the screenshot
    const activityMetrics = (0, activityMonitor_1.getCurrentActivityMetrics)();
    console.log('📊 Screenshot activity metrics:', {
        activity_score: activityMetrics.activity_score,
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
    });
    const { error: dbError } = await supabase_1.supabase
        .from('screenshots')
        .insert({
        user_id: userId,
        project_id: projectId,
        image_url: imageUrl,
        captured_at: new Date(ts).toISOString(),
        activity_percent: activityMetrics.activity_score, // Use the real activity score
        focus_percent: Math.min(100, activityMetrics.activity_score + 10), // Focus slightly higher than activity
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
    });
    if (dbError) {
        (0, unsyncedManager_1.queueScreenshot)({
            user_id: userId,
            project_id: projectId,
            image_url: imageUrl,
            captured_at: new Date(ts).toISOString(),
            activity_percent: activityMetrics.activity_score,
            focus_percent: Math.min(100, activityMetrics.activity_score + 10),
            mouse_clicks: activityMetrics.mouse_clicks,
            keystrokes: activityMetrics.keystrokes,
            mouse_movements: activityMetrics.mouse_movements
        });
        throw dbError;
    }
    console.log('✅ Screenshot uploaded with activity data:', {
        activity_percent: activityMetrics.activity_score,
        mouse_clicks: activityMetrics.mouse_clicks,
        keystrokes: activityMetrics.keystrokes,
        mouse_movements: activityMetrics.mouse_movements
    });
}
function startRetry() {
    if (retryInterval)
        return;
    retryInterval = setInterval(processQueue, 30000);
}
async function processQueue() {
    for (const item of [...queue]) {
        try {
            await uploadScreenshot(item.path, item.userId, item.projectId, item.timestamp);
            fs_1.default.unlink(item.path, () => { });
            const index = queue.indexOf(item);
            if (index !== -1)
                queue.splice(index, 1);
            saveQueue(queue);
        }
        catch (err) {
            (0, errorHandler_1.logError)('processQueue', err);
            // keep in queue
        }
    }
    if (queue.length === 0 && retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
    }
}
