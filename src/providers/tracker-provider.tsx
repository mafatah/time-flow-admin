
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { supabase } from '@/lib/supabase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { startIdleMonitoring, stopIdleMonitoring } from '@/lib/idleDetection';
import { nanoid } from 'nanoid';

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

// Store the current session in localStorage
const saveSession = (session: SessionData | null): void => {
  if (session) {
    localStorage.setItem('trackhub_session', JSON.stringify(session));
  } else {
    localStorage.removeItem('trackhub_session');
  }
};

// Load session from localStorage
const loadSession = (): SessionData | null => {
  const sessionData = localStorage.getItem('trackhub_session');
  if (sessionData) {
    try {
      return JSON.parse(sessionData) as SessionData;
    } catch (e) {
      console.error('Failed to parse saved session:', e);
    }
  }
  return null;
};

// Clear saved session
const clearSavedSession = (): void => {
  localStorage.removeItem('trackhub_session');
};

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTimeLogId, setCurrentTimeLogId] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<SavedSession>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Check for saved session when user changes
  useEffect(() => {
    if (user) {
      const session = loadSession();
      if (session && session.task_id && session.user_id === user.id) {
        setSavedSession(session);
        setShowSessionDialog(true);
      }
    }
  }, [user]);

  // Handle idle status change
  const handleIdleStatusChange = async (idle: boolean) => {
    if (!currentTimeLogId || !user) return;
    
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ is_idle: idle, status: idle ? 'idle' : 'active' })
        .eq('id', currentTimeLogId);
        
      if (error) {
        console.error('Failed to update idle status:', error);
        // Store update for later sync
        const queuedUpdate = {
          id: currentTimeLogId,
          is_idle: idle,
          status: idle ? 'idle' : 'active'
        };
        
        const queuedUpdates = JSON.parse(localStorage.getItem('trackhub_queued_updates') || '[]');
        queuedUpdates.push(queuedUpdate);
        localStorage.setItem('trackhub_queued_updates', JSON.stringify(queuedUpdates));
      }
    } catch (err) {
      console.error('Error updating idle status:', err);
    }
  };
  
  const resumeSession = () => {
    if (savedSession && user) {
      setCurrentTaskId(savedSession.task_id);
      setCurrentTimeLogId(savedSession.time_log_id);
      setIsTracking(true);
      setShowSessionDialog(false);
      startIdleMonitoring(handleIdleStatusChange);

      toast({
        title: "Session resumed",
        description: "Your previous tracking session has been resumed."
      });
    }
  };
  
  const discardSession = () => {
    clearSavedSession();
    setShowSessionDialog(false);
    
    toast({
      title: "Session discarded",
      description: "Your previous tracking session has been discarded."
    });
  };
  
  const startTracking = async (taskId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: user.id,
          task_id: taskId,
          start_time: new Date().toISOString(),
          status: 'active'
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Failed to create time log:', error);
        const newId = nanoid();
        setCurrentTimeLogId(newId);
        
        // Store for offline sync
        const queuedItem = {
          id: newId,
          user_id: user.id,
          task_id: taskId,
          start_time: new Date().toISOString(),
          status: 'active'
        };
        
        const queuedItems = JSON.parse(localStorage.getItem('trackhub_queued_inserts') || '[]');
        queuedItems.push(queuedItem);
        localStorage.setItem('trackhub_queued_inserts', JSON.stringify(queuedItems));
      } else {
        setCurrentTimeLogId(data.id);
      }

      const session: SessionData = {
        task_id: taskId,
        user_id: user.id,
        start_time: new Date().toISOString(),
        time_log_id: data?.id || nanoid()
      };
      
      saveSession(session);
      setCurrentTaskId(taskId);
      setIsTracking(true);
      
      // Start idle monitoring
      startIdleMonitoring(handleIdleStatusChange);
      
      toast({
        title: "Tracking started",
        description: "Your time is now being tracked."
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
    if (!isTracking || !currentTimeLogId || !user) return;
    
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ 
          end_time: new Date().toISOString(), 
          status: 'completed' 
        })
        .eq('id', currentTimeLogId);

      if (error) {
        console.error('Failed to update time log:', error);
        // Store update for later sync
        const queuedUpdate = {
          id: currentTimeLogId,
          end_time: new Date().toISOString(),
          status: 'completed'
        };
        
        const queuedUpdates = JSON.parse(localStorage.getItem('trackhub_queued_updates') || '[]');
        queuedUpdates.push(queuedUpdate);
        localStorage.setItem('trackhub_queued_updates', JSON.stringify(queuedUpdates));
      }
      
      // Stop idle monitoring
      stopIdleMonitoring(handleIdleStatusChange);
      
      // Clear session
      clearSavedSession();
      setIsTracking(false);
      setCurrentTaskId(null);
      setCurrentTimeLogId(null);
      
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
    if (!user) return;
    
    try {
      // Sync queued inserts
      const queuedInserts = JSON.parse(localStorage.getItem('trackhub_queued_inserts') || '[]');
      for (const item of queuedInserts) {
        const { error } = await supabase.from('time_logs').insert(item);
        if (!error) {
          queuedInserts.splice(queuedInserts.indexOf(item), 1);
          localStorage.setItem('trackhub_queued_inserts', JSON.stringify(queuedInserts));
        }
      }
      
      // Sync queued updates
      const queuedUpdates = JSON.parse(localStorage.getItem('trackhub_queued_updates') || '[]');
      for (const item of queuedUpdates) {
        const { id, ...updateData } = item;
        const { error } = await supabase.from('time_logs').update(updateData).eq('id', id);
        if (!error) {
          queuedUpdates.splice(queuedUpdates.indexOf(item), 1);
          localStorage.setItem('trackhub_queued_updates', JSON.stringify(queuedUpdates));
        }
      }
      
      const pendingCount = queuedInserts.length + queuedUpdates.length;
      if (pendingCount === 0) {
        toast({
          title: "Sync complete",
          description: "All data has been synchronized."
        });
      } else {
        toast({
          title: "Partial sync",
          description: `${pendingCount} items still pending synchronization.`
        });
      }
    } catch (err) {
      console.error('Error syncing offline data:', err);
      toast({
        title: "Sync error",
        description: "Failed to synchronize some data. Will retry later."
      });
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isTracking) {
        stopIdleMonitoring(handleIdleStatusChange);
      }
    };
  }, [isTracking]);
  
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
