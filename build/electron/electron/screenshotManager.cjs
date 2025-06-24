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
    // PRODUCTION FIX: Enhanced screenshot capture
    const sources = await electron_1.desktopCapturer.getSources({
        types: ['screen', 'window'], // Capture both screen and individual windows
        thumbnailSize: { width, height },
        fetchWindowIcons: false // Optimize performance
    });
    // If we have window sources, prefer the active window over screen
    let selectedSource = sources[0]; // Default to first source
    if (sources.length > 1) {
        // Try to find the active window that's not TimeFlow
        const activeWindow = sources.find(source => source.name &&
            !source.name.includes('Ebdaa Work Time') &&
            !source.name.includes('TimeFlow') &&
            source.name !== 'Entire Screen');
        if (activeWindow) {
            selectedSource = activeWindow;
            console.log('📸 Using active window:', activeWindow.name);
        }
        else {
            // Fall back to screen capture
            const screenSource = sources.find(source => source.name === 'Entire Screen');
            selectedSource = screenSource || sources[0];
            console.log('📸 Using screen capture');
        }
    }
    if (sources.length === 0) {
        const platform = process.platform;
        console.error(`❌ No screen sources available on ${platform}`);
        if (platform === 'win32') {
            console.error('🔧 Windows Screenshot Issue - Possible causes:');
            console.error('   1. Windows Privacy Settings blocking screen capture');
            console.error('   2. App needs Administrator privileges');
            console.error('   3. Windows Defender or enterprise policies blocking');
            console.error('   4. Graphics driver issues');
            console.error('   5. DWM (Desktop Window Manager) disabled');
        }
        else if (platform === 'darwin') {
            console.error('🔧 macOS Screenshot Issue - Check Screen Recording permissions');
        }
        return;
    }
    const buffer = selectedSource.thumbnail.toPNG();
    // Windows-specific validation for screenshot data
    if (process.platform === 'win32') {
        if (buffer.length < 1000) {
            console.error('❌ Windows screenshot failed: Buffer too small (corrupted or blank screenshot)');
            console.error('   This usually indicates:');
            console.error('   - Screen is locked or display is off');
            console.error('   - Privacy settings blocking capture');
            console.error('   - Graphics driver issues');
            return;
        }
        // Check for completely black screenshots (common Windows issue)
        const sampleBytes = buffer.slice(0, Math.min(buffer.length, 10000));
        const blackPixelRatio = sampleBytes.filter(byte => byte < 10).length / sampleBytes.length;
        if (blackPixelRatio > 0.95) {
            console.warn('⚠️ Windows screenshot appears to be mostly black - screen may be locked or off');
        }
        else {
            console.log(`✅ Windows screenshot validation passed: ${buffer.length} bytes, not blank`);
        }
    }
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
