import { supabase } from '../src/lib/supabase';
import activeWin from 'active-win';
import { queueAppLog } from './unsyncedManager';
import { logError } from './errorHandler';
import type { Database } from '../src/integrations/supabase/types';

// Match the structure of the `app_logs` table from Supabase
export type AppLog = Database['public']['Tables']['app_logs']['Insert'];

export async function captureAppLog(userId: string, taskId: string) {
  let log: AppLog | null = null;
  try {
    const win = await activeWin();
    if (!win) return;
    const message = `[${taskId}] ${win.owner.name}: ${win.title}`;
    log = {
      user_id: userId,
      message
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
