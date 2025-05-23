import { app, powerMonitor } from 'electron';
import { updateTimeLogStatus } from './tracker';
import { idleTimeoutMinutes } from './config';

let currentIdleStatus = false;
let idleCheckInterval: NodeJS.Timeout | null = null;

function checkIdleStatus() {
  const idleTime = powerMonitor.getSystemIdleTime(); // seconds
  const isIdle = idleTime >= idleTimeoutMinutes * 60;
  if (isIdle !== currentIdleStatus) {
    currentIdleStatus = isIdle;
    updateTimeLogStatus(isIdle).catch(err =>
      console.error('Failed to update idle status:', err)
    );
    console.log('Idle status changed:', isIdle);
  }
}

export function startIdleMonitoring() {
  if (idleCheckInterval) return;
  currentIdleStatus = false;
  idleCheckInterval = setInterval(checkIdleStatus, 5000);
}

export function stopIdleMonitoring() {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
  currentIdleStatus = false;
}
