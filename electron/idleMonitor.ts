import robot from 'robotjs';
import { updateTimeLogStatus } from './tracker';
import { idleTimeoutMinutes } from './config';

let lastX = 0;
let lastY = 0;
let lastActivity = Date.now();
let currentIdleStatus = false;
let interval: NodeJS.Timeout | null = null;

function pollMousePosition() {
  const { x, y } = robot.getMousePos();

  if (x !== lastX || y !== lastY) {
    lastActivity = Date.now();
    lastX = x;
    lastY = y;
  }

  const now = Date.now();
  const idle = now - lastActivity > idleTimeoutMinutes * 60 * 1000;

  if (idle !== currentIdleStatus) {
    currentIdleStatus = idle;
    updateTimeLogStatus(idle).catch(err =>
      console.error('Failed to update idle status:', err)
    );
    console.log('Idle status changed:', idle);
  }
}

export function startIdleMonitoring() {
  if (interval) return;
  lastActivity = Date.now();
  interval = setInterval(pollMousePosition, 5000);
}

export function stopIdleMonitoring() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  currentIdleStatus = false;
}
