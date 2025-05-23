"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = logError;
exports.showError = showError;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'error.log');
function logError(context, err) {
    const message = `[${new Date().toISOString()}] ${context}: ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
    try {
        fs_1.default.appendFileSync(LOG_PATH, message);
    }
    catch {
        // ignore logging errors
    }
}
function showError(title, message) {
    electron_1.dialog.showErrorBox(title, message);
}
