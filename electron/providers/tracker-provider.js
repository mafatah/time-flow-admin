"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackerProvider = TrackerProvider;
exports.useTracker = useTracker;
const react_1 = __importStar(require("react"));
const auth_provider_1 = require("./auth-provider");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
const use_toast_1 = require("@/components/ui/use-toast");
// Check if running in Electron environment
const isElectron = () => {
    return window && window.electron !== undefined;
};
const TrackerContext = (0, react_1.createContext)(undefined);
function TrackerProvider({ children }) {
    const [isTracking, setIsTracking] = (0, react_1.useState)(false);
    const [currentTaskId, setCurrentTaskId] = (0, react_1.useState)(null);
    const [showSessionDialog, setShowSessionDialog] = (0, react_1.useState)(false);
    const [savedSession, setSavedSession] = (0, react_1.useState)(null);
    const { user } = (0, auth_provider_1.useAuth)();
    const { toast } = (0, use_toast_1.useToast)();
    const canTrack = isElectron();
    // Check for saved session when component mounts and we're in Electron
    (0, react_1.useEffect)(() => {
        if (user && canTrack) {
            // In Electron, check for saved sessions
            window.electron.loadSession()
                .then((session) => {
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
        if (savedSession) {
            setCurrentTaskId(savedSession.task_id);
            setIsTracking(true);
            setShowSessionDialog(false);
            if (user) {
                window.electron.setUserId(user.id);
                window.electron.setTaskId(savedSession.task_id);
                window.electron.startTracking();
            }
            toast({
                title: "Session resumed",
                description: "Your previous tracking session has been resumed."
            });
        }
    };
    const discardSession = () => {
        if (canTrack) {
            window.electron.clearSavedSession();
        }
        setShowSessionDialog(false);
        toast({
            title: "Session discarded",
            description: "Your previous tracking session has been discarded."
        });
    };
    const startTracking = async (taskId) => {
        if (!canTrack) {
            toast({
                title: "Desktop app required",
                description: "Time tracking is only available in the desktop application.",
                variant: "destructive"
            });
            return;
        }
        if (!user)
            return;
        try {
            // Set user and task IDs in Electron
            window.electron.setUserId(user.id);
            window.electron.setTaskId(taskId);
            window.electron.startTracking();
            setCurrentTaskId(taskId);
            setIsTracking(true);
            toast({
                title: "Tracking started",
                description: "Your time is now being tracked in the desktop app."
            });
        }
        catch (err) {
            console.error('Error starting tracking:', err);
            toast({
                title: "Error",
                description: "Failed to start tracking. Please try again.",
                variant: "destructive"
            });
        }
    };
    const stopTracking = async () => {
        if (!isTracking || !canTrack)
            return;
        try {
            // Stop tracking in Electron
            window.electron.stopTracking();
            // Update local state
            setIsTracking(false);
            setCurrentTaskId(null);
            toast({
                title: "Tracking stopped",
                description: "Your time tracking has been stopped."
            });
        }
        catch (err) {
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
        try {
            // Sync offline data in Electron
            window.electron.syncOfflineData();
            toast({
                title: "Sync initiated",
                description: "Syncing offline data to the server."
            });
        }
        catch (err) {
            console.error('Error syncing offline data:', err);
            toast({
                title: "Sync error",
                description: "Failed to synchronize data. Will retry later."
            });
        }
    };
    return (<TrackerContext.Provider value={{
            isTracking,
            currentTaskId,
            canTrack,
            startTracking,
            stopTracking,
            syncOfflineData
        }}>
      {children}
      
      {/* Session Resume/Discard Dialog */}
      <alert_dialog_1.AlertDialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle>Resume previous session?</alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription>
              A previous tracking session was interrupted. Would you like to resume it or discard it?
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel onClick={discardSession}>Discard</alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction onClick={resumeSession}>Resume</alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>
    </TrackerContext.Provider>);
}
function useTracker() {
    const context = (0, react_1.useContext)(TrackerContext);
    if (context === undefined) {
        throw new Error('useTracker must be used within a TrackerProvider');
    }
    return context;
}
