
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from "date-fns";
import { Monitor, Globe, Clock, Activity } from "lucide-react";

interface AppUsage {
  app_name: string;
  total_duration: number;
  session_count: number;
  category: string;
}

interface UrlUsage {
  site_url: string;
  total_duration: number;
  visit_count: number;
  category: string;
}

interface IdleTime {
  date: string;
  total_idle_minutes: number;
  idle_sessions: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AppsUrlsIdle() {
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [urlUsage, setUrlUsage] = useState<UrlUsage[]>([]);
  const [idleTime, setIdleTime] = useState<IdleTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch app logs
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('*')
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (appError) {
        console.error('Error fetching app logs:', appError);
        setError('Failed to fetch app usage data');
      } else {
        processAppUsage(appLogs || []);
      }

      // Fetch URL logs
      const { data: urlLogs, error: urlError } = await supabase
        .from('url_logs')
        .select('*')
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (urlError) {
        console.error('Error fetching URL logs:', urlError);
        setError('Failed to fetch URL usage data');
      } else {
        processUrlUsage(urlLogs || []);
      }

      // Fetch idle logs with error handling
      try {
        const { data: idleLogs, error: idleError } = await supabase
          .from('idle_logs')
          .select('*')
          .gte('idle_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        if (idleError) {
          console.error('Error fetching idle logs:', idleError);
          // Don't set error state for idle logs as it's not critical
          setIdleTime([]);
        } else {
          processIdleTime(idleLogs || []);
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

  const processAppUsage = (logs: any[]) => {
    const appData: { [key: string]: { duration: number; count: number; category: string } } = {};
    
    logs.forEach(log => {
      const duration = log.duration_seconds || 0;
      if (!appData[log.app_name]) {
        appData[log.app_name] = { 
          duration: 0, 
          count: 0, 
          category: log.category || 'other' 
        };
      }
      appData[log.app_name].duration += duration;
      appData[log.app_name].count += 1;
    });

    const processed = Object.entries(appData)
      .map(([app, data]) => ({
        app_name: app,
        total_duration: Math.round(data.duration / 60), // Convert to minutes
        session_count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 10);

    setAppUsage(processed);
  };

  const processUrlUsage = (logs: any[]) => {
    const urlData: { [key: string]: { duration: number; count: number; category: string } } = {};
    
    logs.forEach(log => {
      const duration = log.duration_seconds || 0;
      const domain = new URL(log.site_url).hostname;
      
      if (!urlData[domain]) {
        urlData[domain] = { 
          duration: 0, 
          count: 0, 
          category: log.category || 'other' 
        };
      }
      urlData[domain].duration += duration;
      urlData[domain].count += 1;
    });

    const processed = Object.entries(urlData)
      .map(([url, data]) => ({
        site_url: url,
        total_duration: Math.round(data.duration / 60), // Convert to minutes
        visit_count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, 10);

    setUrlUsage(processed);
  };

  const processIdleTime = (logs: any[]) => {
    const idleData: { [key: string]: { minutes: number; sessions: number } } = {};
    
    logs.forEach(log => {
      const date = format(new Date(log.idle_start), 'yyyy-MM-dd');
      const duration = log.duration_minutes || 0;
      
      if (!idleData[date]) {
        idleData[date] = { minutes: 0, sessions: 0 };
      }
      idleData[date].minutes += duration;
      idleData[date].sessions += 1;
    });

    const processed = Object.entries(idleData)
      .map(([date, data]) => ({
        date,
        total_idle_minutes: data.minutes,
        idle_sessions: data.sessions
      }))
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
      </div>

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
                        <div className="text-sm text-gray-600">
                          {app.session_count} sessions
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
                        <div className="text-sm text-gray-600">
                          {url.visit_count} visits
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
                          <div className="text-sm text-gray-600">
                            {day.idle_sessions} idle sessions
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
