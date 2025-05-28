"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIdleMonitoring = startIdleMonitoring;
exports.stopIdleMonitoring = stopIdleMonitoring;
const electron_1 = require("electron");
const tracker_1 = require("./tracker.cjs");
const config_1 = require("./config.cjs");
let currentIdleStatus = false;
let idleCheckInterval = null;
function checkIdleStatus() {
    const idleTime = electron_1.powerMonitor.getSystemIdleTime(); // seconds
    const isIdle = idleTime >= config_1.idleTimeoutMinutes * 60;
    if (isIdle !== currentIdleStatus) {
        currentIdleStatus = isIdle;
        (0, tracker_1.updateTimeLogStatus)(isIdle).catch(err => console.error('Failed to update idle status:', err));
        console.log('Idle status changed:', isIdle);
    }
}
function startIdleMonitoring() {
    if (idleCheckInterval)
        return;
    currentIdleStatus = false;
    idleCheckInterval = setInterval(checkIdleStatus, 5000);
}
function stopIdleMonitoring() {
    if (idleCheckInterval) {
        clearInterval(idleCheckInterval);
        idleCheckInterval = null;
    }
    currentIdleStatus = false;
}
