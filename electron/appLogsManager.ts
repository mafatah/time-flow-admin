const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { supabase } = require('./supabase');
const activeWin = require('active-win');
const { queueAppLog } = require('./unsyncedManager');
const { logError } = require('./errorHandler');

// Match the structure of the `app_logs` table from Supabase
type AppLog = any;

async function captureAppLog(userId: string, taskId: string) {
  try {
    const win = await activeWin();
    if (!win) return;
    const log: AppLog = {
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
  } catch (err) {
    logError('captureAppLog', err);
  }
}

module.exports = {
  captureAppLog
};
