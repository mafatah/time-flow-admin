interface ElectronAPI {
  setUserId: (id: string) => void;
  setTaskId: (id: string) => void;
  startTracking: () => void;
  stopTracking: () => void;
  syncOfflineData: () => void;
  loadSession: () => Promise<any>;
  clearSession: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 