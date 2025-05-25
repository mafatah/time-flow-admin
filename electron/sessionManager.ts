import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface SessionData {
  project_id: string;
  user_id: string;
  start_time: string;
  time_log_id: string;
  end_time?: string;
}

const SESSION_FILE_PATH = path.join(app.getPath('userData'), 'session.json');

export function saveSession(data: SessionData) {
  try {
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function loadSession(): SessionData | null {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) {
      const session = JSON.parse(fs.readFileSync(SESSION_FILE_PATH, 'utf8')) as SessionData;
      if (!session.end_time) {
        return session;
      }
    }
  } catch (err) {
    console.error('Failed to load session:', err);
  }
  return null;
}

export function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) {
      fs.unlinkSync(SESSION_FILE_PATH);
    }
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}
