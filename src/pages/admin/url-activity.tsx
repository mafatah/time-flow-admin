import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download, Filter, Search, TrendingUp, Clock, Globe, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface URLLog {
  id: string;
  site_url: string;
  url?: string | null;
  title?: string | null;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  domain?: string | null;
  category?: string | null;
  browser?: string | null;
  users?: {
    full_name: string;
    email: string;
  } | null;
}

interface URLStats {
  totalTime: number;
  totalSites: number;
  topSites: Array<{ site: string; time: number; visits: number }>;
  categoryBreakdown: Array<{ category: string; time: number }>;
  userActivity: Array<{ user: string; time: number }>;
}

export default function URLActivity() {
  const [urlLogs, setUrlLogs] = useState<URLLog[]>([]);
  const [stats, setStats] = useState<URLStats>({
    totalTime: 0,
    totalSites: 0,
    topSites: [],
    categoryBreakdown: [],
    userActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    to: new Date()
  });
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  useEffect(() => {
    fetchUsers();
    fetchURLLogs();
  }, [dateRange, selectedUser]);

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

  const fetchURLLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('url_logs')
        .select(`
          id,
          site_url,
          url,
          title,
          user_id,
          started_at,
          ended_at,
          duration_seconds,
          domain,
          category,
          browser
        `)
        .gte('started_at', dateRange.from.toISOString())
        .lte('started_at', dateRange.to.toISOString())
        .order('started_at', { ascending: false });

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user details separately
      const userIds = [...new Set(data?.map(log => log.user_id) || [])];
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combine the data
      const logs: URLLog[] = (data || []).map(log => ({
        ...log,
        users: userData?.find(user => user.id === log.user_id) || null
      }));

      setUrlLogs(logs);

      // Calculate stats
      const totalTime = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
      const uniqueSites = new Set(logs.map(log => log.site_url)).size;

      // Top sites
      const siteStats = new Map<string, { time: number; visits: number }>();
      logs.forEach(log => {
        const site = log.site_url;
        const current = siteStats.get(site) || { time: 0, visits: 0 };
        siteStats.set(site, {
          time: current.time + (log.duration_seconds || 0),
          visits: current.visits + 1
        });
      });

      const topSites = Array.from(siteStats.entries())
        .map(([site, data]) => ({ site, ...data }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 10);

      // Category breakdown
      const categoryStats = new Map<string, number>();
      logs.forEach(log => {
        const category = log.category || 'Uncategorized';
        categoryStats.set(category, (categoryStats.get(category) || 0) + (log.duration_seconds || 0));
      });

      const categoryBreakdown = Array.from(categoryStats.entries())
        .map(([category, time]) => ({ category, time }))
        .sort((a, b) => b.time - a.time);

      // User activity
      const userStats = new Map<string, number>();
      logs.forEach(log => {
        const userName = log.users?.full_name || 'Unknown';
        userStats.set(userName, (userStats.get(userName) || 0) + (log.duration_seconds || 0));
      });

      const userActivity = Array.from(userStats.entries())
        .map(([user, time]) => ({ user, time }))
        .sort((a, b) => b.time - a.time);

      setStats({
        totalTime,
        totalSites: uniqueSites,
        topSites,
        categoryBreakdown,
        userActivity
      });

    } catch (error) {
      console.error('Error fetching URL logs:', error);
    } finally {
      setLoading(false);
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

  const exportData = () => {
    const csvContent = [
      ['User', 'Site', 'URL', 'Title', 'Started', 'Duration', 'Category'].join(','),
      ...urlLogs.map(log => [
        log.users?.full_name || 'Unknown',
        log.site_url,
        log.url || '',
        log.title || '',
        log.started_at,
        formatDuration(log.duration_seconds || 0),
        log.category || 'Uncategorized'
      ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-activity-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLogs = urlLogs.filter(log => 
    log.site_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.title && log.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.users?.full_name && log.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">URL Activity Monitoring</h1>
          <p className="text-muted-foreground">Monitor and analyze website usage across your team</p>
        </div>
        <Button onClick={exportData} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col space-y-2">
            <Label>Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Employee Filter</Label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-2 border border-input rounded-md"
            >
              <option value="">All Employees</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sites, titles, or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.totalTime)}</div>
            <p className="text-xs text-muted-foreground">
              Time spent on websites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSites}</div>
            <p className="text-xs text-muted-foreground">
              Different websites visited
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urlLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Website sessions recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userActivity.length}</div>
            <p className="text-xs text-muted-foreground">
              Users with recorded activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Websites by Time</CardTitle>
            <CardDescription>Most visited websites by total time spent</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topSites.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="site" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [formatDuration(value), 'Time Spent']}
                />
                <Bar dataKey="time" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Time distribution across website categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="time"
                  label={({ category, percent }: { category: string; percent: number }) => 
                    `${category} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatDuration(value), 'Time']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent URL Activity</CardTitle>
          <CardDescription>
            Latest website visits ({filteredLogs.length} of {urlLogs.length} sessions)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No URL activity found for the selected criteria.
                </p>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.site_url}</span>
                        {log.category && (
                          <Badge variant="secondary" className="text-xs">
                            {log.category}
                          </Badge>
                        )}
                      </div>
                      {log.title && (
                        <p className="text-sm text-muted-foreground mb-1">{log.title}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{log.users?.full_name || 'Unknown User'}</span>
                        <span>{format(new Date(log.started_at), 'PPp')}</span>
                        {log.browser && <span>{log.browser}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatDuration(log.duration_seconds || 0)}
                      </div>
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
