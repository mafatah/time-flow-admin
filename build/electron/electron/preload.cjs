"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected Electron API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    setUserId: (id) => electron_1.ipcRenderer.send('set-user-id', id),
    setTaskId: (id) => electron_1.ipcRenderer.send('set-task-id', id),
    startTracking: () => electron_1.ipcRenderer.send('start-tracking'),
    stopTracking: () => electron_1.ipcRenderer.send('stop-tracking'),
    syncOfflineData: () => electron_1.ipcRenderer.send('sync-offline-data'),
    loadSession: () => electron_1.ipcRenderer.invoke('load-session'),
    clearSavedSession: () => electron_1.ipcRenderer.send('clear-session')
});
// This allows the renderer process to detect if it's running in Electron
electron_1.contextBridge.exposeInMainWorld('isElectron', true);
