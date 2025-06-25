import { PageHeader } from "@/components/layout/page-header";
import TimeTracker from "./time-tracker";
import { SystemCheckDialog } from "@/components/system-check-dialog";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, CheckCircle } from "lucide-react";

export default function TimeTrackingPage() {
  const [showSystemCheck, setShowSystemCheck] = useState(false);
  const [systemCheckComplete, setSystemCheckComplete] = useState(false);
  const [systemReady, setSystemReady] = useState(false);

  // Check if user has done system check recently (localStorage)
  useEffect(() => {
    const lastCheck = localStorage.getItem('timeflow_system_check');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours

    if (lastCheck && (now - parseInt(lastCheck)) < oneDay) {
      setSystemCheckComplete(true);
      setSystemReady(true);
    }
  }, []);

  const handleSystemCheckComplete = (allSystemsReady: boolean) => {
    setSystemCheckComplete(true);
    setSystemReady(allSystemsReady);
    setShowSystemCheck(false);
    
    // Store completion timestamp
    localStorage.setItem('timeflow_system_check', Date.now().toString());
  };

  const openDebugConsole = () => {
    if (window.electron) {
      console.log('🔬 Opening debug console...');
      // Could add IPC call to open debug console if implemented
    } else {
      console.log('🔬 Debug console only available in desktop app');
    }
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Time Tracking"
        subtitle="Track time spent on tasks and projects"
      />

      {/* System Check Banner */}
      {!systemCheckComplete && (
        <Alert className="mt-6 border-blue-500 bg-blue-50">
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>System Check Recommended</strong>
                <p className="text-sm mt-1">
                  Verify that all tracking components are working properly before starting your session.
                </p>
              </div>
              <Button onClick={() => setShowSystemCheck(true)} size="sm">
                Run System Check
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Ready Status */}
      {systemCheckComplete && systemReady && (
        <Alert className="mt-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>✅ All Systems Ready</strong>
                <p className="text-sm mt-1">
                  System check completed successfully. Tracking components verified.
                </p>
              </div>
              <Button 
                onClick={() => setShowSystemCheck(true)} 
                variant="outline" 
                size="sm"
              >
                Re-check System
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* System Issues Status */}
      {systemCheckComplete && !systemReady && (
        <Alert className="mt-6 border-yellow-500 bg-yellow-50">
          <Settings className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>⚠️ System Issues Detected</strong>
                <p className="text-sm mt-1">
                  Some tracking components have limitations. Tracking may work with reduced functionality.
                </p>
              </div>
              <Button 
                onClick={() => setShowSystemCheck(true)} 
                variant="outline" 
                size="sm"
              >
                Check Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6">
        <TimeTracker />
      </div>

      {/* System Check Dialog */}
      <SystemCheckDialog 
        isOpen={showSystemCheck}
        onComplete={handleSystemCheckComplete}
        onOpenDebugConsole={openDebugConsole}
      />
    </div>
  );
}
