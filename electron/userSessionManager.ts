import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface UserSession {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_metadata: any;
  remember_me: boolean;
}

const USER_SESSION_PATH = path.join(app.getPath('userData'), 'user-session.json');

export function saveUserSession(session: UserSession): void {
  try {
    // Only save if user chose to be remembered
    if (session.remember_me) {
      fs.writeFileSync(USER_SESSION_PATH, JSON.stringify(session, null, 2));
      console.log('✅ User session saved to:', USER_SESSION_PATH);
    } else {
      // Clear any existing session if remember_me is false
      clearUserSession();
    }
  } catch (error) {
    console.error('❌ Failed to save user session:', error);
  }
}

export function loadUserSession(): UserSession | null {
  try {
    if (fs.existsSync(USER_SESSION_PATH)) {
      const data = fs.readFileSync(USER_SESSION_PATH, 'utf8');
      const session = JSON.parse(data) as UserSession;
      
      // Check if session is expired
      if (session.expires_at && Date.now() > session.expires_at) {
        console.log('⚠️ Saved user session has expired, clearing...');
        clearUserSession();
        return null;
      }
      
      console.log('✅ User session loaded for:', session.email);
      return session;
    }
  } catch (error) {
    console.error('❌ Failed to load user session:', error);
    clearUserSession(); // Clear corrupted session
  }
  return null;
}

export function clearUserSession(): void {
  try {
    if (fs.existsSync(USER_SESSION_PATH)) {
      fs.unlinkSync(USER_SESSION_PATH);
      console.log('✅ User session cleared');
    }
  } catch (error) {
    console.error('❌ Failed to clear user session:', error);
  }
}

export function isSessionValid(session: UserSession | null): boolean {
  if (!session) return false;
  
  // Check if session is expired
  if (session.expires_at && Date.now() > session.expires_at) {
    return false;
  }
  
  // Check if required fields are present
  return !!(session.id && session.email && session.access_token);
} 