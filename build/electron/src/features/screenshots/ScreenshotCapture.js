"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleScreenshots = scheduleScreenshots;
function scheduleScreenshots(intervalMs = 300000) {
    // This would use Electron's desktopCapturer in a real implementation
    setInterval(() => {
        console.log('Capturing screenshot...');
    }, intervalMs);
}
