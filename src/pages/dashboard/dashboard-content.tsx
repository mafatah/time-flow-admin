
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Loader2, Clock, CheckCircle2, Timer, Users, Activity, AlertTriangle } from "lucide-react";
import { differenceInMinutes, format, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO } from "date-fns";

// Import existing UI components
import { TimeSummaryCard } from "@/components/dashboard/time-summary-card";
import { ActiveUsersCard } from "@/components/dashboard/active-users-card";
import { ProjectStatsCard } from "@/components/dashboard/project-stats-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";

// Define strong types for our data
interface ActiveUser {
  id: string;
  name: string;
  task: string;
  project: string;
}

interface ActivityDataPoint {
  hour: string;
  active: number;
  idle: number;
}

interface ProjectStat {
  name: string;
  hours: number;
}

interface DashboardStats {
  totalHours: number;
  activeUsers: number;
  totalProjects: number;
  tasksInProgress: number;
  dailyStats: { active: number, idle: number };
  weeklyStats: { active: number, idle: number };
  projectStats: ProjectStat[];
  activeUsersList: ActiveUser[];
  activityData: ActivityDataPoint[];
}

// Define interfaces for Supabase response types
interface TimeLogTask {
  name: string;
  projects: {
    name: string;
  };
}

interface TimeLog {
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  tasks: TimeLogTask;
}

interface ActiveUserData {
  id: string;
  user_id: string;
  users: {
    id: string;
    full_name: string;
  }[];
  tasks: {
    id: string;
    name: string;
    projects: {
      id: string;
      name: string;
    }[];
  }[];
}

