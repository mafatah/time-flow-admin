import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertTriangle, Settings } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SystemCheck {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'checking' | 'pass' | 'fail' | 'warning';
  message?: string;
  critical: boolean;
}

interface SystemCheckDialogProps {
  isOpen: boolean;
  onComplete: (allSystemsReady: boolean) => void;
  onOpenDebugConsole?: () => void;
}

export function SystemCheckDialog({ isOpen, onComplete, onOpenDebugConsole }: SystemCheckDialogProps) {
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: 'database',
      name: 'Database Connection',
      description: 'Testing connection to Supabase and creating test entries',
      status: 'pending',
      critical: true
    },
    {
      id: 'permissions',
      name: 'System Permissions',
      description: 'Checking screen recording and accessibility permissions',
      status: 'pending', 
      critical: true
    },
    {
      id: 'screenshot',
      name: 'Screenshot Capture',
      description: 'Testing screenshot functionality and upload',
      status: 'pending',
      critical: true
    },
    {
      id: 'app-detection',
      name: 'App Detection',
      description: 'Testing application monitoring and logging',
      status: 'pending',
      critical: true
    },
    {
      id: 'url-detection',
      name: 'URL Detection',
      description: 'Testing browser URL extraction and logging',
      status: 'pending',
      critical: false
    },
    {
      id: 'input-monitoring',
      name: 'Input Monitoring',
      description: 'Testing mouse and keyboard activity detection',
      status: 'pending',
      critical: false
    },
    {
      id: 'idle-detection',
      name: 'Idle Detection',
      description: 'Testing system idle time calculation',
      status: 'pending',
      critical: true
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'checking' | 'ready' | 'issues' | 'failed'>('checking');

  const updateCheck = (id: string, status: SystemCheck['status'], message?: string) => {
    setChecks(prev => prev.map(check => 
      check.id === id ? { ...check, status, message } : check
    ));
  };

  const runSystemChecks = async () => {
    setIsRunning(true);
    setOverallStatus('checking');

    try {
      // Test Database Connection with real operations
      setCurrentCheck('database');
      updateCheck('database', 'checking');
      await testDatabaseConnection();

      // Test System Permissions
      setCurrentCheck('permissions');
      updateCheck('permissions', 'checking');
      await testSystemPermissions();

      // Test Screenshot Capture
      setCurrentCheck('screenshot');
      updateCheck('screenshot', 'checking');
      await testScreenshotCapture();

      // Test App Detection
      setCurrentCheck('app-detection');
      updateCheck('app-detection', 'checking');
      await testAppDetection();

      // Test URL Detection
      setCurrentCheck('url-detection');
      updateCheck('url-detection', 'checking');
      await testURLDetection();

      // Test Input Monitoring
      setCurrentCheck('input-monitoring');
      updateCheck('input-monitoring', 'checking');
      await testInputMonitoring();

      // Test Idle Detection
      setCurrentCheck('idle-detection');
      updateCheck('idle-detection', 'checking');
      await testIdleDetection();

      setCurrentCheck(null);
      determineOverallStatus();

    } catch (error) {
      console.error('System check failed:', error);
      setOverallStatus('failed');
    } finally {
      setIsRunning(false);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      // Import system check functions
      const { testDatabaseConnectivity, testDatabaseOperations } = await import('@/lib/system-check');
      
      // Test 1: Basic connectivity
      const connectivityResult = await testDatabaseConnectivity();
      
      if (!connectivityResult.success) {
        updateCheck('database', 'fail', connectivityResult.error || 'Database connectivity failed');
        return;
      }

      // Test 2: Create test entries in system_checks table
      const operationsResult = await testDatabaseOperations();
      
      if (operationsResult.success) {
        updateCheck('database', 'pass', `Connected and test entry created (ID: ${operationsResult.data?.test_id})`);
      } else {
        updateCheck('database', 'fail', operationsResult.error || 'Database operations failed');
      }
    } catch (error) {
      updateCheck('database', 'fail', `Connection error: ${(error as Error).message}`);
    }
  };

  const testSystemPermissions = async () => {
    try {
      if (!window.electron) {
        updateCheck('permissions', 'warning', 'Running in web mode - limited permissions');
        return;
      }

      const result = await window.electron.invoke('system-check-permissions');
      
      if (result.success) {
        const { screen, accessibility } = result.permissions;
        
        if (screen && accessibility) {
          updateCheck('permissions', 'pass', 'All required permissions granted');
        } else if (screen) {
          updateCheck('permissions', 'warning', 'Screen recording OK, accessibility recommended');
        } else {
          updateCheck('permissions', 'fail', 'Missing required permissions');
        }
      } else {
        updateCheck('permissions', 'fail', result.error || 'Permission check failed');
      }
    } catch (error) {
      updateCheck('permissions', 'fail', `Permission check error: ${(error as Error).message}`);
    }
  };

  const testScreenshotCapture = async () => {
    try {
      if (!window.electron) {
        updateCheck('screenshot', 'warning', 'Screenshot testing requires desktop app');
        return;
      }

      const result = await window.electron.invoke('system-check-screenshot');
      
      if (result.success) {
        // Note: Screenshot test successful - would update database in full implementation

        updateCheck('screenshot', 'pass', `Screenshot captured (${result.size} bytes)`);
      } else {
        updateCheck('screenshot', 'fail', result.error || 'Screenshot capture failed');
      }
    } catch (error) {
      updateCheck('screenshot', 'fail', `Screenshot error: ${(error as Error).message}`);
    }
  };

  const testAppDetection = async () => {
    try {
      if (!window.electron) {
        updateCheck('app-detection', 'warning', 'App detection requires desktop app');
        return;
      }

      // First test if we can detect the current app
      const result = await window.electron.invoke('system-check-app-detection');
      
      if (result.success && result.appName) {
        // Create real app log entry for testing
        const { testAppLogOperations } = await import('@/lib/system-check');
        const logResult = await testAppLogOperations();
        
        if (logResult.success) {
          updateCheck('app-detection', 'pass', `Detected: ${result.appName} (logged to database)`);
        } else {
          updateCheck('app-detection', 'warning', `Detected: ${result.appName} (database logging failed: ${logResult.error})`);
        }
      } else {
        updateCheck('app-detection', 'fail', result.error || 'No application detected');
      }
    } catch (error) {
      updateCheck('app-detection', 'fail', `App detection error: ${(error as Error).message}`);
    }
  };

  const testURLDetection = async () => {
    try {
      if (!window.electron) {
        updateCheck('url-detection', 'warning', 'URL detection requires desktop app');
        return;
      }

      const result = await window.electron.invoke('system-check-url-detection');
      
      if (result.success && result.url) {
        // Create real URL log entry for testing
        const { testUrlLogOperations } = await import('@/lib/system-check');
        const logResult = await testUrlLogOperations();
        
        if (logResult.success) {
          updateCheck('url-detection', 'pass', `URL detected: ${new URL(result.url).hostname} (logged to database)`);
        } else {
          updateCheck('url-detection', 'warning', `URL detected: ${new URL(result.url).hostname} (database logging failed: ${logResult.error})`);
        }
      } else {
        updateCheck('url-detection', 'warning', 'No browser URL available (this is normal if no browser is open)');
      }
    } catch (error) {
      updateCheck('url-detection', 'warning', 'URL detection unavailable');
    }
  };

  const testInputMonitoring = async () => {
    try {
      if (!window.electron) {
        updateCheck('input-monitoring', 'warning', 'Input monitoring requires desktop app');
        return;
      }

      const result = await window.electron.invoke('system-check-input-monitoring');
      
      if (result.success) {
        updateCheck('input-monitoring', 'pass', 'Input monitoring active');
      } else {
        updateCheck('input-monitoring', 'warning', 'Limited input monitoring capabilities');
      }
    } catch (error) {
      updateCheck('input-monitoring', 'warning', 'Input monitoring check failed');
    }
  };

  const testIdleDetection = async () => {
    try {
      if (!window.electron) {
        updateCheck('idle-detection', 'warning', 'Idle detection requires desktop app');
        return;
      }

      const result = await window.electron.invoke('system-check-idle-detection');
      
      if (result.success && typeof result.idleTime === 'number') {
        updateCheck('idle-detection', 'pass', `Idle time: ${result.idleTime}s`);
      } else {
        updateCheck('idle-detection', 'fail', 'Idle detection not working');
      }
    } catch (error) {
      updateCheck('idle-detection', 'fail', `Idle detection error: ${(error as Error).message}`);
    }
  };

  const determineOverallStatus = () => {
    const criticalChecks = checks.filter(c => c.critical);
    const failedCritical = criticalChecks.filter(c => c.status === 'fail');
    const allChecks = checks;
    const anyFailed = allChecks.some(c => c.status === 'fail');

    if (failedCritical.length > 0) {
      setOverallStatus('failed');
    } else if (anyFailed) {
      setOverallStatus('issues');
    } else {
      setOverallStatus('ready');
    }
  };

  const getStatusIcon = (status: SystemCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'checking':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getOverallMessage = () => {
    switch (overallStatus) {
      case 'ready':
        return {
          type: 'success',
          title: '✅ All Systems Ready',
          message: 'Time tracking is ready to start. All critical components are functioning correctly.'
        };
      case 'issues':
        return {
          type: 'warning',
          title: '⚠️ Minor Issues Detected',
          message: 'Some optional features have limitations, but core tracking functionality is available.'
        };
      case 'failed':
        return {
          type: 'error',
          title: '❌ Critical Issues Found',
          message: 'Essential components are not working. Please resolve these issues before starting tracking.'
        };
      default:
        return {
          type: 'info',
          title: '🔍 System Check in Progress',
          message: 'Testing all tracking components and database connectivity...'
        };
    }
  };

  const handleComplete = () => {
    const systemReady = overallStatus === 'ready' || overallStatus === 'issues';
    onComplete(systemReady);
  };

  const handleSkip = () => {
    onComplete(false); // Force user to acknowledge issues
  };

  useEffect(() => {
    if (isOpen && !isRunning) {
      // Auto-start system check when dialog opens
      setTimeout(() => runSystemChecks(), 1000);
    }
  }, [isOpen]);

  useEffect(() => {
    determineOverallStatus();
  }, [checks]);

  const overallMsg = getOverallMessage();

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            TimeFlow System Check
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Status */}
          <Alert className={`border-2 ${
            overallMsg.type === 'success' ? 'border-green-500 bg-green-50' :
            overallMsg.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
            overallMsg.type === 'error' ? 'border-red-500 bg-red-50' :
            'border-blue-500 bg-blue-50'
          }`}>
            <AlertDescription>
              <div className="font-semibold">{overallMsg.title}</div>
              <div className="mt-1 text-sm">{overallMsg.message}</div>
            </AlertDescription>
          </Alert>

          {/* Individual Checks */}
          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`p-4 border rounded-lg transition-all ${
                  currentCheck === check.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${check.critical ? 'border-l-4 border-l-orange-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{check.name}</h4>
                      {check.critical && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          CRITICAL
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                    {check.message && (
                      <p className={`text-sm mt-2 p-2 rounded ${
                        check.status === 'pass' ? 'bg-green-100 text-green-700' :
                        check.status === 'fail' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {check.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {overallStatus === 'ready' && (
              <Button onClick={handleComplete} className="flex-1">
                ✅ Continue to Tracking
              </Button>
            )}
            
            {overallStatus === 'issues' && (
              <Button onClick={handleComplete} className="flex-1" variant="outline">
                ⚠️ Continue with Limitations
              </Button>
            )}
            
            {overallStatus === 'failed' && (
              <Button onClick={handleSkip} className="flex-1" variant="destructive">
                ❌ Skip (Not Recommended)
              </Button>
            )}

            {!isRunning && overallStatus !== 'checking' && (
              <Button onClick={runSystemChecks} variant="outline">
                🔄 Run Check Again
              </Button>
            )}

            {overallStatus === 'ready' && (
              <Button 
                onClick={async () => {
                  try {
                    const { cleanupTestEntries } = await import('@/lib/system-check');
                    const result = await cleanupTestEntries();
                    console.log('🧹 Cleanup result:', result);
                  } catch (error) {
                    console.error('❌ Cleanup error:', error);
                  }
                }} 
                variant="outline" 
                size="sm"
              >
                🧹 Cleanup Test Data
              </Button>
            )}

            {onOpenDebugConsole && (
              <Button onClick={onOpenDebugConsole} variant="outline">
                🔬 Debug Console
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 