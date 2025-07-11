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
import { Globe, Clock, TrendingUp, Activity, Filter } from 'lucide-react';

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

// Helper function to extract domain from URL
const extractDomain = (url: string): string => {
  try {
    if (!url) return 'Unknown';
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url || 'Unknown';
  }
};

// Helper function to estimate duration
const estimateDuration = (startedAt: string, endedAt: string | null): number => {
  if (!startedAt) return 0;
  
  if (endedAt) {
    return differenceInSeconds(new Date(endedAt), new Date(startedAt));
  }
  
  // If no end time, estimate based on typical session length
  return 120; // 2 minutes default for URLs
};

export default function UrlActivityPage() {
  const { userDetails } = useAuth();
  const [urlData, setUrlData] = useState<UrlData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [showAllWebsites, setShowAllWebsites] = useState(false);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchUsers();
      fetchData();
      
      // Auto-refresh every 2 minutes to reduce server load  
      const interval = setInterval(() => {
        // Auto-refresh reduced frequency for performance
        fetchData();
      }, 120000);
      
      return () => clearInterval(interval);
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

      // Disabled for performance: console.log('🔍 Fetching URL data for range:', start, end, selectedUser);

      await fetchUrlData(start, end);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUrlData = async (start: Date, end: Date) => {
    try {
      let query = supabase
        .from('url_logs')
        .select('domain, site_url, started_at, ended_at, duration_seconds, category, timestamp, url, title, browser')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .not('site_url', 'is', null);

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      // Query details and raw data logging disabled for performance

      const { data, error } = await query;
      if (error) throw error;

      // Process URL data with better domain extraction and duration handling
      const urlStats = (data || []).reduce((acc: any, log: any) => {
        // Extract domain from site_url if domain is null
        const domain = log.domain || extractDomain(log.site_url);
        
        if (!acc[domain]) {
          acc[domain] = {
            domain: domain,
            site_url: log.site_url || log.url || '',
            total_duration: 0,
            total_visits: 0,
            category: log.category || 'Other'
          };
        }
        
        // Calculate duration from duration_seconds or estimate from timestamps
        let duration = log.duration_seconds;
        if (!duration || duration === 0) {
          duration = estimateDuration(log.started_at, log.ended_at);
        }
        
        acc[domain].total_duration += duration;
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
        .sort((a: any, b: any) => b.total_duration - a.total_duration);

      // Store all processed URLs (not limited to top 20)
      setUrlData(processedUrls);
    } catch (error) {
      console.error('❌ Error fetching URL data:', error);
      setUrlData([]);
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

  const chartData = urlData.slice(0, 10).map((item: any, index: number) => ({
    name: item.domain,
    value: item.total_duration,
    percentage: item.percentage,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
                  <div>
            <h1 className="text-3xl font-bold">URL Activity</h1>
            <p className="text-muted-foreground">
              Track website visits and browsing behavior 
              {urlData.length > 0 && (
                <span className="ml-2 text-sm font-medium text-blue-600">
                  ({urlData.length} unique websites found)
                </span>
              )}
            </p>
          </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setUrlData([]);
              fetchData();
            }}
            disabled={loading}
          >
            Clear Cache
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
              <Globe className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{urlData.length}</div>
                <div className="text-sm text-muted-foreground">
                  Websites ({dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'Last 7 days' : 'Last 30 days'})
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
                  {formatDuration(urlData.reduce((sum, item) => sum + item.total_duration, 0))}
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
                  {urlData.reduce((sum, item) => sum + item.total_visits, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Visits</div>
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
                  {urlData.length > 0 ? formatDuration(Math.round(urlData.reduce((sum, item) => sum + item.avg_duration, 0) / urlData.length)) : '0m'}
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
            <CardTitle>Top Websites Usage</CardTitle>
            <CardDescription>
              Distribution of time spent {urlData.length > 0 ? `(${urlData.length} total)` : ''}
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
            <CardDescription>Time spent per website</CardDescription>
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
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Website Usage</CardTitle>
          <CardDescription>
            Complete breakdown of website activity
            {urlData.length > 0 && (
              <span className="ml-2 text-sm">
                ({urlData.length} unique websites total)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading data...</div>
          ) : urlData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No website data found for the selected period.</p>
              <p className="text-xs mt-2">Try selecting "Last 7 days" to see historical data.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {(showAllWebsites ? urlData : urlData.slice(0, 20)).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium">{item.domain}</div>
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
                ))}
              </div>
              {urlData.length > 20 && (
                <div className="text-center mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAllWebsites(!showAllWebsites)}
                  >
                    {showAllWebsites 
                      ? `Show Top 20 Only` 
                      : `Show All ${urlData.length} Websites`
                    }
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}