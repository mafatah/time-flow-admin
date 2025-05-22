"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TimeLogs;
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const table_1 = require("@/components/ui/table");
const page_header_1 = require("@/components/layout/page-header");
const supabase_1 = require("@/lib/supabase");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const popover_1 = require("@/components/ui/popover");
const calendar_1 = require("@/components/ui/calendar");
const select_1 = require("@/components/ui/select");
const auth_provider_1 = require("@/providers/auth-provider");
function TimeLogs() {
    const [timeLogs, setTimeLogs] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)(null);
    const [selectedTask, setSelectedTask] = (0, react_1.useState)(null);
    const [dateRange, setDateRange] = (0, react_1.useState)({
        from: (0, date_fns_1.startOfWeek)(new Date()),
        to: (0, date_fns_1.endOfWeek)(new Date())
    });
    const [showingCalendar, setShowingCalendar] = (0, react_1.useState)(false);
    const { toast } = (0, use_toast_1.useToast)();
    const { userDetails } = (0, auth_provider_1.useAuth)();
    // Fetch time logs
    (0, react_1.useEffect)(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // Build query for time logs
                let query = supabase_1.supabase
                    .from("time_logs")
                    .select(`
            *,
            users(id, full_name, email),
            tasks(id, name, projects(id, name))
          `)
                    .gte('start_time', dateRange.from.toISOString())
                    .lte('start_time', dateRange.to.toISOString());
                // Add filters if needed
                if (selectedUser) {
                    query = query.eq('user_id', selectedUser);
                }
                else if (userDetails?.role === 'employee') {
                    // Employees can only see their own logs
                    query = query.eq('user_id', userDetails.id);
                }
                if (selectedTask) {
                    query = query.eq('task_id', selectedTask);
                }
                const { data, error } = await query.order('start_time', { ascending: false });
                if (error)
                    throw error;
                setTimeLogs(data || []);
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
                    title: "Error fetching data",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast, dateRange, selectedUser, selectedTask, userDetails]);
    // Calculate total time
    const calculateTotalTime = () => {
        let totalMs = 0;
        timeLogs.forEach(log => {
            const start = new Date(log.start_time).getTime();
            const end = log.end_time ? new Date(log.end_time).getTime() : new Date().getTime();
            totalMs += (end - start);
        });
        const hours = Math.floor(totalMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };
    // Format time duration
    const formatDuration = (startTime, endTime) => {
        const start = new Date(startTime).getTime();
        const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
        const durationMs = end - start;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };
    // Format date
    const formatDate = (dateString) => {
        const date = (0, date_fns_1.parseISO)(dateString);
        if ((0, date_fns_1.isToday)(date)) {
            return `Today, ${(0, date_fns_1.format)(date, 'h:mm a')}`;
        }
        else if ((0, date_fns_1.isYesterday)(date)) {
            return `Yesterday, ${(0, date_fns_1.format)(date, 'h:mm a')}`;
        }
        else {
            return (0, date_fns_1.format)(date, 'MMM d, yyyy h:mm a');
        }
    };
    // Export to CSV
    const exportToCsv = () => {
        // Generate CSV content
        const headers = ['Date', 'User', 'Project', 'Task', 'Start Time', 'End Time', 'Duration', 'Status'];
        const rows = timeLogs.map(log => [
            (0, date_fns_1.format)(new Date(log.start_time), 'yyyy-MM-dd'),
            log.users.full_name,
            log.tasks.projects.name,
            log.tasks.name,
            (0, date_fns_1.format)(new Date(log.start_time), 'HH:mm:ss'),
            log.end_time ? (0, date_fns_1.format)(new Date(log.end_time), 'HH:mm:ss') : 'Active',
            formatDuration(log.start_time, log.end_time),
            log.is_idle ? 'Idle' : 'Active'
        ]);
        // Combine headers and rows
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `time-logs-${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    // Handle date range selection
    const handleDateRangeSelect = (range) => {
        if (range.from && range.to) {
            setDateRange(range);
            setShowingCalendar(false);
        }
    };
    // Preset date ranges
    const selectThisWeek = () => {
        setDateRange({
            from: (0, date_fns_1.startOfWeek)(new Date()),
            to: (0, date_fns_1.endOfWeek)(new Date())
        });
        setShowingCalendar(false);
    };
    const selectLastWeek = () => {
        const today = new Date();
        setDateRange({
            from: (0, date_fns_1.startOfWeek)((0, date_fns_1.addDays)(today, -7)),
            to: (0, date_fns_1.endOfWeek)((0, date_fns_1.addDays)(today, -7))
        });
        setShowingCalendar(false);
    };
    return (<div className="container py-6">
      <page_header_1.PageHeader title="Time Logs" subtitle="View and export time tracking data">
        <button_1.Button onClick={exportToCsv}>
          <lucide_react_1.Download className="mr-2 h-4 w-4"/> Export CSV
        </button_1.Button>
      </page_header_1.PageHeader>

      <div className="flex flex-col md:flex-row gap-4 mt-6 mb-4">
        {/* Date Range Selector */}
        <popover_1.Popover open={showingCalendar} onOpenChange={setShowingCalendar}>
          <popover_1.PopoverTrigger asChild>
            <button_1.Button variant="outline" className="w-full md:w-auto justify-start">
              <lucide_react_1.Calendar className="mr-2 h-4 w-4"/>
              {(0, date_fns_1.format)(dateRange.from, 'MMM d')} - {(0, date_fns_1.format)(dateRange.to, 'MMM d, yyyy')}
            </button_1.Button>
          </popover_1.PopoverTrigger>
          <popover_1.PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <button_1.Button variant="ghost" size="sm" onClick={selectThisWeek}>This Week</button_1.Button>
                <button_1.Button variant="ghost" size="sm" onClick={selectLastWeek}>Last Week</button_1.Button>
              </div>
            </div>
            <calendar_1.Calendar mode="range" selected={dateRange} onSelect={handleDateRangeSelect} numberOfMonths={1} initialFocus/>
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
        <card_1.CardHeader className="flex flex-row items-center justify-between">
          <card_1.CardTitle>Time Entries</card_1.CardTitle>
          <div className="text-sm font-medium">
            Total Time: <span className="text-primary">{calculateTotalTime()}</span>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent>
          {loading ? (<div className="flex justify-center p-8">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : timeLogs.length === 0 ? (<div className="flex justify-center p-8 text-muted-foreground">
              No time logs found for the selected filters
            </div>) : (<table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Date</table_1.TableHead>
                  {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (<table_1.TableHead>User</table_1.TableHead>)}
                  <table_1.TableHead>Project</table_1.TableHead>
                  <table_1.TableHead>Task</table_1.TableHead>
                  <table_1.TableHead>Duration</table_1.TableHead>
                  <table_1.TableHead>Status</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {timeLogs.map((log) => (<table_1.TableRow key={log.id} className={log.is_idle ? "bg-muted/50" : ""}>
                    <table_1.TableCell>{formatDate(log.start_time)}</table_1.TableCell>
                    {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (<table_1.TableCell>{log.users?.full_name}</table_1.TableCell>)}
                    <table_1.TableCell>{log.tasks?.projects?.name}</table_1.TableCell>
                    <table_1.TableCell>{log.tasks?.name}</table_1.TableCell>
                    <table_1.TableCell>{formatDuration(log.start_time, log.end_time)}</table_1.TableCell>
                    <table_1.TableCell>
                      {!log.end_time ? (<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>) : log.is_idle ? (<span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Idle
                        </span>) : (<span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          Completed
                        </span>)}
                    </table_1.TableCell>
                  </table_1.TableRow>))}
              </table_1.TableBody>
            </table_1.Table>)}
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
