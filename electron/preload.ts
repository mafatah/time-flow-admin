
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected Electron API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  setUserId: (id: string) => ipcRenderer.send('set-user-id', id),
  setTaskId: (id: string) => ipcRenderer.send('set-task-id', id),
  startTracking: () => ipcRenderer.send('start-tracking'),
  stopTracking: () => ipcRenderer.send('stop-tracking'),
  syncOfflineData: () => ipcRenderer.send('sync-offline-data'),
  loadSession: () => ipcRenderer.invoke('load-session'),
  clearSavedSession: () => ipcRenderer.send('clear-session')
});

// This allows the renderer process to detect if it's running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
