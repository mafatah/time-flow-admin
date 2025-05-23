"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startIdleMonitoring = startIdleMonitoring;
exports.stopIdleMonitoring = stopIdleMonitoring;
// @ts-ignore
const robotjs_1 = __importDefault(require("robotjs"));
const tracker_1 = require("./tracker");
const config_1 = require("./config");
let lastX = 0;
let lastY = 0;
let lastActivity = Date.now();
let currentIdleStatus = false;
let interval = null;
function pollMousePosition() {
    const { x, y } = robotjs_1.default.getMousePos();
    if (x !== lastX || y !== lastY) {
        lastActivity = Date.now();
        lastX = x;
        lastY = y;
    }
    const now = Date.now();
    const idle = now - lastActivity > config_1.idleTimeoutMinutes * 60 * 1000;
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
