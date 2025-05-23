import { app, desktopCapturer, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot } from './unsyncedManager';
import { logError, showError } from './errorHandler';

const UNSYNCED_LIST_PATH = path.join(app.getPath('userData'), 'unsynced_screenshots.json');

function loadQueue(): QueueItem[] {
  try {
    if (fs.existsSync(UNSYNCED_LIST_PATH)) {
      return JSON.parse(fs.readFileSync(UNSYNCED_LIST_PATH, 'utf8')) as QueueItem[];
    }
  } catch (err) {
    logError('loadQueue', err);
  }
  return [];
}

function saveQueue(items: QueueItem[]) {
  try {
    fs.writeFileSync(UNSYNCED_LIST_PATH, JSON.stringify(items));
  } catch (err) {
    logError('saveQueue', err);
  }
}

interface QueueItem {
  path: string;
  userId: string;
  taskId: string;
  timestamp: number;
}

const queue: QueueItem[] = loadQueue();
let retryInterval: NodeJS.Timeout | null = null;

export async function captureAndUpload(userId: string, taskId: string) {
  console.log('📸 Starting screenshot capture for user:', userId, 'task:', taskId);
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  console.log('🖥️  Display size:', width, 'x', height);
  
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
  console.log('📺 Available sources:', sources.length);
  
  if (sources.length === 0) {
    console.log('❌ No screen sources available - check macOS Screen Recording permissions');
    logError('captureAndUpload', new Error('No screen sources available'));
    return;
  }

  const buffer = sources[0].thumbnail.toPNG();
  const filename = `screenshot_${randomUUID()}.png`;
  const tempPath = path.join(app.getPath('temp'), filename);
  fs.writeFileSync(tempPath, buffer);
  console.log('💾 Screenshot saved to temp path:', tempPath);

  try {
    console.log('☁️  Uploading screenshot...');
    await uploadScreenshot(tempPath, userId, taskId, Date.now());
    console.log('✅ Screenshot uploaded successfully');
    fs.unlink(tempPath, () => {});
  } catch (err) {
    console.log('❌ Screenshot upload failed:', err);
    logError('captureAndUpload', err);
    showError('Screenshot Error', 'Failed to upload screenshot. It will be retried.');
    const unsyncedDir = path.join(app.getPath('userData'), 'unsynced_screenshots');
    fs.mkdirSync(unsyncedDir, { recursive: true });
    const dest = path.join(unsyncedDir, filename);
    fs.copyFileSync(tempPath, dest);
    fs.unlink(tempPath, () => {});
    queue.push({ path: dest, userId, taskId, timestamp: Date.now() });
    saveQueue(queue);
    startRetry();
  }
}

async function uploadScreenshot(filePath: string, userId: string, taskId: string, ts: number) {
  const fileData = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const { error: uploadError } = await supabase.storage
    .from('screenshots')
    .upload(`${userId}/${filename}`, fileData);

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(`${userId}/${filename}`);

  const imageUrl = publicUrlData.publicUrl;

  const { error: dbError } = await supabase
    .from('screenshots')
    .insert({ user_id: userId, task_id: taskId, image_url: imageUrl, captured_at: new Date(ts).toISOString() });

  if (dbError) {
    queueScreenshot({
      user_id: userId,
      task_id: taskId,
      image_url: imageUrl,
      captured_at: new Date(ts).toISOString(),
    });
    throw dbError;
  }
}

function startRetry() {
  if (retryInterval) return;
  retryInterval = setInterval(processQueue, 30000);
}

// Initialize retry if there are items in queue
if (queue.length > 0) {
  startRetry();
}

export async function processQueue() {
  for (const item of [...queue]) {
    try {
      await uploadScreenshot(item.path, item.userId, item.taskId, item.timestamp);
      fs.unlink(item.path, () => {});
      const index = queue.indexOf(item);
      if (index !== -1) queue.splice(index, 1);
      saveQueue(queue);
    } catch (err) {
      logError('processQueue', err);
      // keep in queue
    }
  }
  if (queue.length === 0 && retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
}
