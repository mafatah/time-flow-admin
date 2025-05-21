
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-provider';

// Declare the window interface for Electron
declare global {
  interface Window {
    electron?: {
      setUserId: (id: string) => void;
      setTaskId: (id: string) => void;
      startTracking: () => void;
      stopTracking: () => void;
      syncOfflineData: () => void;
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

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Set user ID in electron tracker when user changes
  useEffect(() => {
    if (user && window.electron?.setUserId) {
      window.electron.setUserId(user.id);
    }
  }, [user]);
  
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
