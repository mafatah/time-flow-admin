import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { supabase } from '../src/lib/supabase';

interface TimeLog {
  id?: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time?: string;
  status: string;
  is_idle?: boolean;
}

interface ScreenshotMeta {
  user_id: string;
  task_id: string;
  image_url: string;
  captured_at: string;
}

interface UnsyncedData {
  time_logs: TimeLog[];
  screenshots: ScreenshotMeta[];
}

const UNSYNCED_FILE_PATH = path.join(app.getPath('userData'), 'unsynced.json');
let syncInterval: NodeJS.Timeout | null = null;

function loadData(): UnsyncedData {
  try {
    if (fs.existsSync(UNSYNCED_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(UNSYNCED_FILE_PATH, 'utf8')) as UnsyncedData;
    }
  } catch (err) {
    console.error('Failed to load unsynced data:', err);
  }
  return { time_logs: [], screenshots: [] };
}

function saveData(data: UnsyncedData) {
  try {
    fs.writeFileSync(UNSYNCED_FILE_PATH, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save unsynced data:', err);
  }
}

export function queueTimeLog(log: TimeLog) {
  const data = loadData();
  data.time_logs.push(log);
  saveData(data);
}

export function queueScreenshot(meta: ScreenshotMeta) {
  const data = loadData();
  data.screenshots.push(meta);
  saveData(data);
}

export async function processQueue() {
  const data = loadData();

  for (const log of [...data.time_logs]) {
    try {
      if (log.id) {
        const { error } = await supabase
          .from('time_logs')
          .update({
            end_time: log.end_time,
            status: log.status,
            is_idle: log.is_idle ?? false
          })
          .eq('id', log.id);
        if (!error) {
          data.time_logs = data.time_logs.filter(l => l !== log);
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('time_logs')
          .insert({
            user_id: log.user_id,
            task_id: log.task_id,
            start_time: log.start_time,
            status: log.status
          })
          .select('id')
          .single();
        if (!error && inserted) {
          data.time_logs = data.time_logs.filter(l => l !== log);
        }
      }
    } catch (err) {
      console.error('Failed to sync time log:', err);
    }
  }

  for (const shot of [...data.screenshots]) {
    try {
      const { error } = await supabase
        .from('screenshots')
        .insert(shot);
      if (!error) {
        data.screenshots = data.screenshots.filter(s => s !== shot);
      }
    } catch (err) {
      console.error('Failed to sync screenshot meta:', err);
    }
  }

  saveData(data);
}

export function startSyncLoop() {
  if (syncInterval) return;
  syncInterval = setInterval(processQueue, 30000);
}

export function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
