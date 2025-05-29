
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Camera, Activity, TrendingUp, Users, Clock } from 'lucide-react';

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

export default function InsightsPage() {
  const { userDetails } = useAuth();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchData();
    }
  }, [userDetails, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const [screenshotsRes, usersRes, projectsRes] = await Promise.all([
        supabase
          .from('screenshots')
          .select('*')
          .gte('captured_at', start.toISOString())
          .lte('captured_at', end.toISOString())
          .order('captured_at', { ascending: false }),
        supabase.from('users').select('id, full_name'),
        supabase.from('projects').select('id, name')
      ]);

      if (screenshotsRes.error) throw screenshotsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setScreenshots(screenshotsRes.data || []);
      setUsers(usersRes.data || []);
      setProjects(projectsRes.data || []);
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
          <Button onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading insights data...</div>
      ) : (
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
                Top Projects
              </CardTitle>
              <CardDescription>
                Distribution of time spent on different projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    isAnimationActive={false}
                    data={[
                      { name: 'Project A', value: 400 },
                      { name: 'Project B', value: 300 },
                      { name: 'Project C', value: 300 },
                      { name: 'Project D', value: 200 }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {/* Dummy data for now */}
                    {[...Array(4)].map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Recent Screenshots
          </CardTitle>
          <CardDescription>
            Latest screenshots captured from employee screens.
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
            screenshots.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-4">
                <img
                  src={s.file_url}
                  alt={`Screenshot at ${format(new Date(s.captured_at), 'MMM dd, yyyy HH:mm')}`}
                  className="w-full h-auto rounded-md"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium">
                    {format(new Date(s.captured_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">Activity: {s.activity_percent}%</Badge>
                    <Badge variant="secondary">Focus: {s.focus_percent}%</Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Screenshot Grid
          </CardTitle>
          <CardDescription>
            A grid view of recent screenshots for quick overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          {loading ? (
            <div className="text-center py-4">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No screenshots found for the selected period.
            </div>
          ) : (
            screenshots.map((s: any) => (
              <div key={s.id} className="relative group">
                <img
                  src={s.file_url}
                  alt={`Screenshot at ${format(new Date(s.captured_at), 'MMM dd, yyyy HH:mm')}`}
                  className="w-full h-auto rounded-md object-cover aspect-video"
                />
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-200 rounded-md flex items-center justify-center">
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
