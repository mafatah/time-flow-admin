
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Activity,
  Mouse,
  Keyboard,
  Camera
} from 'lucide-react';

interface IdleStatusPanelProps {
  className?: string;
}

interface ActivityStats {
  mouseClicks: number;
  keystrokes: number;
  mouseMovements: number;
  idleSeconds: number;
  activeSeconds: number;
  suspiciousEvents: number;
  riskScore: number;
  screenshotsCaptured: number;
}

interface AntiCheatReport {
  isMonitoring: boolean;
  totalSuspiciousEvents: number;
  recentActivity: any[];
  currentRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface IdleStatus {
  isIdle: boolean;
  idleSince?: number;
  idleSeconds?: number;
  reason?: string;
  idleDuration?: number;
  resumed?: boolean;
}

export function IdleStatusPanel({ className }: IdleStatusPanelProps) {
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    mouseClicks: 0,
    keystrokes: 0,
    mouseMovements: 0,
    idleSeconds: 0,
    activeSeconds: 0,
    suspiciousEvents: 0,
    riskScore: 0,
    screenshotsCaptured: 0
  });
  
  const [antiCheatReport, setAntiCheatReport] = useState<AntiCheatReport>({
    isMonitoring: false,
    totalSuspiciousEvents: 0,
    recentActivity: [],
    currentRiskLevel: 'LOW'
  });
  
  const [idleStatus, setIdleStatus] = useState<IdleStatus>({
    isIdle: false
  });
  
  const [lastScreenshot, setLastScreenshot] = useState<any>(null);

  useEffect(() => {
    // Only try to access Electron API if it exists and has the required methods
    if (window.electron && typeof window.electron.getActivityStats === 'function') {
      const handleActivityStats = (stats: ActivityStats) => {
        setActivityStats(stats);
      };
      
      const handleIdleStatus = (status: IdleStatus) => {
        setIdleStatus(status);
      };
      
      const handleScreenshot = (screenshot: any) => {
        setLastScreenshot(screenshot);
      };

      // Set up listeners if they exist
      if (window.electron.onActivityStatsUpdate) {
        window.electron.onActivityStatsUpdate(handleActivityStats);
      }
      if (window.electron.onIdleStatusChange) {
        window.electron.onIdleStatusChange(handleIdleStatus);
      }
      if (window.electron.onScreenshotCaptured) {
        window.electron.onScreenshotCaptured(handleScreenshot);
      }
      
      // Fetch initial data
      window.electron.getActivityStats?.().then(setActivityStats).catch(() => {});
      window.electron.getAntiCheatReport?.().then(setAntiCheatReport).catch(() => {});
      
      // Periodic updates
      const interval = setInterval(() => {
        window.electron?.getActivityStats?.().then(setActivityStats).catch(() => {});
        window.electron?.getAntiCheatReport?.().then(setAntiCheatReport).catch(() => {});
      }, 5000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  const getActivityScore = () => {
    const total = activityStats.mouseClicks + activityStats.keystrokes + (activityStats.mouseMovements / 10);
    return Math.min(100, Math.round(total * 2));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Idle Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Idle Detection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={idleStatus.isIdle ? 'destructive' : 'default'}>
                {idleStatus.isIdle ? 'IDLE' : 'ACTIVE'}
              </Badge>
              {idleStatus.reason && (
                <span className="text-sm text-muted-foreground">
                  ({idleStatus.reason.replace('_', ' ')})
                </span>
              )}
            </div>
            {idleStatus.isIdle && idleStatus.idleSeconds && (
              <span className="text-sm font-mono">
                {formatTime(idleStatus.idleSeconds)}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active Time:</span>
              <div className="font-mono">{formatTime(activityStats.activeSeconds)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Idle Time:</span>
              <div className="font-mono">{formatTime(activityStats.idleSeconds)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Monitoring Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Mouse className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Mouse</div>
                <div className="font-mono text-sm">
                  {activityStats.mouseClicks} clicks, {activityStats.mouseMovements} moves
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Keyboard</div>
                <div className="font-mono text-sm">{activityStats.keystrokes} keys</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Screenshots:</span>
            <span className="font-mono text-sm">{activityStats.screenshotsCaptured}</span>
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Activity Score</span>
              <span className="font-mono">{getActivityScore()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${getActivityScore()}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Cheat Detection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Anti-Cheat Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={getRiskColor(antiCheatReport.currentRiskLevel)}>
                {antiCheatReport.currentRiskLevel} RISK
              </Badge>
              {antiCheatReport.isMonitoring && (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Monitoring
                </Badge>
              )}
            </div>
            <span className="text-sm font-mono">
              Score: {Math.round(activityStats.riskScore * 100)}%
            </span>
          </div>
          
          {activityStats.suspiciousEvents > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {activityStats.suspiciousEvents} suspicious event(s) detected. 
                Patterns include mouse jiggling, keyboard automation, or click bots.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="text-sm text-muted-foreground">
            <div>Monitoring for:</div>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Mouse jiggler detection</li>
              <li>Auto-clicker patterns</li>
              <li>Keyboard automation</li>
              <li>Screenshot evasion</li>
              <li>Repetitive behavior patterns</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Last Screenshot Info */}
      {lastScreenshot && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Last Screenshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Activity:</span>
                <div className="font-mono">{lastScreenshot.activityPercent}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Focus:</span>
                <div className="font-mono">{lastScreenshot.focusPercent}%</div>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>
                <div className="font-mono text-xs">
                  {new Date(lastScreenshot.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={lastScreenshot.suspicious ? 'destructive' : 'default'} className="text-xs">
                  {lastScreenshot.suspicious ? 'Suspicious' : 'Normal'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default IdleStatusPanel; 
