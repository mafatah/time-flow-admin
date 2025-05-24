
import { app, desktopCapturer, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
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
  userId: string | null;
  taskId: string | null;
  timestamp: number;
}

const queue: QueueItem[] = loadQueue();
let retryInterval: NodeJS.Timeout | null = null;

if (queue.length > 0) {
  startRetry();
}

export async function captureAndUpload(userId?: string, taskId?: string) {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const sources = await desktopCapturer.getSources({ 
      types: ['screen'], 
      thumbnailSize: { width, height } 
    });
    
    if (sources.length === 0) {
      console.log('No screen sources available');
      return;
    }

    const buffer = sources[0].thumbnail.toPNG();
    const filename = `screenshot_${nanoid()}.png`;
    const tempPath = path.join(app.getPath('temp'), filename);
    fs.writeFileSync(tempPath, buffer);

    try {
      await uploadScreenshot(tempPath, userId || null, taskId || null, Date.now());
      // Clean up temp file after successful upload
      fs.unlink(tempPath, () => {});
      console.log('Screenshot uploaded successfully');
    } catch (err) {
      logError('captureAndUpload', err);
      console.error('Screenshot upload failed, queuing for retry:', err);
      
      // Save to unsynced directory for retry
      const unsyncedDir = path.join(app.getPath('userData'), 'unsynced_screenshots');
      fs.mkdirSync(unsyncedDir, { recursive: true });
      const dest = path.join(unsyncedDir, filename);
      fs.copyFileSync(tempPath, dest);
      fs.unlink(tempPath, () => {});
      
      queue.push({ path: dest, userId: userId || null, taskId: taskId || null, timestamp: Date.now() });
      saveQueue(queue);
      startRetry();
    }
  } catch (err) {
    logError('captureAndUpload', err);
    console.error('Failed to capture screenshot:', err);
  }
}

async function uploadScreenshot(filePath: string, userId: string | null, taskId: string | null, ts: number) {
  const fileData = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  // Use anonymous folder if no userId provided
  const storagePath = userId ? `${userId}/${filename}` : `anonymous/${filename}`;

  console.log(`Uploading screenshot to storage path: ${storagePath}`);

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('screenshots')
    .upload(storagePath, fileData, {
      contentType: 'image/png',
      upsert: false
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw uploadError;
  }

  console.log('Storage upload successful:', uploadData);

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;
  console.log('Generated public URL:', imageUrl);

  // Insert record into screenshots table with nullable fields
  const { error: dbError } = await supabase
    .from('screenshots')
    .insert({ 
      user_id: userId, 
      task_id: taskId, 
      image_url: imageUrl, 
      captured_at: new Date(ts).toISOString() 
    });

  if (dbError) {
    console.error('Database insert error:', dbError);
    // Queue screenshot record for later insertion
    queueScreenshot({
      user_id: userId,
      task_id: taskId,
      image_url: imageUrl,
      captured_at: new Date(ts).toISOString(),
    });
    throw dbError;
  }

  console.log('Screenshot record inserted successfully');
}

function startRetry() {
  if (retryInterval) return;
  console.log('Starting screenshot retry process');
  retryInterval = setInterval(processQueue, 30000); // Retry every 30 seconds
}

export async function processQueue() {
  if (queue.length === 0) return;
  
  console.log(`Processing ${queue.length} queued screenshots`);
  
  for (const item of [...queue]) {
    try {
      await uploadScreenshot(item.path, item.userId, item.taskId, item.timestamp);
      
      // Clean up file after successful upload
      fs.unlink(item.path, () => {});
      
      // Remove from queue
      const index = queue.indexOf(item);
      if (index !== -1) {
        queue.splice(index, 1);
        saveQueue(queue);
        console.log('Successfully processed queued screenshot');
      }
    } catch (err) {
      logError('processQueue', err);
      console.error('Failed to process queued screenshot, will retry later:', err);
    }
  }
  
  // Stop retry interval if queue is empty
  if (queue.length === 0 && retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
    console.log('Screenshot queue processing complete');
  }
}
