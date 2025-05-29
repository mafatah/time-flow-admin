import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Activity, TrendingUp, AlertTriangle, Globe, Camera, MousePointer, Keyboard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay, isToday, isYesterday, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  user_id: string;
  project_id: string | null;
  idle_time_seconds: number | null;
  keyboard_usage: number | null;
  mouse_usage: number | null;
  application_usage: any[] | null;
  url_visited: any[] | null;
  users: {
    full_name: string;
  };
  projects: {
    name: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalHours: number;
  projectsCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function EnhancedDashboard() {
  const { userDetails } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalHours: 0,
    projectsCount: 0
  });
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchDashboardData();
      fetchUsers();
      fetchProjects();
    }
  }, [userDetails, dateRange, selectedUser]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
  
      let userFilter = '';
      if (selectedUser !== 'all') {
        userFilter = `user_id.eq.${selectedUser}`;
      }
  
      // Fetch basic stats
      const [usersRes, projectsRes, timeLogsRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email'),
        supabase.from('projects').select('id, name'),
        supabase
          .from('time_logs')
          .select('*')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
          .or(userFilter)
      ]);
  
      if (usersRes.error) throw usersRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (timeLogsRes.error) throw timeLogsRes.error;
  
      // Calculate stats
      const users = usersRes.data || [];
      const projects = projectsRes.data || [];
      const logs = timeLogsRes.data || [];
  
      const activeUserIds = new Set(logs.map((log: any) => log.user_id));
      const totalHours = logs.reduce((sum: number, log: any) => {
        if (log.end_time) {
          const duration = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
          return sum + duration / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
  
      setStats({
        totalUsers: users.length,
        activeUsers: activeUserIds.size,
        totalHours: Math.round(totalHours * 100) / 100,
        projectsCount: projects.length
      });
  
      // Fetch detailed time logs with user and project info
      const detailedLogsRes = await supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          project_id,
          idle_time_seconds,
          keyboard_usage,
          mouse_usage,
          application_usage,
          url_visited,
          users (full_name),
          projects (name)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: false })
        .limit(10);
  
      if (detailedLogsRes.error) throw detailedLogsRes.error;
  
      // Manually join user and project data
      const enrichedLogs: TimeLog[] = (detailedLogsRes.data || []).map((log: any) => {
        const user = users.find((u: User) => u.id === log.user_id);
        const project = log.project_id ? projects.find((p: Project) => p.id === log.project_id) : null;
        
        return {
          ...log,
          users: { full_name: user?.full_name || 'Unknown User' },
          projects: project ? { name: project.name } : null
        } as TimeLog;
      });
  
      setTimeLogs(enrichedLogs);
  
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employee');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  // Enhanced analytics calculations
  const enhancedLogs = timeLogs.map((log: any, index: number) => {
    const isLast = index === timeLogs.length - 1;
    const nextLog = isLast ? null : timeLogs[index + 1];

    const idlePercentage = log.idle_time_seconds
      ? Math.min(100, Math.round((log.idle_time_seconds / ((new Date(log.end_time || log.start_time).getTime() - new Date(log.start_time).getTime()) / 1000)) * 100))
      : 0;

    const keyboardUsage = log.keyboard_usage !== null ? Math.min(100, log.keyboard_usage) : 0;
    const mouseUsage = log.mouse_usage !== null ? Math.min(100, log.mouse_usage) : 0;

    const applicationUsage = log.application_usage || [];
    const topApplication = applicationUsage.length > 0
      ? applicationUsage.reduce((prev: any, current: any) => (prev.percent > current.percent) ? prev : current)
      : null;

    const timeDifference = nextLog ? new Date(log.start_time).getTime() - new Date(nextLog.end_time || nextLog.start_time).getTime() : 0;
    const timeSinceLastActivity = nextLog ? format(timeDifference, 'HH:mm') : 'N/A';

    return {
      ...log,
      idlePercentage,
      keyboardUsage,
      mouseUsage,
      topApplication,
      timeSinceLastActivity
    };
  });

  // Application Usage Stats
  const applicationUsageData = enhancedLogs.reduce((acc: any, log: any) => {
    if (log.application_usage) {
      log.application_usage.forEach((app: any) => {
        const existingApp = acc.find((a: any) => a.name === app.name);
        if (existingApp) {
          existingApp.percent += app.percent;
        } else {
          acc.push({ name: app.name, percent: app.percent });
        }
      });
    }
    return acc;
  }, []).sort((a: any, b: any) => b.percent - a.percent).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enhanced Dashboard</h2>
          <p className="text-muted-foreground">
            Detailed insights into your team's productivity and activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user: User) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Registered team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Users with activity in selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalHours}h</div>
                <p className="text-xs text-muted-foreground">
                  Total tracked time in selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.projectsCount}</div>
                <p className="text-xs text-muted-foreground">
                  Total active projects
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest time tracking entries from your team with detailed insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading recent activity...</div>
              ) : enhancedLogs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No activity found for the selected period
                </div>
              ) : (
                <div className="space-y-4">
                  {enhancedLogs.map((log: any) => (
                    <div key={log.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.start_time), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{log.users.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {log.projects?.name || 'No project assigned'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {log.end_time ? (
                            <Badge variant="secondary">
                              {Math.round(
                                (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) /
                                (1000 * 60)
                              )} min
                            </Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="shadow-none border-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Progress value={log.idlePercentage} className="mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {log.idlePercentage}% of time
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-none border-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Keyboard Usage</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Progress value={log.keyboardUsage} className="mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {log.keyboardUsage}% of time
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-none border-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Mouse Usage</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Progress value={log.mouseUsage} className="mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {log.mouseUsage}% of time
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="shadow-none border-0">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Top Application</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {log.topApplication ? (
                              <>
                                <p className="text-sm font-medium">{log.topApplication.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {log.topApplication.percent}% of time
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">No data</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Usage</CardTitle>
              <CardDescription>
                Insights into application usage during tracked time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      dataKey="percent"
                      isAnimationActive={false}
                      data={applicationUsageData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {
                        applicationUsageData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))
                      }
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No application usage data available for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
