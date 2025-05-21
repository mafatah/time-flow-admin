
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

// Declare the window interface for Electron
declare global {
  interface Window {
    electron?: {
      setUserId: (id: string) => void;
      setTaskId: (id: string) => void;
      startTracking: () => void;
      stopTracking: () => void;
      syncOfflineData: () => void;
      loadSession: () => Promise<SessionData | null>;
      clearSavedSession: () => void;
    };
  }
}

interface TrackerContextType {
  isTracking: boolean;
  currentTaskId: string | null;
  startTracking: (taskId: string) => void;
  stopTracking: () => void;
  syncOfflineData: () => void;
}


interface SessionData {
  task_id: string;
  user_id: string;
  start_time: string;
  time_log_id: string;
  end_time?: string;
}

type SavedSession = SessionData | null;

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedSession>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check for saved session when user changes
  useEffect(() => {
    if (user && window.electron?.loadSession) {
      checkForSavedSession();
    }
  }, [user]);
  
  // Set user ID in electron tracker when user changes
  useEffect(() => {
    if (user && window.electron?.setUserId) {
      window.electron.setUserId(user.id);
    }
  }, [user]);

  const checkForSavedSession = async () => {
    if (window.electron?.loadSession) {
      try {
        const session = await window.electron.loadSession();
        if (session && session.task_id) {
          setSavedSession(session);
          setShowSessionDialog(true);
        }
      } catch (error) {
        console.error("Error checking for saved session:", error);
      }
    }
  };
  
  const resumeSession = () => {
    if (savedSession && window.electron?.setTaskId && window.electron?.startTracking) {
      window.electron.setTaskId(savedSession.task_id);
      window.electron.startTracking();
      setCurrentTaskId(savedSession.task_id);
      setIsTracking(true);
      setShowSessionDialog(false);

      toast({
        title: "Session resumed",
        description: "Your previous tracking session has been resumed."
      });
    }
  };
  
  const discardSession = () => {
    if (window.electron?.clearSavedSession) {
      window.electron.clearSavedSession();
      setShowSessionDialog(false);
      
      toast({
        title: "Session discarded",
        description: "Your previous tracking session has been discarded."
      });
    }
  };
  
  const startTracking = (taskId: string) => {
    if (!user) return;
    
    setCurrentTaskId(taskId);
    
    if (window.electron?.setTaskId) {
      window.electron.setTaskId(taskId);
    }
    
    if (window.electron?.startTracking) {
      window.electron.startTracking();
      setIsTracking(true);
    }
  };
  
  const stopTracking = () => {
    if (window.electron?.stopTracking) {
      window.electron.stopTracking();

      setIsTracking(false);
      setCurrentTaskId(null);
    }
  };
  
  const syncOfflineData = () => {
    if (window.electron?.syncOfflineData) {
      window.electron.syncOfflineData();
    }
  };
  
  return (
    <TrackerContext.Provider value={{
      isTracking,
      currentTaskId,
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
