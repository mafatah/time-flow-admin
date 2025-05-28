import { supabase } from './supabase';
import activeWin from 'active-win';
import { queueAppLog } from './unsyncedManager';
import { logError } from './errorHandler';
export async function captureAppLog(userId, taskId) {
    try {
        const win = await activeWin();
        if (!win)
            return;
        const log = {
            user_id: userId,
            app_name: win.owner.name,
            window_title: win.title,
            started_at: new Date().toISOString(),
            category: 'core'
        };
        const { error } = await supabase.from('app_logs').insert(log);
        if (error) {
            queueAppLog(log);
            logError('insert app_log', error);
        }
    }
    catch (err) {
        logError('captureAppLog', err);
    }
}
