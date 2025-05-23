"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ScreenshotsViewer;
const jsx_runtime_1 = require("react/jsx-runtime");
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Screenshots Viewer", subtitle: "View screenshots taken by the desktop app" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-4 mt-6 mb-4", children: [(0, jsx_runtime_1.jsxs)(popover_1.Popover, { open: showingCalendar, onOpenChange: setShowingCalendar, children: [(0, jsx_runtime_1.jsx)(popover_1.PopoverTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "w-full md:w-auto justify-start", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "mr-2 h-4 w-4" }), (0, date_fns_1.isToday)(selectedDate) ? "Today" : (0, date_fns_1.isYesterday)(selectedDate) ? "Yesterday" : (0, date_fns_1.format)(selectedDate, 'MMM d, yyyy')] }) }), (0, jsx_runtime_1.jsx)(popover_1.PopoverContent, { className: "w-auto p-0", align: "start", children: (0, jsx_runtime_1.jsx)(calendar_1.Calendar, { mode: "single", selected: selectedDate, onSelect: handleDateSelect, initialFocus: true }) })] }), (userDetails?.role === 'admin' || userDetails?.role === 'manager') && ((0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedUser || '', onValueChange: value => setSelectedUser(value || null), children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { className: "w-full md:w-[200px]", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Users" })] }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Users" }), users.map(user => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: user.id, children: user.full_name }, user.id)))] })] })), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedTask || '', onValueChange: value => setSelectedTask(value || null), children: [(0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { className: "w-full md:w-[220px]", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Tasks" })] }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Tasks" }), tasks.map(task => ((0, jsx_runtime_1.jsxs)(select_1.SelectItem, { value: task.id, children: [task.projects?.name, " - ", task.name] }, task.id)))] })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Screenshots" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center p-8", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }) })) : screenshots.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center p-8 text-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Image, { className: "h-12 w-12 text-muted-foreground mb-2" }), (0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground", children: "No screenshots found for the selected date" })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: screenshots.map((screenshot) => ((0, jsx_runtime_1.jsxs)("div", { className: "relative border rounded-md overflow-hidden group cursor-pointer", onClick: () => setSelectedImage(screenshot), children: [(0, jsx_runtime_1.jsx)("img", { src: screenshot.image_url, alt: "Screenshot", className: "w-full h-40 object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "font-medium truncate", children: [screenshot.tasks?.projects?.name, " - ", screenshot.tasks?.name] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mt-1", children: [(0, jsx_runtime_1.jsx)("span", { children: formatDate(screenshot.captured_at) }), (userDetails?.role === 'admin' || userDetails?.role === 'manager') && ((0, jsx_runtime_1.jsx)("span", { className: "truncate max-w-[120px]", children: screenshot.users?.full_name }))] })] })] }, screenshot.id))) })) })] }), (0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: !!selectedImage, onOpenChange: (open) => !open && setSelectedImage(null), children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "max-w-5xl", children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogHeader, { children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogTitle, { children: ["Screenshot - ", selectedImage?.tasks?.projects?.name, " - ", selectedImage?.tasks?.name] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center text-sm mb-2", children: [(0, jsx_runtime_1.jsx)("span", { children: selectedImage && formatDate(selectedImage.captured_at) }), selectedImage?.users && (0, jsx_runtime_1.jsxs)("span", { children: ["User: ", selectedImage.users.full_name] })] }), (0, jsx_runtime_1.jsx)("div", { className: "border rounded-md overflow-hidden", children: selectedImage && ((0, jsx_runtime_1.jsx)("img", { src: selectedImage.image_url, alt: "Screenshot", className: "w-full h-auto" })) })] })] }) })] }));
}
