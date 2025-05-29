import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  user_id: string;
  project_id: string | null;
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

export function DashboardContent() {
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

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchDashboardData();
    }
  }, [userDetails, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
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

      // Fetch basic stats
      const [usersRes, projectsRes, timeLogsRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email'),
        supabase.from('projects').select('id, name'),
        supabase
          .from('time_logs')
          .select('*')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
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
          project_id
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

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your team's productivity and activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

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

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest time tracking entries from your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading recent activity...</div>
          ) : timeLogs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No activity found for the selected period
            </div>
          ) : (
            <div className="space-y-4">
              {timeLogs.map((log: TimeLog) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
