"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAppLog = captureAppLog;
const supabase_1 = require("./supabase.cjs");
const active_win_1 = __importDefault(require("active-win"));
const unsyncedManager_1 = require("./unsyncedManager.cjs");
const errorHandler_1 = require("./errorHandler.cjs");
async function captureAppLog(userId, taskId) {
    try {
        const win = await (0, active_win_1.default)();
        if (!win)
            return;
        const log = {
            user_id: userId,
            app_name: win.owner.name,
            window_title: win.title,
            started_at: new Date().toISOString(),
            category: 'core'
        };
        const { error } = await supabase_1.supabase.from('app_logs').insert(log);
        if (error) {
            (0, unsyncedManager_1.queueAppLog)(log);
            (0, errorHandler_1.logError)('insert app_log', error);
        }
    }
    catch (err) {
        (0, errorHandler_1.logError)('captureAppLog', err);
    }
}
