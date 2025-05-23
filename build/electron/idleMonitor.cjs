"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIdleMonitoring = startIdleMonitoring;
exports.stopIdleMonitoring = stopIdleMonitoring;
// @ts-ignore
// const robotjs_1 = __importDefault(require("robotjs")); // Temporarily disabled due to compatibility issues
const tracker_1 = require("./tracker.cjs");
const config_1 = require("./config.cjs");
let lastX = 0;
let lastY = 0;
let lastActivity = Date.now();
let currentIdleStatus = false;
let interval = null;
function pollMousePosition() {
    // Temporarily disabled mouse tracking due to robotjs compatibility issues
    // const { x, y } = robotjs_1.default.getMousePos();
    // Always update activity to prevent idle detection for now
    lastActivity = Date.now();
    const now = Date.now();
    const idle = false; // Never report as idle for now
    if (idle !== currentIdleStatus) {
        currentIdleStatus = idle;
        (0, tracker_1.updateTimeLogStatus)(idle).catch(err => console.error('Failed to update idle status:', err));
        console.log('Idle status changed:', idle);
    }
}
function startIdleMonitoring() {
    if (interval)
        return;
    lastActivity = Date.now();
    interval = setInterval(pollMousePosition, 5000);
}
function stopIdleMonitoring() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
    currentIdleStatus = false;
}
