import iohook from 'iohook';
import { supabase } from '../src/lib/supabase';
import { idleTimeoutMinutes } from './config';

let idleTimer: NodeJS.Timeout | null = null;
const IDLE_THRESHOLD = idleTimeoutMinutes * 60 * 1000;
let currentTimeLogId: string | null = null;
let isIdle = false;

export function setCurrentTimeLog(id: string | null) {
  currentTimeLogId = id;
}

async function markIdle() {
  if (isIdle || !currentTimeLogId) return;
  isIdle = true;
  try {
    await supabase
      .from('time_logs')
      .update({ is_idle: true, status: 'idle' })
      .eq('id', currentTimeLogId);
  } catch (error) {
    console.error('Failed to mark idle:', error);
  }
}

async function markActive() {
  if (!isIdle || !currentTimeLogId) return;
  isIdle = false;
  try {
    await supabase
      .from('time_logs')
      .update({ is_idle: false, status: 'active' })
      .eq('id', currentTimeLogId);
  } catch (error) {
    console.error('Failed to mark active:', error);
  }
}

function resetTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(markIdle, IDLE_THRESHOLD);
  void markActive();
}

export function startIdleTracker() {
  resetTimer();
  iohook.on('mousemove', resetTimer);
  iohook.on('keydown', resetTimer);
  iohook.on('mousewheel', resetTimer);
  iohook.start();
}

export function stopIdleTracker() {
  if (idleTimer) clearTimeout(idleTimer);
  iohook.removeListener('mousemove', resetTimer);
  iohook.removeListener('keydown', resetTimer);
  iohook.removeListener('mousewheel', resetTimer);
  iohook.stop();
  isIdle = false;
}
