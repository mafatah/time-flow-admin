"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardContent;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const card_1 = require("@/components/ui/card");
const page_header_1 = require("@/components/layout/page-header");
const supabase_1 = require("@/lib/supabase");
const auth_provider_1 = require("@/providers/auth-provider");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
function DashboardContent() {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [stats, setStats] = (0, react_1.useState)({
        totalHours: 0,
        activeUsers: 0,
        totalProjects: 0,
        tasksInProgress: 0,
        dailyStats: { active: 0, idle: 0 },
        weeklyStats: { active: 0, idle: 0 },
        projectStats: [],
        activeUsersList: [],
        activityData: []
    });
    const { toast } = (0, use_toast_1.useToast)();
    const { userDetails } = (0, auth_provider_1.useAuth)();
    const isAdmin = userDetails?.role === 'admin' || userDetails?.role === 'manager';
    (0, react_1.useEffect)(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);
                const today = new Date();
                const startOfToday = (0, date_fns_1.startOfDay)(today);
                const endOfToday = (0, date_fns_1.endOfDay)(today);
                const startOfThisWeek = (0, date_fns_1.startOfWeek)(today);
                const endOfThisWeek = (0, date_fns_1.endOfWeek)(today);
                // 1. Get all time logs
                let timeLogsQuery = supabase_1.supabase
                    .from("time_logs")
                    .select(`
            *,
            tasks(name, projects(name))
          `);
                if (!isAdmin && userDetails?.id) {
                    timeLogsQuery = timeLogsQuery.eq('user_id', userDetails.id);
                }
                const { data: timeLogs, error: timeLogsError } = await timeLogsQuery;
                if (timeLogsError)
                    throw timeLogsError;
                // 2. Get active users (logs without end_time)
                let activeUsersQuery = supabase_1.supabase
                    .from("time_logs")
                    .select(`
            id,
            user_id,
            users(id, full_name),
            tasks(id, name, projects(id, name))
          `)
                    .is('end_time', null);
                const { data: activeUsersData, error: activeUsersError } = await activeUsersQuery;
                if (activeUsersError)
                    throw activeUsersError;
                // 3. Get projects count
                let projectsQuery = supabase_1.supabase
                    .from("projects")
                    .select('id', { count: 'exact' });
                const { count: projectsCount, error: projectsError } = await projectsQuery;
                if (projectsError)
                    throw projectsError;
                // 4. Get tasks in progress
                let tasksQuery = supabase_1.supabase
                    .from("tasks")
                    .select('id');
                if (!isAdmin && userDetails?.id) {
                    tasksQuery = tasksQuery.eq('user_id', userDetails.id);
                }
                const { data: tasksData, error: tasksError } = await tasksQuery;
                if (tasksError)
                    throw tasksError;
                // Process data for stats
                let totalHours = 0;
                const dailyStats = { active: 0, idle: 0 };
                const weeklyStats = { active: 0, idle: 0 };
                const projectHours = {};
                const hourlyActivity = {};
                // Initialize hourly activity
                for (let i = 0; i < 24; i++) {
                    const hour = i.toString().padStart(2, '0');
                    hourlyActivity[hour] = { active: 0, idle: 0 };
                }
                // Process time logs
                timeLogs?.forEach((log) => {
                    const startTime = new Date(log.start_time);
                    const endTime = log.end_time ? new Date(log.end_time) : new Date();
                    const durationMinutes = (0, date_fns_1.differenceInMinutes)(endTime, startTime);
                    const hours = durationMinutes / 60;
                    // Total hours
                    totalHours += hours;
                    // Daily stats
                    if (startTime >= startOfToday && startTime <= endOfToday) {
                        if (log.is_idle) {
                            dailyStats.idle += hours;
                        }
                        else {
                            dailyStats.active += hours;
                        }
                        // Hourly activity for today
                        const hourKey = (0, date_fns_1.format)(startTime, 'HH');
                        if (log.is_idle) {
                            hourlyActivity[hourKey].idle += hours;
                        }
                        else {
                            hourlyActivity[hourKey].active += hours;
                        }
                    }
                    // Weekly stats
                    if (startTime >= startOfThisWeek && startTime <= endOfThisWeek) {
                        if (log.is_idle) {
                            weeklyStats.idle += hours;
                        }
                        else {
                            weeklyStats.active += hours;
                        }
                    }
                    // Project stats
                    const projectName = log.tasks?.projects?.name || 'Unknown';
                    if (!projectHours[projectName]) {
                        projectHours[projectName] = 0;
                    }
                    projectHours[projectName] += hours;
                });
                // Format project stats
                const projectStats = Object.entries(projectHours)
                    .map(([name, hours]) => ({ name, hours }))
                    .sort((a, b) => b.hours - a.hours)
                    .slice(0, 5);
                // Format active users list
                const uniqueActiveUsers = new Map();
                if (activeUsersData) {
                    activeUsersData.forEach((item) => {
                        const user = item.users;
                        const task = item.tasks;
                        if (user && task && !uniqueActiveUsers.has(item.user_id)) {
                            const project = task.projects;
                            uniqueActiveUsers.set(item.user_id, {
                                id: item.user_id,
                                name: user.full_name,
                                task: task.name,
                                project: project?.name || 'Unknown'
                            });
                        }
                    });
                }
                const activeUsersList = Array.from(uniqueActiveUsers.values());
                // Format activity data
                const activityData = Object.entries(hourlyActivity)
                    .map(([hour, data]) => ({
                    hour: `${hour}:00`,
                    active: Number(data.active.toFixed(2)),
                    idle: Number(data.idle.toFixed(2))
                }))
                    .sort((a, b) => a.hour.localeCompare(b.hour));
                // Update stats
                setStats({
                    totalHours,
                    activeUsers: activeUsersList.length,
                    totalProjects: projectsCount || 0,
                    tasksInProgress: tasksData?.length || 0,
                    dailyStats,
                    weeklyStats,
                    projectStats,
                    activeUsersList,
                    activityData
                });
            }
            catch (error) {
                console.error("Dashboard data error:", error);
                toast({
                    title: "Error loading dashboard",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
        // Set up a polling interval to refresh data
        const intervalId = setInterval(fetchDashboardData, 60000); // Refresh every minute
        return () => clearInterval(intervalId);
    }, [toast, userDetails, isAdmin]);
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Dashboard", subtitle: "Overview of your time tracking activity" }), (0, jsx_runtime_1.jsx)("div", { className: "flex justify-center items-center h-64", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }) })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Dashboard", subtitle: "Overview of your time tracking activity" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4", children: [(0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-sm font-medium", children: "Total Hours" }), (0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "h-4 w-4 text-muted-foreground" })] }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-2xl font-bold", children: [stats.totalHours.toFixed(1), "h"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: "Tracked across all projects" })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-sm font-medium", children: "Active Users" }), (0, jsx_runtime_1.jsx)(lucide_react_1.Users, { className: "h-4 w-4 text-muted-foreground" })] }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold", children: stats.activeUsers }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: "Currently tracking time" })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-sm font-medium", children: "Projects" }), (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "h-4 w-4 text-muted-foreground" })] }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold", children: stats.totalProjects }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: "Total active projects" })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsxs)(card_1.CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [(0, jsx_runtime_1.jsx)(card_1.CardTitle, { className: "text-sm font-medium", children: "Tasks" }), (0, jsx_runtime_1.jsx)(lucide_react_1.Timer, { className: "h-4 w-4 text-muted-foreground" })] }), (0, jsx_runtime_1.jsxs)(card_1.CardContent, { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-2xl font-bold", children: stats.tasksInProgress }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-muted-foreground", children: "Tasks in progress" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-4", children: [(0, jsx_runtime_1.jsxs)(card_1.Card, { className: "lg:col-span-3", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { className: "pb-2", children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Time Summary" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: "Today" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-muted-foreground", children: [Number((stats.dailyStats.active + stats.dailyStats.idle).toFixed(1)), " hours"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-2 w-full rounded-full bg-muted", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full bg-primary", style: {
                                                            width: `${stats.dailyStats.active + stats.dailyStats.idle > 0 ?
                                                                (stats.dailyStats.active / (stats.dailyStats.active + stats.dailyStats.idle)) * 100 : 0}%`
                                                        } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 flex text-xs text-muted-foreground", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Active: ", Number(stats.dailyStats.active.toFixed(1)), "h"] }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-auto", children: ["Idle: ", Number(stats.dailyStats.idle.toFixed(1)), "h"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: "This Week" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-muted-foreground", children: [Number((stats.weeklyStats.active + stats.weeklyStats.idle).toFixed(1)), " hours"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-2 w-full rounded-full bg-muted", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full bg-primary", style: {
                                                            width: `${stats.weeklyStats.active + stats.weeklyStats.idle > 0 ?
                                                                (stats.weeklyStats.active / (stats.weeklyStats.active + stats.weeklyStats.idle)) * 100 : 0}%`
                                                        } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-1 flex text-xs text-muted-foreground", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Active: ", Number(stats.weeklyStats.active.toFixed(1)), "h"] }), (0, jsx_runtime_1.jsxs)("span", { className: "ml-auto", children: ["Idle: ", Number(stats.weeklyStats.idle.toFixed(1)), "h"] })] })] })] }) })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "lg:col-span-4", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { className: "pb-2", children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Project Statistics" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: stats.projectStats.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-8 text-muted-foreground", children: "No project data available" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: stats.projectStats.map((project) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium", children: project.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-muted-foreground", children: [project.hours.toFixed(1), "h"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2 h-2 w-full rounded-full bg-muted", children: (0, jsx_runtime_1.jsx)("div", { className: "h-full rounded-full bg-primary", style: {
                                                        width: `${Math.min(project.hours / (stats.totalHours || 1) * 100, 100)}%`
                                                    } }) })] }, project.name))) })) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-7", children: [(0, jsx_runtime_1.jsxs)(card_1.Card, { className: "lg:col-span-4", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { className: "pb-2", children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Today's Activity" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: stats.activityData.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-8 text-muted-foreground", children: "No activity data available" })) : ((0, jsx_runtime_1.jsx)("div", { className: "h-[200px]", children: (0, jsx_runtime_1.jsx)("div", { className: "flex h-full items-end", children: stats.activityData.map((entry) => {
                                            const totalHours = entry.active + entry.idle;
                                            const height = Math.max(totalHours * 20, 4);
                                            return ((0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1 group", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute -top-6 left-0 right-0 text-center text-xs opacity-0 group-hover:opacity-100 transition-opacity", children: entry.hour }), (0, jsx_runtime_1.jsx)("div", { className: "mx-1 flex flex-col h-full justify-end", children: totalHours > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [entry.idle > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "w-full bg-yellow-400 dark:bg-yellow-600", style: { height: `${(entry.idle / totalHours) * height}px` } })), entry.active > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "w-full bg-green-500 dark:bg-green-600", style: { height: `${(entry.active / totalHours) * height}px` } }))] })) })] }, entry.hour));
                                        }) }) })) }), (0, jsx_runtime_1.jsxs)("div", { className: "px-4 pb-4 flex items-center justify-center space-x-4 text-xs", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-3 w-3 rounded-full bg-green-500 dark:bg-green-600 mr-2" }), (0, jsx_runtime_1.jsx)("span", { children: "Active" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-3 w-3 rounded-full bg-yellow-400 dark:bg-yellow-600 mr-2" }), (0, jsx_runtime_1.jsx)("span", { children: "Idle" })] })] })] }), (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "lg:col-span-3", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { className: "pb-2", children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Active Users" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: stats.activeUsersList.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center py-8 text-muted-foreground", children: "No active users at the moment" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: stats.activeUsersList.map((user) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex h-9 w-9 items-center justify-center rounded-full border border-muted bg-muted font-semibold text-muted-foreground", children: user.name.charAt(0) }), (0, jsx_runtime_1.jsxs)("div", { className: "ml-3", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-medium leading-none", children: user.name }), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground mt-1", children: [user.project, " - ", user.task] })] }), (0, jsx_runtime_1.jsx)("div", { className: "ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100", children: (0, jsx_runtime_1.jsx)("div", { className: "h-2 w-2 rounded-full bg-green-600" }) })] }, user.id))) })) })] })] })] }));
}
