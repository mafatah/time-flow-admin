"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAppLog = captureAppLog;
const supabase_1 = require("../src/lib/supabase");
const active_win_1 = __importDefault(require("active-win"));
const unsyncedManager_1 = require("./unsyncedManager");
const errorHandler_1 = require("./errorHandler");
async function captureAppLog(userId, taskId) {
    try {
        const win = await (0, active_win_1.default)();
        if (!win)
            return;
        const log = {
            user_id: userId,
            message: `[${taskId}] ${win.owner.name}: ${win.title}`
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
