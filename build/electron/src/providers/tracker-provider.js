"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackerProvider = TrackerProvider;
exports.useTracker = useTracker;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const auth_provider_1 = require("./auth-provider");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
const use_toast_1 = require("@/components/ui/use-toast");
// Check if running in Electron environment
const isElectron = () => typeof window !== "undefined" && window.electron !== undefined;
const TrackerContext = (0, react_1.createContext)(undefined);
// Type guard to check if electron is available
function electronAvailable() {
    return typeof window !== 'undefined' && window.isElectron === true && window.electron !== undefined;
}
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
        if (user && canTrack && electronAvailable()) {
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
        if (savedSession && electronAvailable()) {
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
        if (canTrack && electronAvailable()) {
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
        if (!user || !electronAvailable())
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
        if (!isTracking || !canTrack || !electronAvailable())
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
        if (!electronAvailable())
            return;
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
    return ((0, jsx_runtime_1.jsxs)(TrackerContext.Provider, { value: {
            isTracking,
            currentTaskId,
            canTrack,
            startTracking,
            stopTracking,
            syncOfflineData
        }, children: [children, (0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialog, { open: showSessionDialog, onOpenChange: setShowSessionDialog, children: (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogContent, { children: [(0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogHeader, { children: [(0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogTitle, { children: "Resume previous session?" }), (0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogDescription, { children: "A previous tracking session was interrupted. Would you like to resume it or discard it?" })] }), (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogFooter, { children: [(0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogCancel, { onClick: discardSession, children: "Discard" }), (0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogAction, { onClick: resumeSession, children: "Resume" })] })] }) })] }));
}
function useTracker() {
    const context = (0, react_1.useContext)(TrackerContext);
    if (context === undefined) {
        throw new Error('useTracker must be used within a TrackerProvider');
    }
    return context;
}
