
interface ElectronAPI {
  setUserId: (id: string) => void;
  startTracking: () => void;
  stopTracking: () => void;
  syncOfflineData: () => void;
  loadSession: () => Promise<any>;
  clearSession: () => void;
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // Activity monitoring methods
  getActivityStats?: () => Promise<{
    mouseClicks: number;
    keystrokes: number;
    mouseMovements: number;
    idleSeconds: number;
    activeSeconds: number;
    suspiciousEvents: number;
    riskScore: number;
    screenshotsCaptured: number;
  }>;
  
  getAntiCheatReport?: () => Promise<{
    isMonitoring: boolean;
    totalSuspiciousEvents: number;
    recentActivity: any[];
    currentRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  
  // Event listeners
  onActivityStatsUpdate?: (callback: (stats: any) => void) => void;
  onIdleStatusChange?: (callback: (status: any) => void) => void;
  onScreenshotCaptured?: (callback: (screenshot: any) => void) => void;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

interface ScreenshotMeta {
  user_id: string;
  image_url: string;
  captured_at: string;
} 
