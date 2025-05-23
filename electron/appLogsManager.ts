
import { supabase } from './supabase';
import activeWin from 'active-win';
import { queueAppLog } from './unsyncedManager';
import { logError } from './errorHandler';
import type { Database } from '../src/types/database';

// Match the structure of the `app_logs` table from Supabase
export type AppLog = Database['public']['Tables']['app_logs']['Insert'];

export async function captureAppLog(userId: string, taskId: string) {
  try {
    const win = await activeWin();
    if (!win) return;
    const log: AppLog = {
      user_id: userId,
      message: `[${taskId}] ${win.owner.name}: ${win.title}`
    };
    const { error } = await supabase.from('app_logs').insert(log);
    if (error) {
      queueAppLog(log);
      logError('insert app_log', error);
    }
  } catch (err) {
    logError('captureAppLog', err);
  }
}
