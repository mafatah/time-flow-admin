import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInHours } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Activity, Clock, Users, Camera, Globe, Monitor, 
  Calendar, Filter, RefreshCw, Target, Zap
} from 'lucide-react';

interface DashboardData {
  totalUsers: number;
  totalActiveHours: number;
  totalScreenshots: number;
  totalAppsUsed: number;
  totalWebsitesVisited: number;
  avgActivityPercent: number;
  avgFocusPercent: number;
}

interface TimeData {
  date: string;
  hours: number;
  screenshots: number;
  activity: number;
}

interface ProjectData {
  name: string;
  hours: number;
  percentage: number;
  users: number;
}

interface UserProductivity {
  user_name: string;
  total_hours: number;
  avg_activity: number;
  screenshots_count: number;
  apps_used: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export default function InsightsPage() {
  const { userDetails } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalActiveHours: 0,
    totalScreenshots: 0,
    totalAppsUsed: 0,
    totalWebsitesVisited: 0,
    avgActivityPercent: 0,
    avgFocusPercent: 0
  });
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [projectData, setProjectData] = useState<ProjectData[]>([]);
  const [userProductivity, setUserProductivity] = useState<UserProductivity[]>([]);
  const [dateRange, setDateRange] = useState('week');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchFiltersData();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchAllData();
    }
  }, [userDetails, dateRange, selectedDate, selectedUser, selectedProject]);

  const fetchFiltersData = async () => {
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employee')
        .order('full_name');

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      // Map full_name to name for consistency with interface
      const mappedUsers = (usersData || []).map(user => ({
        id: user.id,
        name: user.full_name,
        email: user.email
      }));

      setUsers(mappedUsers);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getDateRange();
      await Promise.all([
        fetchDashboardStats(start, end),
        fetchTimeSeriesData(start, end),
        fetchProjectBreakdown(start, end),
        fetchUserProductivityData(start, end)
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load insights data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async (start: Date, end: Date) => {
    try {
      // Get active users count (filtered if specific user selected)
      let usersQuery = supabase
        .from('users')
        .select('id')
        .eq('role', 'employee');
      
      if (selectedUser !== 'all') {
        usersQuery = usersQuery.eq('id', selectedUser);
      }
      
      const { data: usersData } = await usersQuery;

      // Get time logs for total hours (with filters)
      let timeLogsQuery = supabase
        .from('time_logs')
        .select('start_time, end_time, user_id, project_id')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());
      
      if (selectedUser !== 'all') {
        timeLogsQuery = timeLogsQuery.eq('user_id', selectedUser);
      }
      if (selectedProject !== 'all') {
        timeLogsQuery = timeLogsQuery.eq('project_id', selectedProject);
      }
      
      const { data: timeLogsData } = await timeLogsQuery;

      // Get screenshots count and activity data (with filters)
      let screenshotsQuery = supabase
        .from('screenshots')
        .select('activity_percent, focus_percent, user_id, project_id')
        .gte('captured_at', start.toISOString())
        .lte('captured_at', end.toISOString());
      
      if (selectedUser !== 'all') {
        screenshotsQuery = screenshotsQuery.eq('user_id', selectedUser);
      }
      if (selectedProject !== 'all') {
        screenshotsQuery = screenshotsQuery.eq('project_id', selectedProject);
      }
      
      const { data: screenshotsData } = await screenshotsQuery;

      // Get unique apps and websites (with filters)
      let appsQuery = supabase
        .from('app_logs')
        .select('app_name, user_id')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());
      
      if (selectedUser !== 'all') {
        appsQuery = appsQuery.eq('user_id', selectedUser);
      }
      
      const { data: appsData } = await appsQuery;

      let urlsQuery = supabase
        .from('url_logs')
        .select('domain, user_id')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString());
      
      if (selectedUser !== 'all') {
        urlsQuery = urlsQuery.eq('user_id', selectedUser);
      }
      
      const { data: urlsData } = await urlsQuery;

      // Calculate totals (including ongoing sessions)
      const totalActiveHours = (timeLogsData || []).reduce((sum, log) => {
        if (!log.start_time) return sum;
        const start = new Date(log.start_time);
        const end = log.end_time ? new Date(log.end_time) : new Date(); // Use current time for ongoing sessions
        return sum + differenceInHours(end, start);
      }, 0);

      const avgActivity = screenshotsData && screenshotsData.length > 0 
        ? screenshotsData.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / screenshotsData.length
        : 0;

      const avgFocus = screenshotsData && screenshotsData.length > 0
        ? screenshotsData.reduce((sum, s) => sum + (s.focus_percent || 0), 0) / screenshotsData.length
        : 0;

      const uniqueApps = new Set((appsData || []).map(a => a.app_name).filter(Boolean)).size;
      const uniqueWebsites = new Set((urlsData || []).map(u => u.domain).filter(Boolean)).size;

      setDashboardData({
        totalUsers: usersData?.length || 0,
        totalActiveHours: Math.round(totalActiveHours),
        totalScreenshots: screenshotsData?.length || 0,
        totalAppsUsed: uniqueApps,
        totalWebsitesVisited: uniqueWebsites,
        avgActivityPercent: Math.round(avgActivity),
        avgFocusPercent: Math.round(avgFocus)
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchTimeSeriesData = async (start: Date, end: Date) => {
    try {
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const timeSeriesData: TimeData[] = [];

      for (let i = 0; i < days; i++) {
        const currentDay = new Date(start);
        currentDay.setDate(start.getDate() + i);
        const dayStart = startOfDay(currentDay);
        const dayEnd = endOfDay(currentDay);

        // Get time logs for this day (with filters)
        let timeLogsQuery = supabase
          .from('time_logs')
          .select('start_time, end_time, user_id, project_id')
          .gte('start_time', dayStart.toISOString())
          .lte('start_time', dayEnd.toISOString());
        
        if (selectedUser !== 'all') {
          timeLogsQuery = timeLogsQuery.eq('user_id', selectedUser);
        }
        if (selectedProject !== 'all') {
          timeLogsQuery = timeLogsQuery.eq('project_id', selectedProject);
        }
        
        const { data: timeLogsData } = await timeLogsQuery;

        // Get screenshots for this day (with filters)
        let screenshotsQuery = supabase
          .from('screenshots')
          .select('activity_percent, user_id, project_id')
          .gte('captured_at', dayStart.toISOString())
          .lte('captured_at', dayEnd.toISOString());
        
        if (selectedUser !== 'all') {
          screenshotsQuery = screenshotsQuery.eq('user_id', selectedUser);
        }
        if (selectedProject !== 'all') {
          screenshotsQuery = screenshotsQuery.eq('project_id', selectedProject);
        }
        
        const { data: screenshotsData } = await screenshotsQuery;

        const dayHours = (timeLogsData || []).reduce((sum, log) => {
          if (!log.start_time) return sum;
          const logStart = new Date(log.start_time);
          const logEnd = log.end_time ? new Date(log.end_time) : new Date(); // Use current time for ongoing sessions
          return sum + differenceInHours(logEnd, logStart);
        }, 0);

        const avgActivity = screenshotsData && screenshotsData.length > 0
          ? screenshotsData.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / screenshotsData.length
          : 0;

        timeSeriesData.push({
          date: format(currentDay, 'MMM dd'),
          hours: Math.round(dayHours * 10) / 10,
          screenshots: screenshotsData?.length || 0,
          activity: Math.round(avgActivity)
        });
      }

      setTimeData(timeSeriesData);
    } catch (error) {
      console.error('Error fetching time series data:', error);
    }
  };

  const fetchProjectBreakdown = async (start: Date, end: Date) => {
    try {
      let query = supabase
        .from('time_logs')
        .select(`
          start_time, 
          end_time, 
          user_id,
          project_id,
          projects!inner(name)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());
      
      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }
      
      const { data } = await query;

      const projectStats = (data || []).reduce((acc: any, log: any) => {
        const projectName = log.projects?.name || 'No Project';
        const logStart = new Date(log.start_time);
        const logEnd = log.end_time ? new Date(log.end_time) : new Date(); // Use current time for ongoing sessions
        const hours = differenceInHours(logEnd, logStart);
        
        if (!acc[projectName]) {
          acc[projectName] = { hours: 0, users: new Set() };
        }
        acc[projectName].hours += hours;
        acc[projectName].users.add(log.user_id);
        return acc;
      }, {});

      const totalHours = Object.values(projectStats).reduce((sum: number, proj: any) => sum + proj.hours, 0);

      const projectBreakdown: ProjectData[] = Object.entries(projectStats)
        .map(([name, stats]: [string, any]) => ({
          name,
          hours: Math.round(stats.hours * 10) / 10,
          percentage: totalHours > 0 ? Math.round((stats.hours / totalHours) * 100) : 0,
          users: stats.users.size
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 8);

      setProjectData(projectBreakdown);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setProjectData([]);
    }
  };

  const fetchUserProductivityData = async (start: Date, end: Date) => {
    try {
      let timeLogsQuery = supabase
        .from('time_logs')
        .select(`
          start_time, 
          end_time, 
          user_id,
          project_id,
          users!inner(full_name, email)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString());
      
      if (selectedUser !== 'all') {
        timeLogsQuery = timeLogsQuery.eq('user_id', selectedUser);
      }
      if (selectedProject !== 'all') {
        timeLogsQuery = timeLogsQuery.eq('project_id', selectedProject);
      }
      
      const { data: timeLogsData } = await timeLogsQuery;

      const userStats = (timeLogsData || []).reduce((acc: any, log: any) => {
        const userId = log.user_id;
        const userName = log.users?.full_name || log.users?.email || 'Unknown User';
        const logStart = new Date(log.start_time);
        const logEnd = log.end_time ? new Date(log.end_time) : new Date(); // Use current time for ongoing sessions
        const hours = differenceInHours(logEnd, logStart);
        
        if (!acc[userId]) {
          acc[userId] = { user_name: userName, hours: 0 };
        }
        acc[userId].hours += hours;
        return acc;
      }, {});

      // Get screenshots and activity data for each user
      const userProductivityData: UserProductivity[] = [];
      
      for (const [userId, userData] of Object.entries(userStats) as [string, any][]) {
        let screenshotsQuery = supabase
          .from('screenshots')
          .select('activity_percent')
          .eq('user_id', userId)
          .gte('captured_at', start.toISOString())
          .lte('captured_at', end.toISOString());
        
        if (selectedProject !== 'all') {
          screenshotsQuery = screenshotsQuery.eq('project_id', selectedProject);
        }
        
        const { data: screenshotsData } = await screenshotsQuery;

        let appsQuery = supabase
          .from('app_logs')
          .select('app_name')
          .eq('user_id', userId)
          .gte('timestamp', start.toISOString())
          .lte('timestamp', end.toISOString());
        
        const { data: appsData } = await appsQuery;

        const avgActivity = screenshotsData && screenshotsData.length > 0
          ? screenshotsData.reduce((sum, s) => sum + (s.activity_percent || 0), 0) / screenshotsData.length
          : 0;

        const uniqueApps = new Set((appsData || []).map(a => a.app_name).filter(Boolean)).size;

        userProductivityData.push({
          user_name: userData.user_name,
          total_hours: Math.round(userData.hours * 10) / 10,
          avg_activity: Math.round(avgActivity),
          screenshots_count: screenshotsData?.length || 0,
          apps_used: uniqueApps
        });
      }

      setUserProductivity(userProductivityData.sort((a, b) => b.total_hours - a.total_hours));
    } catch (error) {
      console.error('Error fetching user productivity data:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return { start: startOfDay(new Date(selectedDate)), end: endOfDay(new Date(selectedDate)) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7300'];

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Productivity Insights</h1>
            <p className="text-muted-foreground">Comprehensive overview of team productivity and engagement</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Data</div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAllData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Productivity Insights</h1>
          <p className="text-muted-foreground">Comprehensive overview of team productivity and engagement</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Specific Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={dateRange !== 'today'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User and Project Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {(selectedUser !== 'all' || selectedProject !== 'all') && (
              <div className="flex gap-2 ml-auto">
                {selectedUser !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    User: {users.find(u => u.id === selectedUser)?.name || 'Unknown'}
                  </Badge>
                )}
                {selectedProject !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Project: {projects.find(p => p.id === selectedProject)?.name || 'Unknown'}
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Select Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(selectedUser !== 'all' || selectedProject !== 'all') && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedUser('all');
                  setSelectedProject('all');
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.totalActiveHours}h</div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.avgActivityPercent}%</div>
                <div className="text-sm text-muted-foreground">Avg Activity</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.totalScreenshots}</div>
                <div className="text-sm text-muted-foreground">Screenshots</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity Trend</CardTitle>
            <CardDescription>Hours worked and activity levels over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : timeData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity data available for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="hours" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="activity" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Time Distribution</CardTitle>
            <CardDescription>Hours spent on different projects</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : projectData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No project data available for the selected period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {projectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} hours`, 'Time']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Productivity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Productivity Overview</CardTitle>
          <CardDescription>Individual performance metrics for all team members</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading user data...</div>
          ) : userProductivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No user productivity data available for the selected period.
            </div>
          ) : (
            <div className="space-y-3">
              {userProductivity.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{user.user_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.total_hours}h worked • {user.screenshots_count} screenshots • {user.apps_used} apps used
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold">{user.avg_activity}%</div>
                      <div className="text-xs text-muted-foreground">Activity</div>
                    </div>
                    <Badge variant={user.avg_activity > 70 ? 'default' : user.avg_activity > 40 ? 'secondary' : 'outline'}>
                      {user.avg_activity > 70 ? 'High' : user.avg_activity > 40 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.totalAppsUsed}</div>
                <div className="text-sm text-muted-foreground">Apps Used</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-pink-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.totalWebsitesVisited}</div>
                <div className="text-sm text-muted-foreground">Websites Visited</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.avgFocusPercent}%</div>
                <div className="text-sm text-muted-foreground">Avg Focus</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
