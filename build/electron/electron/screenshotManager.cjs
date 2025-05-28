import { desktopCapturer, screen, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot } from './unsyncedManager';
import { logError, showError } from './errorHandler';
const UNSYNCED_LIST_PATH = path.join(app.getPath('userData'), 'unsynced_screenshots.json');
function loadQueue() {
    try {
        if (fs.existsSync(UNSYNCED_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(UNSYNCED_LIST_PATH, 'utf8'));
        }
    }
    catch (err) {
        logError('loadQueue', err);
    }
    return [];
}
function saveQueue(items) {
    try {
        fs.writeFileSync(UNSYNCED_LIST_PATH, JSON.stringify(items));
    }
    catch (err) {
        logError('saveQueue', err);
    }
}
const queue = loadQueue();
let retryInterval = null;
if (queue.length > 0) {
    startRetry();
}
export async function captureAndUpload(userId, projectId) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
    });
    if (sources.length === 0)
        return;
    const buffer = sources[0].thumbnail.toPNG();
    const filename = `screenshot_${randomUUID()}.png`;
    const tempPath = path.join(app.getPath('temp'), filename);
    fs.writeFileSync(tempPath, buffer);
    try {
        await uploadScreenshot(tempPath, userId, projectId, Date.now());
        fs.unlink(tempPath, () => { });
    }
    catch (err) {
        logError('captureAndUpload', err);
        showError('Screenshot Error', 'Failed to upload screenshot. It will be retried.');
        const unsyncedDir = path.join(app.getPath('userData'), 'unsynced_screenshots');
        fs.mkdirSync(unsyncedDir, { recursive: true });
        const dest = path.join(unsyncedDir, filename);
        fs.copyFileSync(tempPath, dest);
        fs.unlink(tempPath, () => { });
        queue.push({ path: dest, userId, projectId, timestamp: Date.now() });
        saveQueue(queue);
        startRetry();
    }
}
async function uploadScreenshot(filePath, userId, projectId, ts) {
    const fileData = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(`${userId}/${filename}`, fileData);
    if (uploadError)
        throw uploadError;
    const { data: publicUrlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(`${userId}/${filename}`);
    const imageUrl = publicUrlData.publicUrl;
    const { error: dbError } = await supabase
        .from('screenshots')
        .insert({
        user_id: userId,
        project_id: projectId,
        image_url: imageUrl,
        captured_at: new Date(ts).toISOString()
    });
    if (dbError) {
        queueScreenshot({
            user_id: userId,
            project_id: projectId,
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
export async function processQueue() {
    for (const item of [...queue]) {
        try {
            await uploadScreenshot(item.path, item.userId, item.projectId, item.timestamp);
            fs.unlink(item.path, () => { });
            const index = queue.indexOf(item);
            if (index !== -1)
                queue.splice(index, 1);
            saveQueue(queue);
        }
        catch (err) {
            logError('processQueue', err);
            // keep in queue
        }
    }
    if (queue.length === 0 && retryInterval) {
        clearInterval(retryInterval);
        retryInterval = null;
    }
}
