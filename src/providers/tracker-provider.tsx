
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

// Check if running in Electron environment
const isElectron = (): boolean =>
  typeof window !== "undefined" && (window as any).electron !== undefined;

interface TrackerContextType {
  isTracking: boolean;
  currentTaskId: string | null;
  canTrack: boolean;
  startTracking: (taskId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  syncOfflineData: () => Promise<void>;
}

interface SavedSessionType {
  task_id: string;
  time_log_id: string;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

// Type guard to check if electron is available
function electronAvailable(): boolean {
  return typeof window !== 'undefined' && window.isElectron === true && window.electron !== undefined;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSessionType | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const canTrack = isElectron();
  
  // Check for saved session when component mounts and we're in Electron
  useEffect(() => {
    if (user && canTrack && electronAvailable()) {
      // In Electron, check for saved sessions
      window.electron!.loadSession()
        .then((session: SavedSessionType | null) => {
          if (session && session.task_id) {
            setSavedSession(session);
            setShowSessionDialog(true);
          }
        })
        .catch(err => console.error('Failed to load session:', err));
    }
  }, [user, canTrack]);
  
  const resumeSession = async () => {
    if (!canTrack) {
      toast({
        title: "Desktop app required",
        description: "Time tracking is only available in the desktop application.",
        variant: "destructive"
      });
      return;
    }
    
    if (savedSession && electronAvailable()) {
      setCurrentTaskId(savedSession.task_id);
      setIsTracking(true);
      setShowSessionDialog(false);
      
      if (user) {
        window.electron!.setUserId(user.id);
        window.electron!.setTaskId(savedSession.task_id);
        window.electron!.startTracking();
      }

      toast({
        title: "Session resumed",
        description: "Your previous tracking session has been resumed."
      });
    }
  };
  
  const discardSession = () => {
    if (canTrack && electronAvailable()) {
      window.electron!.clearSavedSession();
    }
    setShowSessionDialog(false);
    
    toast({
      title: "Session discarded",
      description: "Your previous tracking session has been discarded."
    });
  };
  
  const startTracking = async (taskId: string) => {
    if (!canTrack) {
      toast({
        title: "Desktop app required",
        description: "Time tracking is only available in the desktop application.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user || !electronAvailable()) return;
    
    try {
      // Set user and task IDs in Electron
      window.electron!.setUserId(user.id);
      window.electron!.setTaskId(taskId);
      window.electron!.startTracking();
      
      setCurrentTaskId(taskId);
      setIsTracking(true);
      
      toast({
        title: "Tracking started",
        description: "Your time is now being tracked in the desktop app."
      });
    } catch (err) {
      console.error('Error starting tracking:', err);
      toast({
        title: "Error",
        description: "Failed to start tracking. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const stopTracking = async () => {
    if (!isTracking || !canTrack || !electronAvailable()) return;
    
    try {
      // Stop tracking in Electron
      window.electron!.stopTracking();
      
      // Update local state
      setIsTracking(false);
      setCurrentTaskId(null);
      
      toast({
        title: "Tracking stopped",
        description: "Your time tracking has been stopped."
      });
    } catch (err) {
      console.error('Error stopping tracking:', err);
      toast({
        title: "Error",
        description: "Failed to stop tracking. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const syncOfflineData = async () => {
    if (!canTrack) {
      toast({
        title: "Desktop app required",
        description: "Syncing offline data is only available in the desktop application.",
        variant: "destructive"
      });
      return;
    }
    
    if (!electronAvailable()) return;
    
    try {
      // Sync offline data in Electron
      window.electron!.syncOfflineData();
      
      toast({
        title: "Sync initiated",
        description: "Syncing offline data to the server."
      });
    } catch (err) {
      console.error('Error syncing offline data:', err);
      toast({
        title: "Sync error",
        description: "Failed to synchronize data. Will retry later."
      });
    }
  };
  
  return (
    <TrackerContext.Provider value={{
      isTracking,
      currentTaskId,
      canTrack,
      startTracking,
      stopTracking,
      syncOfflineData
    }}>
      {children}
      
      {/* Session Resume/Discard Dialog */}
      <AlertDialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume previous session?</AlertDialogTitle>
            <AlertDialogDescription>
              A previous tracking session was interrupted. Would you like to resume it or discard it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardSession}>Discard</AlertDialogCancel>
            <AlertDialogAction onClick={resumeSession}>Resume</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (context === undefined) {
    throw new Error('useTracker must be used within a TrackerProvider');
  }
  return context;
}
