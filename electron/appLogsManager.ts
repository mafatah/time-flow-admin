import { supabase } from '../src/lib/supabase';
import activeWin from 'active-win';
import { queueAppLog } from './unsyncedManager';
import { logError } from './errorHandler';

export interface AppLog {
  user_id: string;
  task_id: string;
  app_name: string;
  window_title: string;
  timestamp: string;
}

export async function captureAppLog(userId: string, taskId: string) {
  let log: AppLog | null = null;
  try {
    const win = await activeWin();
    if (!win) return;
    log = {
      user_id: userId,
      task_id: taskId,
      app_name: win.owner.name,
      window_title: win.title,
      timestamp: new Date().toISOString()
    };
    const { error } = await supabase.from('app_logs').insert(log);
    if (error) {
      queueAppLog(log);
      logError('insert app_log', error);
    }
  } catch (err) {
    if (log) queueAppLog(log);
    logError('captureAppLog', err);
  }
}
