"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminScreenshots;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const select_1 = require("@/components/ui/select");
const calendar_1 = require("@/components/ui/calendar");
const popover_1 = require("@/components/ui/popover");
const dialog_1 = require("@/components/ui/dialog");
const page_header_1 = require("@/components/layout/page-header");
const client_1 = require("@/integrations/supabase/client");
const use_toast_1 = require("@/components/ui/use-toast");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
function AdminScreenshots() {
    const [screenshots, setScreenshots] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)("");
    const [selectedProject, setSelectedProject] = (0, react_1.useState)("");
    const [selectedDate, setSelectedDate] = (0, react_1.useState)(new Date());
    const [selectedImage, setSelectedImage] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const { toast } = (0, use_toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [selectedUser, selectedProject, selectedDate]);
    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch users, projects and tasks
            const [usersResponse, projectsResponse, tasksResponse] = await Promise.all([
                client_1.supabase.from("users").select("id, full_name, email"),
                client_1.supabase.from("projects").select("id, name"),
                client_1.supabase.from("tasks").select("id, name, project_id")
            ]);
            if (usersResponse.data)
                setUsers(usersResponse.data);
            if (projectsResponse.data)
                setProjects(projectsResponse.data);
            if (tasksResponse.data)
                setTasks(tasksResponse.data);
            // Build query for screenshots with manual joins
            let query = client_1.supabase
                .from("screenshots")
                .select("*")
                .gte('captured_at', (0, date_fns_1.format)(selectedDate, 'yyyy-MM-dd'))
                .lt('captured_at', (0, date_fns_1.format)(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
                .order('captured_at', { ascending: false });
            if (selectedUser) {
                query = query.eq('user_id', selectedUser);
            }
            if (selectedProject) {
                // Filter by project through tasks
                const projectTasks = tasksResponse.data?.filter(t => t.project_id === selectedProject) || [];
                const taskIds = projectTasks.map(t => t.id);
                if (taskIds.length > 0) {
                    query = query.in('task_id', taskIds);
                }
                else {
                    // If no tasks found for this project, return empty results
                    setScreenshots([]);
                    return;
                }
            }
            const { data: screenshotsData, error } = await query;
            if (error)
                throw error;
            // Manually join user, task and project data
            const enrichedScreenshots = (screenshotsData || []).map(screenshot => {
                const user = usersResponse.data?.find(u => u.id === screenshot.user_id);
                const task = tasksResponse.data?.find(t => t.id === screenshot.task_id);
                const project = task ? projectsResponse.data?.find(p => p.id === task.project_id) : undefined;
                return {
                    ...screenshot,
                    users: user ? { full_name: user.full_name, email: user.email } : undefined,
                    tasks: task ? {
                        name: task.name,
                        project_id: task.project_id,
                        projects: project ? { name: project.name } : undefined
                    } : undefined
                };
            });
            setScreenshots(enrichedScreenshots);
        }
        catch (error) {
            console.error("Error fetching screenshots:", error);
            toast({
                title: "Error fetching screenshots",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Screenshot Monitoring", subtitle: "View user screenshots and activity" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-4 mb-6", children: [(0, jsx_runtime_1.jsxs)(popover_1.Popover, { children: [(0, jsx_runtime_1.jsx)(popover_1.PopoverTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "w-full md:w-auto", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "mr-2 h-4 w-4" }), (0, date_fns_1.format)(selectedDate, 'MMM dd, yyyy')] }) }), (0, jsx_runtime_1.jsx)(popover_1.PopoverContent, { className: "w-auto p-0", children: (0, jsx_runtime_1.jsx)(calendar_1.Calendar, { mode: "single", selected: selectedDate, onSelect: (date) => date && setSelectedDate(date), initialFocus: true }) })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedUser, onValueChange: setSelectedUser, children: [(0, jsx_runtime_1.jsxs)(select_1.SelectTrigger, { className: "w-full md:w-[200px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Users" })] }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Users" }), users.map((user) => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: user.id, children: user.full_name }, user.id)))] })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedProject, onValueChange: setSelectedProject, children: [(0, jsx_runtime_1.jsxs)(select_1.SelectTrigger, { className: "w-full md:w-[200px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Projects" })] }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Projects" }), projects.map((project) => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: project.id, children: project.name }, project.id)))] })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Screenshots" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8", children: "Loading screenshots..." })) : screenshots.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8 text-muted-foreground", children: "No screenshots found for the selected filters" })) : ((0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: screenshots.map((screenshot) => ((0, jsx_runtime_1.jsxs)("div", { className: "relative border rounded-md overflow-hidden group cursor-pointer", onClick: () => setSelectedImage(screenshot), children: [(0, jsx_runtime_1.jsx)("img", { src: screenshot.image_url, alt: "Screenshot", className: "w-full h-40 object-cover" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" }), (0, jsx_runtime_1.jsxs)("div", { className: "absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium truncate", children: screenshot.tasks?.projects?.name || 'Unknown Project' }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mt-1", children: [(0, jsx_runtime_1.jsx)("span", { children: (0, date_fns_1.format)(new Date(screenshot.captured_at), 'HH:mm') }), (0, jsx_runtime_1.jsx)("span", { className: "truncate max-w-[120px]", children: screenshot.users?.full_name })] })] })] }, screenshot.id))) })) })] }), (0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: !!selectedImage, onOpenChange: (open) => !open && setSelectedImage(null), children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "max-w-4xl", children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogHeader, { children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogTitle, { children: ["Screenshot - ", selectedImage?.tasks?.projects?.name || 'Unknown Project', " by ", selectedImage?.users?.full_name] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-muted-foreground mb-2", children: selectedImage && (0, date_fns_1.format)(new Date(selectedImage.captured_at), 'MMM dd, yyyy HH:mm:ss') }), selectedImage && ((0, jsx_runtime_1.jsx)("img", { src: selectedImage.image_url, alt: "Screenshot", className: "w-full h-auto border rounded-md" }))] })] }) })] }));
}
