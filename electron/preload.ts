import { contextBridge, ipcRenderer } from 'electron';

// Expose protected Electron API to the renderer process
contextBridge.exposeInMainWorld('electron', {
  setUserId: (id: string) => ipcRenderer.send('set-user-id', id),
  startTracking: () => ipcRenderer.send('start-tracking'),
  stopTracking: () => ipcRenderer.send('stop-tracking'),
  syncOfflineData: () => ipcRenderer.send('sync-offline-data'),
  loadSession: () => ipcRenderer.invoke('load-session'),
  clearSavedSession: () => ipcRenderer.send('clear-session'),
  logout: () => ipcRenderer.send('logout'),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
});

// This allows the renderer process to detect if it's running in Electron
contextBridge.exposeInMainWorld('isElectron', true);
