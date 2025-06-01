import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Globe, Monitor, Clock, TrendingUp, Activity, Filter, Calendar } from 'lucide-react';

interface AppData {
  app_name: string;
  total_duration: number;
  total_sessions: number;
  avg_duration: number;
  category: string;
  percentage: number;
}

interface UrlData {
  domain: string;
  site_url: string;
  total_duration: number;
  total_visits: number;
  avg_duration: number;
  category: string;
  percentage: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function AppsUrlsPage() {
  const { userDetails } = useAuth();
  const [appData, setAppData] = useState<AppData[]>([]);
  const [urlData, setUrlData] = useState<UrlData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'apps' | 'urls'>('apps');

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
        .eq('role', 'employee')
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

      await Promise.all([
        fetchAppData(start, end),
        fetchUrlData(start, end)
      ]);
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
        .select('app_name, duration_seconds, category, timestamp')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .not('app_name', 'is', null);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process app data
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
        acc[appName].total_duration += log.duration_seconds || 0;
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

      setAppData(processedApps);
    } catch (error) {
      console.error('Error fetching app data:', error);
    }
  };

  const fetchUrlData = async (start: Date, end: Date) => {
    try {
      let query = supabase
        .from('url_logs')
        .select('domain, site_url, duration_seconds, category, timestamp, url, title')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .not('domain', 'is', null);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process URL data
      const urlStats = (data || []).reduce((acc: any, log: any) => {
        const domain = log.domain || 'Unknown Site';
        if (!acc[domain]) {
          acc[domain] = {
            domain: domain,
            site_url: log.site_url || log.url || '',
            total_duration: 0,
            total_visits: 0,
            category: log.category || 'Other'
          };
        }
        acc[domain].total_duration += log.duration_seconds || 0;
        acc[domain].total_visits += 1;
        return acc;
      }, {});

      const totalDuration = Object.values(urlStats).reduce((sum: number, url: any) => sum + url.total_duration, 0);

      const processedUrls: UrlData[] = Object.values(urlStats)
        .map((url: any) => ({
          ...url,
          avg_duration: url.total_visits > 0 ? Math.round(url.total_duration / url.total_visits) : 0,
          percentage: totalDuration > 0 ? Math.round((url.total_duration / totalDuration) * 100) : 0
        }))
        .sort((a: any, b: any) => b.total_duration - a.total_duration)
        .slice(0, 20); // Top 20 domains

      setUrlData(processedUrls);
    } catch (error) {
      console.error('Error fetching URL data:', error);
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

  const currentData = activeTab === 'apps' ? appData : urlData;
  const chartData = currentData.slice(0, 10).map((item: any, index: number) => ({
    name: activeTab === 'apps' ? item.app_name : item.domain,
    value: item.total_duration,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Apps & URLs Activity</h1>
          <p className="text-muted-foreground">Track application usage and website visits</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={activeTab === 'apps' ? 'default' : 'outline'}
            onClick={() => setActiveTab('apps')}
            size="sm"
          >
            <Monitor className="h-4 w-4 mr-1" />
            Apps
          </Button>
          <Button 
            variant={activeTab === 'urls' ? 'default' : 'outline'}
            onClick={() => setActiveTab('urls')}
            size="sm"
          >
            <Globe className="h-4 w-4 mr-1" />
            URLs
          </Button>
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
              {activeTab === 'apps' ? (
                <Monitor className="h-5 w-5 text-blue-500" />
              ) : (
                <Globe className="h-5 w-5 text-green-500" />
              )}
              <div>
                <div className="text-2xl font-bold">{currentData.length}</div>
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'apps' ? 'Applications' : 'Websites'}
                </div>
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
                  {formatDuration(currentData.reduce((sum, item) => sum + item.total_duration, 0))}
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
                  {activeTab === 'apps' 
                    ? (appData as AppData[]).reduce((sum, item) => sum + item.total_sessions, 0)
                    : (urlData as UrlData[]).reduce((sum, item) => sum + item.total_visits, 0)
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  {activeTab === 'apps' ? 'Sessions' : 'Visits'}
                </div>
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
                  {currentData.length > 0 ? formatDuration(Math.round(currentData.reduce((sum, item) => sum + item.avg_duration, 0) / currentData.length)) : '0m'}
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
            <CardTitle>
              Top {activeTab === 'apps' ? 'Applications' : 'Websites'} Usage
            </CardTitle>
            <CardDescription>
              Distribution of time spent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for the selected period.
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
            <CardDescription>
              Time spent per {activeTab === 'apps' ? 'application' : 'website'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading chart...</div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available for the selected period.
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
          <CardTitle>
            Detailed {activeTab === 'apps' ? 'Application' : 'Website'} Usage
          </CardTitle>
          <CardDescription>
            Complete breakdown of {activeTab === 'apps' ? 'application' : 'website'} activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading data...</div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {activeTab === 'apps' ? 'application' : 'website'} data found for the selected period.
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'apps' ? (
                (appData as AppData[]).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.app_name}
                      </div>
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
                ))
              ) : (
                (urlData as UrlData[]).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.domain}
                      </div>
                      {item.site_url && (
                        <div className="text-sm text-muted-foreground truncate max-w-md">
                          {item.site_url}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Total: {formatDuration(item.total_duration)}</span>
                        <span>Visits: {item.total_visits}</span>
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
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
