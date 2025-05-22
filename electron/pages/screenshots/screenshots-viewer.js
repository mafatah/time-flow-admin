"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenshotsViewer;
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const dialog_1 = require("@/components/ui/dialog");
const page_header_1 = require("@/components/layout/page-header");
const supabase_1 = require("@/lib/supabase");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const popover_1 = require("@/components/ui/popover");
const calendar_1 = require("@/components/ui/calendar");
const select_1 = require("@/components/ui/select");
const auth_provider_1 = require("@/providers/auth-provider");
function ScreenshotsViewer() {
    const [screenshots, setScreenshots] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)(null);
    const [selectedTask, setSelectedTask] = (0, react_1.useState)(null);
    const [selectedDate, setSelectedDate] = (0, react_1.useState)(new Date());
    const [showingCalendar, setShowingCalendar] = (0, react_1.useState)(false);
    const [selectedImage, setSelectedImage] = (0, react_1.useState)(null);
    const { toast } = (0, use_toast_1.useToast)();
    const { userDetails } = (0, auth_provider_1.useAuth)();
    // Fetch screenshots
    (0, react_1.useEffect)(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // Calculate date range for the selected day
                const startDate = (0, date_fns_1.startOfDay)(selectedDate);
                const endDate = (0, date_fns_1.endOfDay)(selectedDate);
                // Build query for screenshots
                let query = supabase_1.supabase
                    .from("screenshots")
                    .select(`
            *,
            users(id, full_name, email),
            tasks(id, name, projects(id, name))
          `)
                    .gte('captured_at', startDate.toISOString())
                    .lte('captured_at', endDate.toISOString());
                // Add filters if needed
                if (selectedUser) {
                    query = query.eq('user_id', selectedUser);
                }
                else if (userDetails?.role === 'employee') {
                    // Employees can only see their own screenshots
                    query = query.eq('user_id', userDetails.id);
                }
                if (selectedTask) {
                    query = query.eq('task_id', selectedTask);
                }
                const { data, error } = await query.order('captured_at', { ascending: false });
                if (error)
                    throw error;
                setScreenshots(data || []);
                // Fetch users if admin or manager
                if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
                    const { data: usersData, error: usersError } = await supabase_1.supabase
                        .from("users")
                        .select("id, full_name, email")
                        .order('full_name');
                    if (usersError)
                        throw usersError;
                    setUsers(usersData || []);
                }
                // Fetch tasks
                let tasksQuery = supabase_1.supabase
                    .from("tasks")
                    .select(`
            id, 
            name,
            projects(id, name)
          `);
                if (userDetails?.role === 'employee') {
                    tasksQuery = tasksQuery.eq('user_id', userDetails.id);
                }
                else if (selectedUser) {
                    tasksQuery = tasksQuery.eq('user_id', selectedUser);
                }
                const { data: tasksData, error: tasksError } = await tasksQuery.order('name');
                if (tasksError)
                    throw tasksError;
                setTasks(tasksData || []);
            }
            catch (error) {
                toast({
                    title: "Error fetching screenshots",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast, selectedDate, selectedUser, selectedTask, userDetails]);
    // Format date
    const formatDate = (dateString) => {
        const date = (0, date_fns_1.parseISO)(dateString);
        if ((0, date_fns_1.isToday)(date)) {
            return `Today at ${(0, date_fns_1.format)(date, 'h:mm a')}`;
        }
        else if ((0, date_fns_1.isYesterday)(date)) {
            return `Yesterday at ${(0, date_fns_1.format)(date, 'h:mm a')}`;
        }
        else {
            return (0, date_fns_1.format)(date, 'MMM d, yyyy h:mm a');
        }
    };
    // Handle date selection
    const handleDateSelect = (date) => {
        if (date) {
            setSelectedDate(date);
            setShowingCalendar(false);
        }
    };
    return (<div className="container py-6">
      <page_header_1.PageHeader title="Screenshots Viewer" subtitle="View screenshots taken by the desktop app"/>

      <div className="flex flex-col md:flex-row gap-4 mt-6 mb-4">
        {/* Date Selector */}
        <popover_1.Popover open={showingCalendar} onOpenChange={setShowingCalendar}>
          <popover_1.PopoverTrigger asChild>
            <button_1.Button variant="outline" className="w-full md:w-auto justify-start">
              <lucide_react_1.Calendar className="mr-2 h-4 w-4"/>
              {(0, date_fns_1.isToday)(selectedDate) ? "Today" : (0, date_fns_1.isYesterday)(selectedDate) ? "Yesterday" : (0, date_fns_1.format)(selectedDate, 'MMM d, yyyy')}
            </button_1.Button>
          </popover_1.PopoverTrigger>
          <popover_1.PopoverContent className="w-auto p-0" align="start">
            <calendar_1.Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus/>
          </popover_1.PopoverContent>
        </popover_1.Popover>

        {/* User Filter - only for admin/manager */}
        {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (<select_1.Select value={selectedUser || ''} onValueChange={value => setSelectedUser(value || null)}>
            <select_1.SelectTrigger className="w-full md:w-[200px]">
              <div className="flex items-center">
                <lucide_react_1.User className="mr-2 h-4 w-4"/>
                <select_1.SelectValue placeholder="All Users"/>
              </div>
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="">All Users</select_1.SelectItem>
              {users.map(user => (<select_1.SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </select_1.SelectItem>))}
            </select_1.SelectContent>
          </select_1.Select>)}

        {/* Task Filter */}
        <select_1.Select value={selectedTask || ''} onValueChange={value => setSelectedTask(value || null)}>
          <select_1.SelectTrigger className="w-full md:w-[220px]">
            <div className="flex items-center">
              <lucide_react_1.Clock className="mr-2 h-4 w-4"/>
              <select_1.SelectValue placeholder="All Tasks"/>
            </div>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All Tasks</select_1.SelectItem>
            {tasks.map(task => (<select_1.SelectItem key={task.id} value={task.id}>
                {task.projects?.name} - {task.name}
              </select_1.SelectItem>))}
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Screenshots</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {loading ? (<div className="flex justify-center p-8">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : screenshots.length === 0 ? (<div className="flex flex-col items-center justify-center p-8 text-center">
              <lucide_react_1.Image className="h-12 w-12 text-muted-foreground mb-2"/>
              <p className="text-muted-foreground">No screenshots found for the selected date</p>
            </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((screenshot) => (<div key={screenshot.id} className="relative border rounded-md overflow-hidden group cursor-pointer" onClick={() => setSelectedImage(screenshot)}>
                  <img src={screenshot.image_url} alt="Screenshot" className="w-full h-40 object-cover"/>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors"/>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                    <div className="font-medium truncate">
                      {screenshot.tasks?.projects?.name} - {screenshot.tasks?.name}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>{formatDate(screenshot.captured_at)}</span>
                      {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (<span className="truncate max-w-[120px]">{screenshot.users?.full_name}</span>)}
                    </div>
                  </div>
                </div>))}
            </div>)}
        </card_1.CardContent>
      </card_1.Card>

      {/* Image Preview Dialog */}
      <dialog_1.Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <dialog_1.DialogContent className="max-w-5xl">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>
              Screenshot - {selectedImage?.tasks?.projects?.name} - {selectedImage?.tasks?.name}
            </dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <div className="mt-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span>{selectedImage && formatDate(selectedImage.captured_at)}</span>
              {selectedImage?.users && <span>User: {selectedImage.users.full_name}</span>}
            </div>
            <div className="border rounded-md overflow-hidden">
              {selectedImage && (<img src={selectedImage.image_url} alt="Screenshot" className="w-full h-auto"/>)}
            </div>
          </div>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
