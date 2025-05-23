"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueTimeLog = queueTimeLog;
exports.queueScreenshot = queueScreenshot;
exports.queueAppLog = queueAppLog;
exports.processQueue = processQueue;
exports.startSyncLoop = startSyncLoop;
exports.stopSyncLoop = stopSyncLoop;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_1 = require("./supabase.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
const UNSYNCED_FILE_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced.json');
const UNSYNCED_APP_LOG_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'unsynced_app_logs.json');
function loadAppLogs() {
    try {
        if (fs_1.default.existsSync(UNSYNCED_APP_LOG_PATH)) {
            return JSON.parse(fs_1.default.readFileSync(UNSYNCED_APP_LOG_PATH, 'utf8'));
        }
    }
    catch (err) {
        (0, errorHandler_1.logError)('loadAppLogs', err);
    }
    return [];
}
function saveAppLogs(logs) {
    try {
        fs_1.default.writeFileSync(UNSYNCED_APP_LOG_PATH, JSON.stringify(logs));
    }
    catch (err) {
        (0, errorHandler_1.logError)('saveAppLogs', err);
    }
}
let syncInterval = null;
function loadData() {
    try {
        if (fs_1.default.existsSync(UNSYNCED_FILE_PATH)) {
            return JSON.parse(fs_1.default.readFileSync(UNSYNCED_FILE_PATH, 'utf8'));
        }
    }
    catch (err) {
        console.error('Failed to load unsynced data:', err);
    }
    return { time_logs: [], screenshots: [] };
}
function saveData(data) {
    try {
        fs_1.default.writeFileSync(UNSYNCED_FILE_PATH, JSON.stringify(data));
    }
    catch (err) {
        console.error('Failed to save unsynced data:', err);
    }
}
function queueTimeLog(log) {
    const data = loadData();
    data.time_logs.push(log);
    saveData(data);
}
function queueScreenshot(meta) {
    const data = loadData();
    data.screenshots.push(meta);
    saveData(data);
}
function queueAppLog(log) {
    if (!log.message)
        return;
    const logs = loadAppLogs();
    logs.push({ user_id: log.user_id, message: log.message });
    saveAppLogs(logs);
}
async function processQueue() {
    const data = loadData();
    const appLogs = loadAppLogs();
    for (const log of [...data.time_logs]) {
        try {
            if (log.id) {
                const { error } = await supabase_1.supabase
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
            }
            else {
                const { data: inserted, error } = await supabase_1.supabase
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
        }
        catch (err) {
            console.error('Failed to sync time log:', err);
        }
    }
    for (const shot of [...data.screenshots]) {
        try {
            const { error } = await supabase_1.supabase
                .from('screenshots')
                .insert(shot);
            if (!error) {
                data.screenshots = data.screenshots.filter(s => s !== shot);
            }
        }
        catch (err) {
            console.error('Failed to sync screenshot meta:', err);
        }
    }
    for (const log of [...appLogs]) {
        if (!log.message)
            continue;
        try {
            const { error } = await supabase_1.supabase.from('app_logs').insert({
                user_id: log.user_id,
                message: log.message
            });
            if (!error) {
                const idx = appLogs.indexOf(log);
                if (idx !== -1)
                    appLogs.splice(idx, 1);
            }
        }
        catch (err) {
            (0, errorHandler_1.logError)('sync app log', err);
        }
    }
    saveData(data);
    saveAppLogs(appLogs);
}
function startSyncLoop() {
    if (syncInterval)
        return;
    syncInterval = setInterval(processQueue, 30000);
}
function stopSyncLoop() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}