export default function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
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
  
  const { toast } = useToast();
  const { userDetails } = useAuth();
  const isAdmin = userDetails?.role === 'admin' || userDetails?.role === 'manager';

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);
        const startOfThisWeek = startOfWeek(today);
        const endOfThisWeek = endOfWeek(today);
        
        // 1. Get all time logs
        let timeLogsQuery = supabase
          .from("time_logs")
          .select(`
            *,
            tasks(name, projects(name))
          `);
          
        if (!isAdmin && userDetails?.id) {
          timeLogsQuery = timeLogsQuery.eq('user_id', userDetails.id);
        }
        
        const { data: timeLogs, error: timeLogsError } = await timeLogsQuery;
        
        if (timeLogsError) throw timeLogsError;
        
        // 2. Get active users (logs without end_time)
        let activeUsersQuery = supabase
          .from("time_logs")
          .select(`
            id,
            user_id,
            users(id, full_name),
            tasks(id, name, projects(id, name))
          `)
          .is('end_time', null);
          
        const { data: activeUsersData, error: activeUsersError } = await activeUsersQuery;
        
        if (activeUsersError) throw activeUsersError;
        
        // 3. Get projects count
        let projectsQuery = supabase
          .from("projects")
          .select('id', { count: 'exact' });
          
        const { count: projectsCount, error: projectsError } = await projectsQuery;
        
        if (projectsError) throw projectsError;
        
        // 4. Get tasks in progress
        let tasksQuery = supabase
          .from("tasks")
          .select('id');
          
        if (!isAdmin && userDetails?.id) {
          tasksQuery = tasksQuery.eq('user_id', userDetails.id);
        }
          
        const { data: tasksData, error: tasksError } = await tasksQuery;
        
        if (tasksError) throw tasksError;
        
        // Process data for stats
        let totalHours = 0;
        const dailyStats = { active: 0, idle: 0 };
        const weeklyStats = { active: 0, idle: 0 };
        const projectHours: Record<string, number> = {};
        const hourlyActivity: Record<string, { active: number, idle: number }> = {};
        
        // Initialize hourly activity
        for (let i = 0; i < 24; i++) {
          const hour = i.toString().padStart(2, '0');
          hourlyActivity[hour] = { active: 0, idle: 0 };
        }
        
        // Process time logs
        (timeLogs as unknown as TimeLog[] | null)?.forEach((log: TimeLog) => {
          const startTime = new Date(log.start_time);
          const endTime = log.end_time ? new Date(log.end_time) : new Date();
          const durationMinutes = differenceInMinutes(endTime, startTime);
          const hours = durationMinutes / 60;
          
          // Total hours
          totalHours += hours;
          
          // Daily stats
          if (startTime >= startOfToday && startTime <= endOfToday) {
            if (log.is_idle) {
              dailyStats.idle += hours;
            } else {
              dailyStats.active += hours;
            }
            
            // Hourly activity for today
            const hourKey = format(startTime, 'HH');
            if (log.is_idle) {
              hourlyActivity[hourKey].idle += hours;
            } else {
              hourlyActivity[hourKey].active += hours;
            }
          }
          
          // Weekly stats
          if (startTime >= startOfThisWeek && startTime <= endOfThisWeek) {
            if (log.is_idle) {
              weeklyStats.idle += hours;
            } else {
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
        const uniqueActiveUsers = new Map<string, ActiveUser>();
        
        if (activeUsersData) {
          (activeUsersData as unknown as ActiveUserData[]).forEach((item: ActiveUserData) => {
            const user = Array.isArray(item.users) ? item.users[0] : item.users;
            const task = Array.isArray(item.tasks) ? item.tasks[0] : item.tasks;

            if (user && task && !uniqueActiveUsers.has(item.user_id)) {
              const project = Array.isArray(task.projects)
                ? task.projects[0]
                : task.projects;

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
      } catch (error: any) {
        console.error("Dashboard data error:", error);
        toast({
          title: "Error loading dashboard",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
    
    // Set up a polling interval to refresh data
    const intervalId = setInterval(fetchDashboardData, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [toast, userDetails, isAdmin]);

  if (loading) {
    return (
      <div className="container py-6">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your time tracking activity"
        />
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your time tracking activity"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalHours.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground">
              Tracked across all projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently tracking time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Total active projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksInProgress}</div>
            <p className="text-xs text-muted-foreground">
              Tasks in progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mb-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Time Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Today</p>
                  <p className="text-sm text-muted-foreground">{Number((stats.dailyStats.active + stats.dailyStats.idle).toFixed(1))} hours</p>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ 
                      width: `${stats.dailyStats.active + stats.dailyStats.idle > 0 ? 
                        (stats.dailyStats.active / (stats.dailyStats.active + stats.dailyStats.idle)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="mt-1 flex text-xs text-muted-foreground">
                  <span>Active: {Number(stats.dailyStats.active.toFixed(1))}h</span>
                  <span className="ml-auto">Idle: {Number(stats.dailyStats.idle.toFixed(1))}h</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">This Week</p>
                  <p className="text-sm text-muted-foreground">{Number((stats.weeklyStats.active + stats.weeklyStats.idle).toFixed(1))} hours</p>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ 
                      width: `${stats.weeklyStats.active + stats.weeklyStats.idle > 0 ? 
                        (stats.weeklyStats.active / (stats.weeklyStats.active + stats.weeklyStats.idle)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="mt-1 flex text-xs text-muted-foreground">
                  <span>Active: {Number(stats.weeklyStats.active.toFixed(1))}h</span>
                  <span className="ml-auto">Idle: {Number(stats.weeklyStats.idle.toFixed(1))}h</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle>Project Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.projectStats.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                No project data available
              </div>
            ) : (
              <div className="space-y-4">
                {stats.projectStats.map((project) => (
                  <div key={project.name}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.hours.toFixed(1)}h</p>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ 
                          width: `${Math.min(project.hours / (stats.totalHours || 1) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle>Today's Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activityData.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                No activity data available
              </div>
            ) : (
              <div className="h-[200px]">
                <div className="flex h-full items-end">
                  {stats.activityData.map((entry) => {
                    const totalHours = entry.active + entry.idle;
                    const height = Math.max(totalHours * 20, 4);
                    
                    return (
                      <div key={entry.hour} className="relative flex-1 group">
                        <div className="absolute -top-6 left-0 right-0 text-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          {entry.hour}
                        </div>
                        <div className="mx-1 flex flex-col h-full justify-end">
                          {totalHours > 0 && (
                            <>
                              {entry.idle > 0 && (
                                <div 
                                  className="w-full bg-yellow-400 dark:bg-yellow-600"
                                  style={{ height: `${(entry.idle / totalHours) * height}px` }}
                                />
                              )}
                              {entry.active > 0 && (
                                <div 
                                  className="w-full bg-green-500 dark:bg-green-600"
                                  style={{ height: `${(entry.active / totalHours) * height}px` }}
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          <div className="px-4 pb-4 flex items-center justify-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 dark:bg-green-600 mr-2"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-400 dark:bg-yellow-600 mr-2"></div>
              <span>Idle</span>
            </div>
          </div>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activeUsersList.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                No active users at the moment
              </div>
            ) : (
              <div className="space-y-4">
                {stats.activeUsersList.map((user) => (
                  <div key={user.id} className="flex items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-muted bg-muted font-semibold text-muted-foreground">
                      {user.name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.project} - {user.task}
                      </p>
                    </div>
                    <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
