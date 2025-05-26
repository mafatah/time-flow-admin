
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe, PauseCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';

interface AppLog {
  id: string;
  app_name: string;
  window_title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_id: string;
  project_id: string | null;
}

interface UrlLog {
  id: string;
  site_url: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_id: string;
  project_id: string | null;
}

interface IdleLog {
  id: string;
  idle_start: string;
  idle_end: string | null;
  duration_minutes: number | null;
  user_id: string;
  project_id: string | null;
}

interface AnalyticsData {
  appLogs: AppLog[];
  urlLogs: UrlLog[];
  idleLogs: IdleLog[];
}

export default function AppsUrlsIdlePage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    appLogs: [],
    urlLogs: [],
    idleLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userDetails } = useAuth();

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch app logs
      const { data: appLogs, error: appLogsError } = await supabase
        .from('app_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (appLogsError) {
        console.error('Error fetching app logs:', appLogsError);
      }

      // Fetch URL logs
      const { data: urlLogs, error: urlLogsError } = await supabase
        .from('url_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);

      if (urlLogsError) {
        console.error('Error fetching URL logs:', urlLogsError);
      }

      // For now, we'll create mock idle logs since the table might not exist
      // Replace this with actual query once idle_logs table is created
      const mockIdleLogs: IdleLog[] = [];

      setAnalyticsData({
        appLogs: appLogs || [],
        urlLogs: urlLogs || [],
        idleLogs: mockIdleLogs
      });

    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userDetails) {
      fetchAnalyticsData();
    }
  }, [userDetails]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const formatDurationMinutes = (minutes: number | null) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-500">Error: {error}</p>
            <button 
              onClick={fetchAnalyticsData}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Apps, URLs & Idle Time Analytics</h1>
        <button 
          onClick={fetchAnalyticsData}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Refresh Data
        </button>
      </div>

      <Tabs defaultValue="apps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Applications ({analyticsData.appLogs.length})
          </TabsTrigger>
          <TabsTrigger value="urls" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            URLs ({analyticsData.urlLogs.length})
          </TabsTrigger>
          <TabsTrigger value="idle" className="flex items-center gap-2">
            <PauseCircle className="h-4 w-4" />
            Idle Time ({analyticsData.idleLogs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apps">
          <Card>
            <CardHeader>
              <CardTitle>Application Usage</CardTitle>
              <CardDescription>Recent application activity and usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.appLogs.length === 0 ? (
                  <p className="text-muted-foreground">No application logs found</p>
                ) : (
                  analyticsData.appLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{log.app_name}</h3>
                        <p className="text-sm text-muted-foreground">{log.window_title || 'No window title'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(log.duration_seconds)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls">
          <Card>
            <CardHeader>
              <CardTitle>URL Activity</CardTitle>
              <CardDescription>Recent website visits and browsing patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.urlLogs.length === 0 ? (
                  <p className="text-muted-foreground">No URL logs found</p>
                ) : (
                  analyticsData.urlLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{log.site_url}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.started_at).toLocaleString()}
                          {log.ended_at && ` - ${new Date(log.ended_at).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDuration(log.duration_seconds)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idle">
          <Card>
            <CardHeader>
              <CardTitle>Idle Time</CardTitle>
              <CardDescription>Periods of inactivity and idle time tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.idleLogs.length === 0 ? (
                  <p className="text-muted-foreground">No idle time logs found</p>
                ) : (
                  analyticsData.idleLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">Idle Period</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.idle_start).toLocaleString()}
                          {log.idle_end && ` - ${new Date(log.idle_end).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          <PauseCircle className="h-3 w-3 mr-1" />
                          {formatDurationMinutes(log.duration_minutes)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
