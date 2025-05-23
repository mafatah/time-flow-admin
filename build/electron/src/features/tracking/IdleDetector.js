"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIdleDetector = setupIdleDetector;
function setupIdleDetector(callback, timeout = 300000) {
    let lastActivity = Date.now();
    function reset() {
        lastActivity = Date.now();
    }
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    setInterval(() => {
        if (Date.now() - lastActivity > timeout) {
            callback();
            lastActivity = Date.now();
        }
    }, 10000);
}
