import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { format, subDays, startOfDay, endOfDay, differenceInSeconds } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Monitor, Clock, TrendingUp, Activity, Filter } from 'lucide-react';

interface AppData {
  app_name: string;
  total_duration: number;
  total_sessions: number;
  avg_duration: number;
  category: string;
  percentage: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

// Helper function to estimate duration
const estimateDuration = (startedAt: string, endedAt: string | null): number => {
  if (!startedAt) return 0;
  
  if (endedAt) {
    return differenceInSeconds(new Date(endedAt), new Date(startedAt));
  }
  
  // If no end time, estimate based on typical session length
  return 180; // 3 minutes default for apps
};

export default function AppActivityPage() {
  const { userDetails } = useAuth();
  const [appData, setAppData] = useState<AppData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dateRange, setDateRange] = useState('week');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchUsers();
      fetchData();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchData();
    }
  }, [dateRange, selectedUser, selectedDate, userDetails]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('role', ['employee', 'admin', 'manager'])
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

      // Disabled for performance: console.log('🔍 Fetching app data for range:', start, end, selectedUser);

      await fetchAppData(start, end);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppData = async (start: Date, end: Date) => {
    try {
      let query = supabase
        .from('app_logs')
        .select('app_name, started_at, ended_at, duration_seconds, category, timestamp, window_title')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .not('app_name', 'is', null);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log('📱 Raw app data:', data?.length, 'records');

      // Process app data with better duration handling
      const appStats = (data || []).reduce((acc: any, log: any) => {
        const appName = log.app_name || 'Unknown App';
        if (!acc[appName]) {
          acc[appName] = {
            app_name: appName,
            total_duration: 0,
            total_sessions: 0,
            category: log.category || 'Other'
          };
        }
        
        // Calculate duration from duration_seconds or estimate from timestamps
        let duration = log.duration_seconds;
        if (!duration || duration === 0) {
          duration = estimateDuration(log.started_at, log.ended_at);
        }
        
        acc[appName].total_duration += duration;
        acc[appName].total_sessions += 1;
        return acc;
      }, {});

      const totalDuration = Object.values(appStats).reduce((sum: number, app: any) => sum + app.total_duration, 0);

      const processedApps: AppData[] = Object.values(appStats)
        .map((app: any) => ({
          ...app,
          avg_duration: app.total_sessions > 0 ? Math.round(app.total_duration / app.total_sessions) : 0,
          percentage: totalDuration > 0 ? Math.round((app.total_duration / totalDuration) * 100) : 0
        }))
        .sort((a: any, b: any) => b.total_duration - a.total_duration)
        .slice(0, 20); // Top 20 apps

      console.log('📊 Processed app data:', processedApps.slice(0, 3));
      setAppData(processedApps);
    } catch (error) {
      console.error('Error fetching app data:', error);
      setAppData([]);
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
        return { start: startOfDay(new Date(selectedDate)), end: endOfDay(new Date(selectedDate)) };
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7300'];

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const chartData = appData.slice(0, 10).map((item: any, index: number) => ({
    name: item.app_name,
    value: item.total_duration,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Application Activity</h1>
          <p className="text-muted-foreground">Track application usage and performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
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
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{appData.length}</div>
                <div className="text-sm text-muted-foreground">Applications</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {formatDuration(appData.reduce((sum, item) => sum + item.total_duration, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {appData.reduce((sum, item) => sum + item.total_sessions, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Sessions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">
                  {appData.length > 0 ? formatDuration(Math.round(appData.reduce((sum, item) => sum + item.avg_duration, 0) / appData.length)) : '0m'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Top Applications Usage</CardTitle>
            <CardDescription>
              Distribution of time spent {appData.length > 0 ? `(${appData.length} total)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data available for the selected period.</p>
                <p className="text-xs mt-2">Try selecting "Last 7 days" - most data is from last week.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatDuration(value), 'Duration']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Time Distribution</CardTitle>
            <CardDescription>Time spent per application</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No data available for the selected period.</p>
                <p className="text-xs mt-2">Try selecting "Last 7 days" - most data is from last week.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip formatter={(value: number) => [formatDuration(value), 'Duration']} />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Application Usage</CardTitle>
          <CardDescription>Complete breakdown of application activity</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading data...</div>
          ) : appData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No application data found for the selected period.</p>
              <p className="text-xs mt-2">Try selecting "Last 7 days" to see historical data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appData.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium">{item.app_name}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Total: {formatDuration(item.total_duration)}</span>
                      <span>Sessions: {item.total_sessions}</span>
                      <span>Avg: {formatDuration(item.avg_duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold">{item.percentage}%</div>
                      <Progress value={item.percentage} className="w-20" />
                    </div>
                    {item.category && (
                      <Badge variant="secondary">{item.category}</Badge>
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