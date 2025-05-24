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
  try {
    console.log('📸 Starting screenshot capture for user:', userId, 'task:', taskId);
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    console.log(`🖥️  Display size: ${width} x ${height}`);
    
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width: Math.min(width, 1920), height: Math.min(height, 1080) }
    });
    
    console.log(`📺 Available sources: ${sources.length}`);
    
    if (sources.length === 0) {
      console.log('❌ No screen sources available');
      return;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const filename = `screenshot_${randomUUID()}.png`;
    const tempPath = path.join(app.getPath('temp'), filename);
    fs.writeFileSync(tempPath, buffer);

    console.log('💾 Screenshot saved to temp path:', tempPath);

    try {
      // Upload to Supabase
      console.log('☁️  Uploading screenshot...');
      await uploadScreenshot(tempPath, userId, taskId, Date.now());
      console.log('✅ Screenshot uploaded successfully');
    } catch (uploadError) {
      console.error('❌ Screenshot upload failed:', uploadError);
      
      // Save to local queue for retry
      const unsyncedDir = path.join(app.getPath('userData'), 'unsynced_screenshots');
      fs.mkdirSync(unsyncedDir, { recursive: true });
      const localPath = path.join(unsyncedDir, filename);
      fs.copyFileSync(tempPath, localPath);
      
      // Add to retry queue
      queue.push({
        path: localPath,
        userId: userId,
        taskId: taskId,
        timestamp: Date.now()
      });
      saveQueue(queue);
      startRetry();
      
      console.log('📦 Screenshot queued for later upload:', filename);
    }

    // Also save to test directory for debugging
    const testDir = path.join(app.getPath('userData'), 'test_screenshots');
    fs.mkdirSync(testDir, { recursive: true });
    const testPath = path.join(testDir, filename);
    fs.copyFileSync(tempPath, testPath);
    console.log('✅ Test screenshot saved successfully to:', testPath);
    console.log('📊 Screenshot size:', buffer.length, 'bytes');
    
    // Clean up temp file
    fs.unlink(tempPath, () => {});
    
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    logError('captureAndUpload', error);
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
