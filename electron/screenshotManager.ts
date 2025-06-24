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
  
  // PRODUCTION FIX: Enhanced screenshot capture
  const sources = await desktopCapturer.getSources({ 
    types: ['screen', 'window'], // Capture both screen and individual windows
    thumbnailSize: { width, height },
    fetchWindowIcons: false // Optimize performance
  });

  // If we have window sources, prefer the active window over screen
  let selectedSource = sources[0]; // Default to first source
  if (sources.length > 1) {
    // Try to find the active window that's not TimeFlow
    const activeWindow = sources.find(source => 
      source.name && 
      !source.name.includes('Ebdaa Work Time') &&
      !source.name.includes('TimeFlow') &&
      source.name !== 'Entire Screen'
    );
    
    if (activeWindow) {
      selectedSource = activeWindow;
      console.log('📸 Using active window:', activeWindow.name);
    } else {
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
    } else if (platform === 'darwin') {
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
    } else {
      console.log(`✅ Windows screenshot validation passed: ${buffer.length} bytes, not blank`);
    }
  }
  
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
