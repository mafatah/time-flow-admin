import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { supabase as supabaseClient } from './supabase';
import { logError } from './errorHandler';

interface TimeLog {
  id?: string;
  user_id: string;
  project_id: string;
  start_time?: string;
  end_time?: string;
  is_idle?: boolean;
}

interface ScreenshotMeta {
  user_id: string;
  project_id: string;
  image_url: string;
  captured_at: string;
}

interface UnsyncedData {
  time_logs: TimeLog[];
  screenshots: ScreenshotMeta[];
}

const UNSYNCED_FILE_PATH = path.join(app.getPath('userData'), 'unsynced.json');
const UNSYNCED_APP_LOG_PATH = path.join(app.getPath('userData'), 'unsynced_app_logs.json');

// Offline queue type for inserting into the `app_logs` table
type AppLog = any;

function loadAppLogs(): AppLog[] {
  try {
    if (fs.existsSync(UNSYNCED_APP_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(UNSYNCED_APP_LOG_PATH, 'utf8')) as AppLog[];
    }
  } catch (err) {
    logError('loadAppLogs', err);
  }
  return [];
}

function saveAppLogs(logs: AppLog[]) {
  try {
    fs.writeFileSync(UNSYNCED_APP_LOG_PATH, JSON.stringify(logs));
  } catch (err) {
    logError('saveAppLogs', err);
  }
}
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

function queueTimeLog(log: TimeLog) {
  const data = loadData();
  data.time_logs.push(log);
  saveData(data);
}

function queueScreenshot(meta: ScreenshotMeta) {
  const data = loadData();
  data.screenshots.push(meta);
  saveData(data);
}

function queueAppLog(log: AppLog) {
  if (!log.app_name) return;
  const logs = loadAppLogs();
  logs.push(log);
  saveAppLogs(logs);
}

async function processQueue() {
  const data = loadData();
  const appLogs = loadAppLogs();

  for (const log of [...data.time_logs]) {
    try {
      if (log.id) {
        const { error } = await supabaseClient
          .from('time_logs')
          .update({
            end_time: log.end_time,
            is_idle: log.is_idle ?? false
          })
          .eq('id', log.id);
        if (!error) {
          data.time_logs = data.time_logs.filter(l => l !== log);
        }
      } else {
        const { data: inserted, error } = await supabaseClient
          .from('time_logs')
          .insert({
            user_id: log.user_id,
            project_id: log.project_id,
            start_time: log.start_time,
            is_idle: log.is_idle ?? false
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
      const { error } = await supabaseClient
        .from('screenshots')
        .insert(shot);
      if (!error) {
        data.screenshots = data.screenshots.filter(s => s !== shot);
      }
    } catch (err) {
      console.error('Failed to sync screenshot meta:', err);
    }
  }

  for (const log of [...appLogs]) {
    if (!log.app_name) continue;
    try {
      const { error } = await supabaseClient.from('app_logs').insert(log);
      if (!error) {
        const idx = appLogs.indexOf(log);
        if (idx !== -1) appLogs.splice(idx, 1);
      }
    } catch (err) {
      logError('sync app log', err);
    }
  }

  saveData(data);
  saveAppLogs(appLogs);
}

function startSyncLoop() {
  if (syncInterval) return;
  syncInterval = setInterval(processQueue, 30000);
}

function stopSyncLoop() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export {
  queueTimeLog,
  queueScreenshot,
  queueAppLog,
  processQueue,
  startSyncLoop,
  stopSyncLoop
};
