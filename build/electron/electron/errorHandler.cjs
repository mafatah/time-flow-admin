import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
const LOG_PATH = path.join(app.getPath('userData'), 'error.log');
export function logError(context, err) {
    const message = `[${new Date().toISOString()}] ${context}: ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
    try {
        fs.appendFileSync(LOG_PATH, message);
    }
    catch {
        // ignore logging errors
    }
}
export function showError(title, message) {
    dialog.showErrorBox(title, message);
}
