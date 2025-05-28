declare module 'robotjs';

export {}; // This makes the file a module

declare global {
  interface Window {
    electron?: {
      // Existing methods
      setProjectId: (projectId: string) => void;
      setUserId: (userId: string) => void;
      startTracking: () => Promise<void>;
      stopTracking: () => Promise<void>;
      pauseTracking: () => Promise<void>;
      resumeTracking: () => Promise<void>;
      
      // Enhanced idle detection and anti-cheat methods
      getActivityStats: () => Promise<{
        mouseClicks: number;
        keystrokes: number;
        mouseMovements: number;
        idleSeconds: number;
        activeSeconds: number;
        suspiciousEvents: number;
        riskScore: number;
        screenshotsCaptured: number;
      }>;
      
      getAntiCheatReport: () => Promise<{
        isMonitoring: boolean;
        totalSuspiciousEvents: number;
        recentActivity: any[];
        currentRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      }>;
      
      // Event listeners
      onActivityStatsUpdate: (callback: (stats: any) => void) => void;
      onIdleStatusChange: (callback: (status: any) => void) => void;
      onScreenshotCaptured: (callback: (screenshot: any) => void) => void;
      
      // Additional methods
      confirmResumeAfterIdle: (confirmed: boolean) => Promise<{ success: boolean; message: string }>;
      confirmResumeAfterSleep: (confirmed: boolean) => Promise<{ success: boolean; message: string }>;
      getAppSettings: () => Promise<any>;
      updateAppSettings: (settings: any) => Promise<{ success: boolean; message: string }>;
      getQueueStatus: () => Promise<{
        screenshots: number;
        appLogs: number;
        urlLogs: number;
        idleLogs: number;
        timeLogs: number;
        fraudAlerts: number;
      }>;
      forceScreenshot: () => Promise<{ success: boolean; message: string }>;
      reportSuspiciousActivity: (activityData: any) => Promise<{ success: boolean; message: string }>;
      getFraudAlerts: () => Promise<any[]>;
    };
  }
}
