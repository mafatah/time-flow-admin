"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueTimeLog = queueTimeLog;
exports.queueScreenshot = queueScreenshot;
exports.queueAppLog = queueAppLog;
exports.processQueue = processQueue;
exports.startSyncLoop = startSyncLoop;
exports.stopSyncLoop = stopSyncLoop;
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const supabase_1 = require("./supabase.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
const UNSYNCED_FILE_PATH = path.join(electron_1.app.getPath('userData'), 'unsynced.json');
const UNSYNCED_APP_LOG_PATH = path.join(electron_1.app.getPath('userData'), 'unsynced_app_logs.json');
function loadAppLogs() {
    try {
        if (fs.existsSync(UNSYNCED_APP_LOG_PATH)) {
            return JSON.parse(fs.readFileSync(UNSYNCED_APP_LOG_PATH, 'utf8'));
        }
    }
    catch (err) {
        (0, errorHandler_1.logError)('loadAppLogs', err);
    }
    return [];
}
function saveAppLogs(logs) {
    try {
        fs.writeFileSync(UNSYNCED_APP_LOG_PATH, JSON.stringify(logs));
    }
    catch (err) {
        (0, errorHandler_1.logError)('saveAppLogs', err);
    }
}
let syncInterval = null;
function loadData() {
    try {
        if (fs.existsSync(UNSYNCED_FILE_PATH)) {
            return JSON.parse(fs.readFileSync(UNSYNCED_FILE_PATH, 'utf8'));
        }
    }
    catch (err) {
        console.error('Failed to load unsynced data:', err);
    }
    return { time_logs: [], screenshots: [] };
}
function saveData(data) {
    try {
        fs.writeFileSync(UNSYNCED_FILE_PATH, JSON.stringify(data));
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
    if (!log.app_name)
        return;
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
                const { error } = await supabase_1.supabase
                    .from('time_logs')
                    .update({
                    end_time: log.end_time,
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
        if (!log.app_name)
            continue;
        try {
            const { error } = await supabase_1.supabase.from('app_logs').insert(log);
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
