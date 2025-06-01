import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Monitor, Globe, Clock, Activity, Filter } from "lucide-react";
import { useAuth } from '@/providers/auth-provider';

interface AppUsage {
  app_name: string;
  total_duration: number;
  session_count: number;
  category: string;
  user_id: string;
  user_name?: string;
}

interface UrlUsage {
  site_url: string;
  total_duration: number;
  visit_count: number;
  category: string;
  user_id: string;
  user_name?: string;
}

interface IdleTime {
  date: string;
  total_idle_minutes: number;
  idle_sessions: number;
  user_id: string;
  user_name?: string;
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AppsUrlsIdle() {
  const { userDetails } = useAuth();
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [urlUsage, setUrlUsage] = useState<UrlUsage[]>([]);
  const [idleTime, setIdleTime] = useState<IdleTime[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState('week');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchUsers();
      fetchProjects();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchAnalyticsData();
    }
  }, [userDetails, dateRange, selectedUser, selectedProject]);

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
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
    }
  };

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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();

      // Fetch users data first to create a lookup map
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email');

      if (usersError) {
        console.error('Error fetching users for lookup:', usersError);
        setError('Failed to fetch user data');
        return;
      }

      // Create user lookup map
      const userLookup = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user.full_name || user.email || 'Unknown User';
        return acc;
      }, {} as Record<string, string>);

      // Fetch app logs without join
      let appQuery = supabase
        .from('app_logs')
        .select('*')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      if (selectedUser !== 'all') {
        appQuery = appQuery.eq('user_id', selectedUser);
      }

      const { data: appLogs, error: appError } = await appQuery;

      if (appError) {
        console.error('Error fetching app logs:', appError);
        setError('Failed to fetch app usage data');
      } else {
        processAppUsage(appLogs || [], userLookup);
      }

      // Fetch URL logs without join
      let urlQuery = supabase
        .from('url_logs')
        .select('*')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      if (selectedUser !== 'all') {
        urlQuery = urlQuery.eq('user_id', selectedUser);
      }

      const { data: urlLogs, error: urlError } = await urlQuery;

      if (urlError) {
        console.error('Error fetching URL logs:', urlError);
        setError('Failed to fetch URL usage data');
      } else {
        processUrlUsage(urlLogs || [], userLookup);
      }

      // Fetch idle logs without join - make this optional
      try {
        let idleQuery = supabase
          .from('idle_logs')
          .select('*')
          .gte('idle_start', start.toISOString())
          .lte('idle_start', end.toISOString());

        if (selectedUser !== 'all') {
          idleQuery = idleQuery.eq('user_id', selectedUser);
        }

        const { data: idleLogs, error: idleError } = await idleQuery;

        if (idleError) {
          console.error('Error fetching idle logs:', idleError);
          setIdleTime([]);
        } else {
          processIdleTime(idleLogs || [], userLookup);
        }
      } catch (err) {
        console.error('Idle logs table not accessible:', err);
        setIdleTime([]);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAppUsage = (logs: any[], userLookup: Record<string, string>) => {
    const appData: { [key: string]: { duration: number; count: number; category: string; user_id: string; user_name: string } } = {};
    
    logs.forEach(log => {
      const duration = log.duration_seconds || 0;
      const key = `${log.app_name}_${log.user_id}`;
      if (!appData[key]) {
        appData[key] = { 
          duration: 0, 
          count: 0, 
          category: log.category || 'other',
          user_id: log.user_id,
          user_name: userLookup[log.user_id] || 'Unknown User'
        };
      }
      appData[key].duration += duration;
      appData[key].count += 1;
    });

    const processed = Object.entries(appData)
      .map(([key, data]) => {
        const appName = key.split('_')[0];
        return {
          app_name: appName,
          total_duration: Math.round(data.duration / 60), // Convert to minutes
          session_count: data.count,
          category: data.category,
          user_id: data.user_id,
          user_name: data.user_name
        };
      })
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 10);

    setAppUsage(processed);
  };

  const processUrlUsage = (logs: any[], userLookup: Record<string, string>) => {
    const urlData: { [key: string]: { duration: number; count: number; category: string; user_id: string; user_name: string } } = {};
    
    logs.forEach(log => {
      try {
        const duration = log.duration_seconds || 0;
        let domain = 'unknown-domain';
        
        // Safely extract domain from URL
        try {
          if (log.site_url && typeof log.site_url === 'string') {
            // Check if URL has protocol
            const urlWithProtocol = log.site_url.startsWith('http') ? log.site_url : `https://${log.site_url}`;
            domain = new URL(urlWithProtocol).hostname;
          }
        } catch (urlError) {
          console.warn('Invalid URL encountered:', log.site_url);
          domain = log.site_url || 'unknown-domain';
        }
        
        const key = `${domain}_${log.user_id}`;
        
        if (!urlData[key]) {
          urlData[key] = { 
            duration: 0, 
            count: 0, 
            category: log.category || 'other',
            user_id: log.user_id,
            user_name: userLookup[log.user_id] || 'Unknown User'
          };
        }
        urlData[key].duration += duration;
        urlData[key].count += 1;
      } catch (error) {
        console.warn('Error processing URL log:', error, log);
      }
    });

    const processed = Object.entries(urlData)
      .map(([key, data]) => {
        const domain = key.split('_')[0];
        return {
          site_url: domain,
          total_duration: Math.round(data.duration / 60), // Convert to minutes
          visit_count: data.count,
          category: data.category,
          user_id: data.user_id,
          user_name: data.user_name
        };
      })
      .filter(item => item.total_duration > 0) // Filter out zero duration items
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 10);

    setUrlUsage(processed);
  };

  const processIdleTime = (logs: any[], userLookup: Record<string, string>) => {
    const idleData: { [key: string]: { minutes: number; sessions: number; user_id: string; user_name: string } } = {};
    
    logs.forEach(log => {
      const date = format(new Date(log.idle_start), 'yyyy-MM-dd');
      const duration = log.duration_minutes || 0;
      const key = `${date}_${log.user_id}`;
      
      if (!idleData[key]) {
        idleData[key] = { 
          minutes: 0, 
          sessions: 0,
          user_id: log.user_id,
          user_name: userLookup[log.user_id] || 'Unknown User'
        };
      }
      idleData[key].minutes += duration;
      idleData[key].sessions += 1;
    });

    const processed = Object.entries(idleData)
      .map(([key, data]) => {
        const date = key.split('_')[0];
        return {
          date,
          total_idle_minutes: data.minutes,
          idle_sessions: data.sessions,
          user_id: data.user_id,
          user_name: data.user_name
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    setIdleTime(processed);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'development': 'bg-blue-500',
      'communication': 'bg-green-500',
      'entertainment': 'bg-purple-500',
      'research': 'bg-yellow-500',
      'social': 'bg-pink-500',
      'system': 'bg-gray-500',
      'other': 'bg-gray-400'
    };
    return colors[category] || colors['other'];
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Apps, URLs & Idle Time</h1>
          <p className="text-gray-600">Detailed analysis of application usage, website visits, and idle periods</p>
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
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select User" />
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
          <Button onClick={fetchAnalyticsData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Active Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Date Range:</span> {
                dateRange === 'today' ? 'Today' :
                dateRange === 'week' ? 'Last 7 days' :
                dateRange === 'month' ? 'Last 30 days' : 'Unknown'
              }
            </div>
            <div>
              <span className="font-medium">User:</span> {
                selectedUser === 'all' ? 'All Users' : 
                users.find(u => u.id === selectedUser)?.full_name || 
                users.find(u => u.id === selectedUser)?.email || 'Unknown User'
              }
            </div>
            {appUsage.length > 0 && (
              <div>
                <span className="font-medium">Results:</span> {appUsage.length} apps, {urlUsage.length} websites, {idleTime.length} idle periods
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="apps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="urls">Websites</TabsTrigger>
          <TabsTrigger value="idle">Idle Time</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Top Applications (Last 7 Days)
                </CardTitle>
                <CardDescription>Most used applications by time spent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={appUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="app_name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} minutes`, 'Duration']} />
                    <Bar dataKey="total_duration" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
                <CardDescription>Usage statistics and categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appUsage.slice(0, 8).map((app, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{app.app_name}</span>
                          <Badge variant="outline" className={getCategoryColor(app.category)}>
                            {app.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <span>{app.session_count} sessions</span>
                          {selectedUser === 'all' && (
                            <>
                              <span>•</span>
                              <span>{app.user_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{app.total_duration} min</div>
                        <div className="text-sm text-gray-500">
                          {Math.round(app.total_duration / app.session_count)} min/session
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="urls" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Top Websites (Last 7 Days)
                </CardTitle>
                <CardDescription>Most visited websites by time spent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={urlUsage.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ site_url, percent }) => `${site_url.slice(0, 15)}... ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total_duration"
                    >
                      {urlUsage.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} minutes`, 'Duration']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Details</CardTitle>
                <CardDescription>Visit statistics and categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {urlUsage.slice(0, 8).map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{url.site_url}</span>
                          <Badge variant="outline" className={getCategoryColor(url.category)}>
                            {url.category}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <span>{url.visit_count} visits</span>
                          {selectedUser === 'all' && (
                            <>
                              <span>•</span>
                              <span>{url.user_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{url.total_duration} min</div>
                        <div className="text-sm text-gray-500">
                          {Math.round(url.total_duration / url.visit_count)} min/visit
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="idle" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Daily Idle Time
                </CardTitle>
                <CardDescription>Idle periods tracked over the last week</CardDescription>
              </CardHeader>
              <CardContent>
                {idleTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={idleTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                        formatter={(value) => [`${value} minutes`, 'Idle Time']}
                      />
                      <Bar dataKey="total_idle_minutes" fill="#ff7300" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No idle time data available</p>
                      <p className="text-sm">Idle tracking may not be enabled</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {idleTime.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Idle Time Summary</CardTitle>
                  <CardDescription>Breakdown of idle periods</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {idleTime.map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {format(new Date(day.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <span>{day.idle_sessions} idle sessions</span>
                            {selectedUser === 'all' && (
                              <>
                                <span>•</span>
                                <span>{day.user_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{day.total_idle_minutes} min</div>
                          <div className="text-sm text-gray-500">
                            {Math.round(day.total_idle_minutes / day.idle_sessions)} min/session
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
