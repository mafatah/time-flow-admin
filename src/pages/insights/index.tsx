import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Camera, Activity, TrendingUp, Users, Clock, X, ZoomIn } from 'lucide-react';

interface Screenshot {
  id: string;
  user_id: string;
  project_id: string;
  captured_at: string;
  file_url: string;
  activity_percent: number;
  focus_percent: number;
}

interface User {
  id: string;
  full_name: string;
}

interface Project {
  id: string;
  name: string;
}

interface TimeLogData {
  date: string;
  hours: number;
  project_name: string;
  user_name: string;
}

export default function InsightsPage() {
  const { userDetails } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [timeLogData, setTimeLogData] = useState<TimeLogData[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [selectedUser, setSelectedUser] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchUsers();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchData();
    }
  }, [userDetails, dateRange, selectedUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Build screenshot query with user filter
      let screenshotQuery = supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', start.toISOString())
        .lte('captured_at', end.toISOString())
        .order('captured_at', { ascending: false });

      if (selectedUser !== 'all') {
        screenshotQuery = screenshotQuery.eq('user_id', selectedUser);
      }

      // Build time logs query with user filter
      let timeLogsQuery = supabase
        .from('time_logs')
        .select(`
          *,
          users!inner(id, full_name, email),
          projects!inner(id, name)
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: false });

      if (selectedUser !== 'all') {
        timeLogsQuery = timeLogsQuery.eq('user_id', selectedUser);
      }

      const [screenshotsRes, projectsRes, timeLogsRes] = await Promise.all([
        screenshotQuery,
        supabase.from('projects').select('id, name'),
        timeLogsQuery
      ]);

      if (screenshotsRes.error) throw screenshotsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (timeLogsRes.error) throw timeLogsRes.error;

      // Map screenshots to match our interface
      const mappedScreenshots: Screenshot[] = (screenshotsRes.data || []).map((screenshot: any) => ({
        id: screenshot.id,
        user_id: screenshot.user_id || '', // Handle null user_id
        project_id: screenshot.project_id || '',
        captured_at: screenshot.captured_at,
        file_url: screenshot.image_url, // Map image_url to file_url
        activity_percent: screenshot.activity_percent || 0,
        focus_percent: screenshot.focus_percent || 0
      }));

      // Process time logs for breakdown chart
      const processedTimeLogs: TimeLogData[] = (timeLogsRes.data || []).map((log: any) => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        return {
          date: format(startTime, 'yyyy-MM-dd'),
          hours: Math.max(0, hours),
          project_name: log.projects?.name || 'Unknown Project',
          user_name: log.users?.full_name || log.users?.email || 'Unknown User'
        };
      });

      setScreenshots(mappedScreenshots);
      setProjects(projectsRes.data || []);
      setTimeLogData(processedTimeLogs);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const openScreenshotModal = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setIsModalOpen(true);
  };

  const closeScreenshotModal = () => {
    setSelectedScreenshot(null);
    setIsModalOpen(false);
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const productivityData = screenshots.map((screenshot: any) => ({
    time: format(new Date(screenshot.captured_at), 'HH:mm'),
    activity: screenshot.activity_percent || 0,
    focus: screenshot.focus_percent || 0
  }));

  const hourlyActivity = screenshots.reduce((acc: any, screenshot: any) => {
    const hour = format(new Date(screenshot.captured_at), 'HH:00');
    if (!acc[hour]) {
      acc[hour] = { hour, total: 0, count: 0 };
    }
    acc[hour].total += screenshot.activity_percent || 0;
    acc[hour].count += 1;
    return acc;
  }, {});

  const hourlyActivityData = Object.values(hourlyActivity).map((item: any) => ({
    hour: item.hour,
    average: item.total / item.count
  }));

  // Process time breakdown data by date
  const timeBreakdownData = timeLogData.reduce((acc: any, log) => {
    if (!acc[log.date]) {
      acc[log.date] = { date: log.date, totalHours: 0, projects: {} };
    }
    acc[log.date].totalHours += log.hours;
    if (!acc[log.date].projects[log.project_name]) {
      acc[log.date].projects[log.project_name] = 0;
    }
    acc[log.date].projects[log.project_name] += log.hours;
    return acc;
  }, {});

  const chartData = Object.values(timeBreakdownData).map((item: any) => ({
    date: format(new Date(item.date), 'MMM dd'),
    hours: Math.round(item.totalHours * 100) / 100 // Round to 2 decimal places
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Insights Dashboard</h1>
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
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading insights data...</div>
      ) : (
        <div className="space-y-6">
          {/* Time Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Breakdown
              </CardTitle>
              <CardDescription>
                Daily time tracking breakdown for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                    <Bar dataKey="hours" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No time tracking data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Productivity Overview
                </CardTitle>
                <CardDescription>
                  Visual representation of activity and focus levels over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="activity" stroke="#8884d8" name="Activity" />
                    <Line type="monotone" dataKey="focus" stroke="#82ca9d" name="Focus" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Hourly Activity
                </CardTitle>
                <CardDescription>
                  Average activity levels for each hour of the day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#a3a3a3" name="Average Activity" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Project Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of time spent on different projects.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      dataKey="hours"
                      isAnimationActive={false}
                      data={Object.entries(
                        timeLogData.reduce((acc: any, log) => {
                          if (!acc[log.project_name]) {
                            acc[log.project_name] = 0;
                          }
                          acc[log.project_name] += log.hours;
                          return acc;
                        }, {})
                      ).map(([name, hours]) => ({ name, hours: Math.round(hours as number * 100) / 100 }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {Object.keys(timeLogData.reduce((acc: any, log) => {
                        acc[log.project_name] = true;
                        return acc;
                      }, {})).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}h`, 'Hours']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Recent Screenshots
          </CardTitle>
          <CardDescription>
            Latest screenshots captured from employee screens. Click to view in detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="text-center py-4">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No screenshots found for the selected period.
            </div>
          ) : (
            screenshots.map((screenshot) => (
              <div 
                key={screenshot.id} 
                className="border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openScreenshotModal(screenshot)}
              >
                <div className="relative group">
                  <img
                    src={screenshot.file_url}
                    alt={`Screenshot at ${format(new Date(screenshot.captured_at), 'MMM dd, yyyy HH:mm')}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200 rounded-md flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">
                    {format(new Date(screenshot.captured_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Activity: {screenshot.activity_percent}%</Badge>
                    <Badge variant="secondary">Focus: {screenshot.focus_percent}%</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Screenshot Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Screenshot Details</span>
              <Button variant="ghost" size="sm" onClick={closeScreenshotModal}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="space-y-4">
              <img
                src={selectedScreenshot.file_url}
                alt={`Screenshot at ${format(new Date(selectedScreenshot.captured_at), 'MMM dd, yyyy HH:mm:ss')}`}
                className="w-full h-auto rounded-lg"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Captured:</span>
                  <p className="text-muted-foreground">
                    {format(new Date(selectedScreenshot.captured_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Activity:</span>
                  <p className="text-muted-foreground">{selectedScreenshot.activity_percent}%</p>
                </div>
                <div>
                  <span className="font-medium">Focus:</span>
                  <p className="text-muted-foreground">{selectedScreenshot.focus_percent}%</p>
                </div>
                <div>
                  <span className="font-medium">User:</span>
                  <p className="text-muted-foreground">
                    {users.find(u => u.id === selectedScreenshot.user_id)?.full_name || 'Unknown User'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
