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
exports.TaskSelector = TaskSelector;
const react_1 = __importStar(require("react"));
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
    return (<div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Activity Tracking</h3>
      
      <div className="space-y-4">
        {!canTrack && (<div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 mb-4">
            <p className="font-medium">Desktop Application Required</p>
            <p className="text-sm mt-1">Time tracking is only available in the desktop application.</p>
            <button_1.Button variant="outline" className="mt-2" size="sm">
              <lucide_react_1.Download className="mr-1 h-4 w-4"/> Download Desktop App
            </button_1.Button>
          </div>)}
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-2/3">
            <select_1.Select value={selectedTaskId || ""} onValueChange={(value) => setSelectedTaskId(value)} disabled={isTracking || !canTrack}>
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="Select a task"/>
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                {tasksLoading ? (<select_1.SelectItem value="loading" disabled>Loading tasks...</select_1.SelectItem>) : tasks && tasks.length > 0 ? (tasks.map((task) => (<select_1.SelectItem key={task.id} value={task.id}>
                      {task.name} ({task.projects?.name})
                    </select_1.SelectItem>))) : (<select_1.SelectItem value="no-tasks" disabled>No tasks available</select_1.SelectItem>)}
              </select_1.SelectContent>
            </select_1.Select>
          </div>
          
          <div className="w-full sm:w-1/3">
            {isTracking ? (<button_1.Button variant="destructive" className="w-full" onClick={handleStopTracking} disabled={!canTrack}>
                Stop Tracking
              </button_1.Button>) : (<button_1.Button variant="default" className="w-full" onClick={handleStartTracking} disabled={!selectedTaskId || !canTrack}>
                Start Tracking
              </button_1.Button>)}
          </div>
        </div>
        
        {isTracking && (<div className="text-sm text-green-600 flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-600 mr-2 animate-pulse"></div>
            Currently tracking activity
          </div>)}
        
        {!isTracking && canTrack && (<div className="text-sm text-gray-500">
            Select a task and start tracking to record your time
          </div>)}
      </div>
    </div>);
}
