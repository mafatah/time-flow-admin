// Minimal type stubs for offline TypeScript compilation

declare module 'active-win';
declare module 'electron-auto-launch';
declare module 'electron' {
  export const app: any;
  export class BrowserWindow {
    constructor(opts?: any);
    loadFile(path: string): Promise<void>;
    static getAllWindows(): any[];
  }
  export const ipcMain: any;
  export const dialog: any;
  export const contextBridge: any;
  export const ipcRenderer: any;
  export const desktopCapturer: any;
  export const screen: any;
  export const powerMonitor: any;
}
declare module 'fs';
declare module 'path';
declare module 'child_process';
declare module 'util';
declare module 'robotjs';
declare module 'nanoid';
declare module 'dotenv';
declare module '@/integrations/supabase/client';

declare var process: any;
declare var console: any;
declare var __dirname: string;
interface NodeRequire {
  (module: string): any;
}
declare function setInterval(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;
declare function clearInterval(id: any): void;

declare namespace NodeJS {
  interface Timeout {}
}
