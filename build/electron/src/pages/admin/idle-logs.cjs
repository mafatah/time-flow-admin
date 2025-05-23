"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminIdleLogs;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const select_1 = require("@/components/ui/select");
const calendar_1 = require("@/components/ui/calendar");
const popover_1 = require("@/components/ui/popover");
const table_1 = require("@/components/ui/table");
const page_header_1 = require("@/components/layout/page-header");
const client_1 = require("@/integrations/supabase/client");
const use_toast_1 = require("@/components/ui/use-toast");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
function AdminIdleLogs() {
    const [idleLogs, setIdleLogs] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)("");
    const [selectedProject, setSelectedProject] = (0, react_1.useState)("");
    const [selectedDate, setSelectedDate] = (0, react_1.useState)(new Date());
    const [loading, setLoading] = (0, react_1.useState)(true);
    const { toast } = (0, use_toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [selectedUser, selectedProject, selectedDate]);
    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch users and projects
            const [usersResponse, projectsResponse] = await Promise.all([
                client_1.supabase.from("users").select("id, full_name, email"),
                client_1.supabase.from("projects").select("id, name")
            ]);
            if (usersResponse.data)
                setUsers(usersResponse.data);
            if (projectsResponse.data)
                setProjects(projectsResponse.data);
            // Build query for idle logs with manual joins
            let query = client_1.supabase
                .from("idle_logs")
                .select("*")
                .gte('idle_start', (0, date_fns_1.format)(selectedDate, 'yyyy-MM-dd'))
                .lt('idle_start', (0, date_fns_1.format)(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
                .order('idle_start', { ascending: false });
            if (selectedUser) {
                query = query.eq('user_id', selectedUser);
            }
            if (selectedProject) {
                query = query.eq('project_id', selectedProject);
            }
            const { data: idleLogsData, error } = await query;
            if (error)
                throw error;
            // Manually join user and project data
            const enrichedLogs = (idleLogsData || []).map(log => {
                const user = usersResponse.data?.find(u => u.id === log.user_id);
                const project = projectsResponse.data?.find(p => p.id === log.project_id);
                return {
                    ...log,
                    users: user ? { full_name: user.full_name, email: user.email } : undefined,
                    projects: project ? { name: project.name } : undefined
                };
            });
            setIdleLogs(enrichedLogs);
        }
        catch (error) {
            console.error("Error fetching idle logs:", error);
            toast({
                title: "Error fetching idle logs",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const formatDuration = (minutes) => {
        if (!minutes)
            return "N/A";
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Idle Time Monitoring", subtitle: "View user idle periods and productivity" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-4 mb-6", children: [(0, jsx_runtime_1.jsxs)(popover_1.Popover, { children: [(0, jsx_runtime_1.jsx)(popover_1.PopoverTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", className: "w-full md:w-auto", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "mr-2 h-4 w-4" }), (0, date_fns_1.format)(selectedDate, 'MMM dd, yyyy')] }) }), (0, jsx_runtime_1.jsx)(popover_1.PopoverContent, { className: "w-auto p-0", children: (0, jsx_runtime_1.jsx)(calendar_1.Calendar, { mode: "single", selected: selectedDate, onSelect: (date) => date && setSelectedDate(date), initialFocus: true }) })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedUser, onValueChange: setSelectedUser, children: [(0, jsx_runtime_1.jsxs)(select_1.SelectTrigger, { className: "w-full md:w-[200px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Users" })] }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Users" }), users.map((user) => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: user.id, children: user.full_name }, user.id)))] })] }), (0, jsx_runtime_1.jsxs)(select_1.Select, { value: selectedProject, onValueChange: setSelectedProject, children: [(0, jsx_runtime_1.jsxs)(select_1.SelectTrigger, { className: "w-full md:w-[200px]", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { className: "mr-2 h-4 w-4" }), (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "All Projects" })] }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "", children: "All Projects" }), projects.map((project) => ((0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: project.id, children: project.name }, project.id)))] })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsxs)(card_1.CardTitle, { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-5 w-5" }), "Idle Time Logs"] }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8", children: "Loading idle logs..." })) : idleLogs.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8 text-muted-foreground", children: "No idle logs found for the selected filters" })) : ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border", children: (0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "User" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Project" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Idle Start" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Idle End" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Duration" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { children: idleLogs.map((log) => ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "font-medium", children: log.users?.full_name }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: log.projects?.name }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, date_fns_1.format)(new Date(log.idle_start), 'HH:mm:ss') }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: log.idle_end
                                                        ? (0, date_fns_1.format)(new Date(log.idle_end), 'HH:mm:ss')
                                                        : "Ongoing" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: formatDuration(log.duration_minutes) })] }, log.id))) })] }) })) })] })] }));
}
