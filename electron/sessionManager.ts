
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

export function saveSession(session: SessionData) {
  try {
    fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function loadSession(): SessionData | null {
  try {
    if (fs.existsSync(SESSION_FILE_PATH)) {
      const data = fs.readFileSync(SESSION_FILE_PATH, 'utf8');
      return JSON.parse(data) as SessionData;
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
