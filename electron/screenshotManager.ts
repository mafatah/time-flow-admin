import { app, desktopCapturer, screen } from 'electron';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { supabase } from '../src/lib/supabase';

interface QueueItem {
  path: string;
  taskId: string;
  timestamp: number;
}

const queue: QueueItem[] = [];
let retryInterval: NodeJS.Timeout | null = null;

export async function captureAndUpload(userId: string, taskId: string) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });
  if (sources.length === 0) return;

  const buffer = sources[0].thumbnail.toPNG();
  const filename = `screenshot_${nanoid()}.png`;
  const tempPath = path.join(app.getPath('temp'), filename);
  fs.writeFileSync(tempPath, buffer);

  try {
    await uploadScreenshot(tempPath, userId, taskId, Date.now());
    fs.unlink(tempPath, () => {});
  } catch {
    queue.push({ path: tempPath, taskId, timestamp: Date.now() });
    startRetry(userId);
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

  if (dbError) throw dbError;
}

function startRetry(userId: string) {
  if (retryInterval) return;
  retryInterval = setInterval(() => processQueue(userId), 30000);
}

async function processQueue(userId: string) {
  for (const item of [...queue]) {
    try {
      await uploadScreenshot(item.path, userId, item.taskId, item.timestamp);
      fs.unlink(item.path, () => {});
      const index = queue.indexOf(item);
      if (index !== -1) queue.splice(index, 1);
    } catch {
      // keep in queue
    }
  }
  if (queue.length === 0 && retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
}
