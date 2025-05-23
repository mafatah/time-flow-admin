"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSystemMonitor = initSystemMonitor;
const electron_1 = require("electron");
const tracker_1 = require("./tracker.cjs");
function initSystemMonitor() {
    electron_1.powerMonitor.on('suspend', () => {
        if ((0, tracker_1.loadSession)()) {
            (0, tracker_1.stopTracking)();
        }
    });
    electron_1.powerMonitor.on('resume', () => {
        const session = (0, tracker_1.loadSession)();
        if (session) {
            const result = electron_1.dialog.showMessageBoxSync({
                type: 'question',
                message: 'Do you want to resume tracking?',
                buttons: ['Resume', 'Stop']
            });
            if (result === 0) {
                (0, tracker_1.startTracking)();
            }
            else {
                (0, tracker_1.stopTracking)();
            }
        }
    });
}
