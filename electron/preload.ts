import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  setUserId: (id: string) => ipcRenderer.send('set-user-id', id),
  setTaskId: (id: string) => ipcRenderer.send('set-task-id', id),
  startTracking: () => ipcRenderer.send('start-tracking'),
  stopTracking: () => ipcRenderer.send('stop-tracking'),
  syncOfflineData: () => ipcRenderer.send('sync-offline-data'),
  loadSession: () => ipcRenderer.invoke('load-session'),
  clearSavedSession: () => ipcRenderer.send('clear-session')
});
