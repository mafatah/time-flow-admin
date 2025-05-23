"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSelector = TaskSelector;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tracker_provider_1 = require("@/providers/tracker-provider");
const supabase_1 = require("@/lib/supabase");
const auth_provider_1 = require("@/providers/auth-provider");
const button_1 = require("@/components/ui/button");
const select_1 = require("@/components/ui/select");
const use_toast_1 = require("@/components/ui/use-toast");
const lucide_react_1 = require("lucide-react");
const react_query_1 = require("@tanstack/react-query");
function TaskSelector() {
    const { isTracking, currentTaskId, startTracking, stopTracking, canTrack } = (0, tracker_provider_1.useTracker)();
    const { user } = (0, auth_provider_1.useAuth)();
    const { toast } = (0, use_toast_1.useToast)();
    const [selectedTaskId, setSelectedTaskId] = (0, react_1.useState)(currentTaskId);
    // Fetch user's tasks
    const { data: tasks, isLoading: tasksLoading } = (0, react_query_1.useQuery)({
        queryKey: ['userTasks', user?.id],
        queryFn: async () => {
            if (!user)
                return [];
            const { data, error } = await supabase_1.supabase
                .from('tasks')
                .select('id, name, project_id, projects(name)')
                .eq('user_id', user.id);
            if (error) {
                toast({
                    title: 'Error fetching tasks',
                    description: error.message,
                    variant: 'destructive',
                });
                return [];
            }
            return data;
        },
        enabled: !!user,
    });
    // Update selected task when currentTaskId changes (from the tracker)
    (0, react_1.useEffect)(() => {
        setSelectedTaskId(currentTaskId);
    }, [currentTaskId]);
    const handleStartTracking = () => {
        if (!selectedTaskId) {
            toast({
                title: 'Please select a task',
                description: 'You must select a task before starting tracking',
                variant: 'destructive',
            });
            return;
        }
        startTracking(selectedTaskId);
    };
    const handleStopTracking = () => {
        stopTracking();
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "p-4 border rounded-lg shadow-sm", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-medium mb-4", children: "Activity Tracking" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [!canTrack && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 mb-4", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium", children: "Desktop Application Required" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm mt-1", children: "Time tracking is only available in the desktop application." }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "mt-2", size: "sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Download, { className: "mr-1 h-4 w-4" }), " Download Desktop App"] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-full sm:w-2/3", children: (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedTaskId || "", onValueChange: (value) => setSelectedTaskId(value), disabled: isTracking || !canTrack, children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a task" }) }), (0, jsx_runtime_1.jsx)(select_1.SelectContent, { children: tasksLoading ? ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "loading", disabled: true, children: "Loading tasks..." })) : tasks && tasks.length > 0 ? (tasks.map((task) => ((0, jsx_runtime_1.jsxs)(select_1.SelectItem, { value: task.id, children: [task.name, " (", task.projects?.name, ")"] }, task.id)))) : ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "no-tasks", disabled: true, children: "No tasks available" })) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "w-full sm:w-1/3", children: isTracking ? ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "destructive", className: "w-full", onClick: handleStopTracking, disabled: !canTrack, children: "Stop Tracking" })) : ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "default", className: "w-full", onClick: handleStartTracking, disabled: !selectedTaskId || !canTrack, children: "Start Tracking" })) })] }), isTracking && ((0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-green-600 flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 rounded-full bg-green-600 mr-2 animate-pulse" }), "Currently tracking activity"] })), !isTracking && canTrack && ((0, jsx_runtime_1.jsx)("div", { className: "text-sm text-gray-500", children: "Select a task and start tracking to record your time" }))] })] }));
}
