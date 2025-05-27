interface ElectronAPI {
  setUserId: (id: string) => void;
  startTracking: () => void;
  stopTracking: () => void;
  syncOfflineData: () => void;
  loadSession: () => Promise<any>;
  clearSession: () => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

interface ScreenshotMeta {
  user_id: string;
  image_url: string;
  captured_at: string;
} 