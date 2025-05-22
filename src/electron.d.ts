
interface ElectronAPI {
  setUserId: (id: string) => void;
  setTaskId: (id: string) => void;
  startTracking: () => void;
  stopTracking: () => void;
  syncOfflineData: () => void;
  loadSession: () => Promise<{
    task_id: string;
    user_id: string;
    start_time: string;
    time_log_id: string;
    end_time?: string;
  } | null>;
  clearSavedSession: () => void;
}

interface Window {
  electron?: ElectronAPI;
  isElectron?: boolean;
}
