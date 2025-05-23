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
async function captureAndUpload(userId, taskId) {
    console.log('📸 Starting screenshot capture for user:', userId, 'task:', taskId);
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    console.log('🖥️  Display size:', width, 'x', height);
    const sources = await electron_1.desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
    console.log('📺 Available sources:', sources.length);
    if (sources.length === 0) {
        console.log('❌ No screen sources available - check macOS Screen Recording permissions');
        (0, errorHandler_1.logError)('captureAndUpload', new Error('No screen sources available'));
        return;
    }
    const buffer = sources[0].thumbnail.toPNG();
    const filename = `screenshot_${(0, crypto_1.randomUUID)()}.png`;
    const tempPath = path_1.default.join(electron_1.app.getPath('temp'), filename);
    fs_1.default.writeFileSync(tempPath, buffer);
    console.log('💾 Screenshot saved to temp path:', tempPath);
    try {
        console.log('☁️  Uploading screenshot...');
        await uploadScreenshot(tempPath, userId, taskId, Date.now());
        console.log('✅ Screenshot uploaded successfully');
        fs_1.default.unlink(tempPath, () => { });
    }
    catch (err) {
        console.log('❌ Screenshot upload failed:', err);
        (0, errorHandler_1.logError)('captureAndUpload', err);
        (0, errorHandler_1.showError)('Screenshot Error', 'Failed to upload screenshot. It will be retried.');
        const unsyncedDir = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_screenshots');
        fs_1.default.mkdirSync(unsyncedDir, { recursive: true });
        const dest = path_1.default.join(unsyncedDir, filename);
        fs_1.default.copyFileSync(tempPath, dest);
        fs_1.default.unlink(tempPath, () => { });
        queue.push({ path: dest, userId, taskId, timestamp: Date.now() });
        saveQueue(queue);
        startRetry();
    }
}
async function uploadScreenshot(filePath, userId, taskId, ts) {
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
    const { error: dbError } = await supabase_1.supabase
        .from('screenshots')
        .insert({ user_id: userId, task_id: taskId, image_url: imageUrl, captured_at: new Date(ts).toISOString() });
    if (dbError) {
        (0, unsyncedManager_1.queueScreenshot)({
            user_id: userId,
            task_id: taskId,
            image_url: imageUrl,
            captured_at: new Date(ts).toISOString(),
        });
        throw dbError;
    }
}
function startRetry() {
    if (retryInterval)
        return;
    retryInterval = setInterval(processQueue, 30000);
}
// Initialize retry if there are items in queue
if (queue.length > 0) {
    startRetry();
}
async function processQueue() {
    for (const item of [...queue]) {
        try {
            await uploadScreenshot(item.path, item.userId, item.taskId, item.timestamp);
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
