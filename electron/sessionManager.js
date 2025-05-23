"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.loadSession = loadSession;
exports.clearSession = clearSession;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SESSION_FILE_PATH = path_1.default.join(electron_1.app.getPath('userData'), 'session.json');
function saveSession(data) {
    try {
        fs_1.default.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data));
    }
    catch (err) {
        console.error('Failed to save session:', err);
    }
}
function loadSession() {
    try {
        if (fs_1.default.existsSync(SESSION_FILE_PATH)) {
            const session = JSON.parse(fs_1.default.readFileSync(SESSION_FILE_PATH, 'utf8'));
            if (!session.end_time) {
                return session;
            }
        }
    }
    catch (err) {
        console.error('Failed to load session:', err);
    }
    return null;
}
function clearSession() {
    try {
        if (fs_1.default.existsSync(SESSION_FILE_PATH)) {
            fs_1.default.unlinkSync(SESSION_FILE_PATH);
        }
    }
    catch (err) {
        console.error('Failed to clear session:', err);
    }
}
