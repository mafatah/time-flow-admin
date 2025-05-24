
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Screenshot {
  id: string;
  user_id: string;
  task_id: string | null;
  image_url: string;
  captured_at: string;
  activity_percent: number | null;
  focus_percent: number | null;
  classification: string | null;
  users: { full_name: string } | null;
  tasks: { name: string; projects: { name: string } } | null;
}

interface AppLog {
  id: string;
  user_id: string;
  app_name: string;
  window_title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  category: string | null;
  users: { full_name: string } | null;
}

interface UrlLog {
  id: string;
  user_id: string;
  site_url: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  category: string | null;
  users: { full_name: string } | null;
}

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  const { data: screenshots, isLoading: screenshotsLoading } = useQuery({
    queryKey: ['screenshots'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('screenshots')
          .select(`
            id,
            user_id,
            task_id,
            image_url,
            captured_at,
            activity_percent,
            focus_percent,
            classification
          `)
          .order('captured_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Transform data to match expected interface
        return (data || []).map(item => ({
          ...item,
          users: { full_name: 'Unknown User' },
          tasks: null
        })) as Screenshot[];
      } catch (error) {
        console.error('Error fetching screenshots:', error);
        return [] as Screenshot[];
      }
    }
  });

  const { data: appLogs, isLoading: appLogsLoading } = useQuery({
    queryKey: ['app-logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('app_logs' as any)
          .select(`
            id,
            user_id,
            app_name,
            window_title,
            started_at,
            ended_at,
            duration_seconds,
            category
          `)
          .order('started_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.error('Error fetching app logs:', error);
          return [] as AppLog[];
        }
        
        return (data || []).map(item => ({
          ...item,
          users: { full_name: 'Unknown User' }
        })) as AppLog[];
      } catch (error) {
        console.error('Error fetching app logs:', error);
        return [] as AppLog[];
      }
    }
  });

  const { data: urlLogs, isLoading: urlLogsLoading } = useQuery({
    queryKey: ['url-logs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('url_logs' as any)
          .select(`
            id,
            user_id,
            site_url,
            started_at,
            ended_at,
            duration_seconds,
            category
          `)
          .order('started_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.error('Error fetching URL logs:', error);
          return [] as UrlLog[];
        }
        
        return (data || []).map(item => ({
          ...item,
          users: { full_name: 'Unknown User' }
        })) as UrlLog[];
      } catch (error) {
        console.error('Error fetching URL logs:', error);
        return [] as UrlLog[];
      }
    }
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Activity Monitoring</h1>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="productive">Productive</SelectItem>
            <SelectItem value="unproductive">Unproductive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="screenshots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="urls">Websites</TabsTrigger>
        </TabsList>

        <TabsContent value="screenshots">
          <Card>
            <CardHeader>
              <CardTitle>Screenshot Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {screenshotsLoading ? (
                <div>Loading screenshots...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {screenshots?.map((screenshot) => (
                    <div key={screenshot.id} className="border rounded-lg overflow-hidden">
                      <img
                        src={screenshot.image_url}
                        alt="Activity screenshot"
                        className="w-full h-32 object-cover"
                      />
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {screenshot.users?.full_name || 'Unknown User'}
                          </span>
                          {screenshot.activity_percent && (
                            <Badge variant={screenshot.activity_percent > 70 ? 'default' : 'secondary'}>
                              {screenshot.activity_percent}% active
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(screenshot.captured_at), 'MMM d, HH:mm')}
                        </div>
                        {screenshot.tasks && (
                          <div className="text-xs">
                            <span className="font-medium">{screenshot.tasks.projects.name}</span>
                            <span className="text-muted-foreground"> • {screenshot.tasks.name}</span>
                          </div>
                        )}
                        {screenshot.classification && (
                          <Badge variant={screenshot.classification === 'core' ? 'default' : 'outline'}>
                            {screenshot.classification}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!screenshots || screenshots.length === 0) && (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                      No screenshots found
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps">
          <Card>
            <CardHeader>
              <CardTitle>Application Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {appLogsLoading ? (
                <div>Loading app logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Window Title</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.users?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>{log.app_name}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.window_title || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(log.started_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell>{formatDuration(log.duration_seconds)}</TableCell>
                        <TableCell>
                          {log.category && (
                            <Badge variant={log.category === 'productive' ? 'default' : 'secondary'}>
                              {log.category}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!appLogs || appLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No application logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls">
          <Card>
            <CardHeader>
              <CardTitle>Website Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {urlLogsLoading ? (
                <div>Loading URL logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urlLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.users?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.site_url}</TableCell>
                        <TableCell>{format(new Date(log.started_at), 'MMM d, HH:mm')}</TableCell>
                        <TableCell>{formatDuration(log.duration_seconds)}</TableCell>
                        <TableCell>
                          {log.category && (
                            <Badge variant={log.category === 'work' ? 'default' : 'secondary'}>
                              {log.category}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!urlLogs || urlLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No website logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
