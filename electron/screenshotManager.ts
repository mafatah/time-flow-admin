import { desktopCapturer, screen, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { supabase } from './supabase';
import { queueScreenshot } from './unsyncedManager';
import { logError, showError } from './errorHandler';
import { validateAndGetUUID, generateDefaultProjectUUID } from './utils/uuid-validator';
import { getCurrentActivityMetrics } from './activityMonitor';

interface QueuedItem {
  path: string;
  userId: string;
  projectId: string;
  timestamp: number;
}

const UNSYNCED_LIST_PATH = path.join(app.getPath('userData'), 'unsynced_screenshots.json');

function loadQueue(): QueuedItem[] {
  try {
    if (fs.existsSync(UNSYNCED_LIST_PATH)) {
      return JSON.parse(fs.readFileSync(UNSYNCED_LIST_PATH, 'utf8'));
    }
  } catch (err) {
    logError('loadQueue', err);
  }
  return [];
}

function saveQueue(items: QueuedItem[]) {
  try {
    fs.writeFileSync(UNSYNCED_LIST_PATH, JSON.stringify(items));
  } catch (err) {
    logError('saveQueue', err);
  }
}

const queue = loadQueue();
let retryInterval: NodeJS.Timeout | null = null;

if (queue.length > 0) {
  startRetry();
}

export async function captureAndUpload(userId: string, projectId: string) {
  // Validate UUIDs before processing
  const validUserId = validateAndGetUUID(userId, randomUUID());
  const validProjectId = validateAndGetUUID(projectId, generateDefaultProjectUUID());
  
  if (validUserId !== userId) {
    console.warn(`Screenshot: Invalid user ID corrected: ${userId} -> ${validUserId}`);
  }
  
  if (validProjectId !== projectId) {
    console.warn(`Screenshot: Invalid project ID corrected: ${projectId} -> ${validProjectId}`);
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  const sources = await desktopCapturer.getSources({ 
    types: ['screen'], 
    thumbnailSize: { width, height } 
  });
  
  if (sources.length === 0) return;

  const buffer = sources[0].thumbnail.toPNG();
  const filename = `screenshot_${randomUUID()}.png`;
  const tempPath = path.join(app.getPath('temp'), filename);
  
  fs.writeFileSync(tempPath, buffer);
  
  try {
    await uploadScreenshot(tempPath, validUserId, validProjectId, Date.now());
    fs.unlink(tempPath, () => {});
  } catch (err) {
    logError('captureAndUpload', err);
    showError('Screenshot Error', 'Failed to upload screenshot. It will be retried.');
    
    const unsyncedDir = path.join(app.getPath('userData'), 'unsynced_screenshots');
    fs.mkdirSync(unsyncedDir, { recursive: true });
    
    const dest = path.join(unsyncedDir, filename);
    fs.copyFileSync(tempPath, dest);
    fs.unlink(tempPath, () => {});
    
    queue.push({ path: dest, userId: validUserId, projectId: validProjectId, timestamp: Date.now() });
    saveQueue(queue);
    startRetry();
  }
}

async function uploadScreenshot(filePath: string, userId: string, projectId: string, ts: number) {
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
  
  // Get current activity metrics for the screenshot
  const activityMetrics = getCurrentActivityMetrics();
  
  console.log('📊 Screenshot activity metrics:', {
    activity_score: activityMetrics.activity_score,
    mouse_clicks: activityMetrics.mouse_clicks,
    keystrokes: activityMetrics.keystrokes,
    mouse_movements: activityMetrics.mouse_movements
  });
  
  const { error: dbError } = await supabase
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
    queueScreenshot({
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
  if (retryInterval) return;
  retryInterval = setInterval(processQueue, 30000);
}

export async function processQueue() {
  for (const item of [...queue]) {
    try {
      await uploadScreenshot(item.path, item.userId, item.projectId, item.timestamp);
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
