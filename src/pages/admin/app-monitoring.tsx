import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, Clock, User, Monitor } from 'lucide-react';

interface AppLog {
  id: string;
  user_id: string;
  app_name: string;
  window_title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  category: string | null;
  project_id: string | null;
}

export default function AppMonitoring() {
  const [appLogs, setAppLogs] = useState<AppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchAppLogs();
  }, []);

  const fetchAppLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setAppLogs(data || []);
    } catch (error) {
      console.error('Error fetching app logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = appLogs.filter(log => {
    const matchesSearch = log.app_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.window_title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category?: string | null) => {
    switch (category) {
      case 'development':
        return 'bg-green-100 text-green-800';
      case 'communication':
        return 'bg-blue-100 text-blue-800';
      case 'browser':
        return 'bg-purple-100 text-purple-800';
      case 'entertainment':
        return 'bg-red-100 text-red-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTotalTimeByCategory = () => {
    const categoryTotals: { [key: string]: number } = {};
    filteredLogs.forEach(log => {
      const category = log.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (log.duration_seconds || 0);
    });
    return categoryTotals;
  };

  const getActivityStats = () => {
    const totalSessions = filteredLogs.length;
    const totalDuration = filteredLogs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const uniqueApps = new Set(filteredLogs.map(log => log.app_name)).size;

    return { totalSessions, totalDuration, avgDuration, uniqueApps };
  };

  const categoryTotals = getTotalTimeByCategory();
  const activityStats = getActivityStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">App Monitoring</h1>
          <p className="text-muted-foreground">Track employee application usage and activity</p>
        </div>
        <Button onClick={fetchAppLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">App usage sessions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(activityStats.totalDuration)}</div>
            <p className="text-xs text-muted-foreground">Total time tracked</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(Math.round(activityStats.avgDuration))}</div>
            <p className="text-xs text-muted-foreground">Average session length</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Apps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityStats.uniqueApps}</div>
            <p className="text-xs text-muted-foreground">Different applications used</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(categoryTotals).map(([category, totalSeconds]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalSeconds)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredLogs.filter(log => (log.category || 'other') === category).length} sessions
              </p>
            </CardContent>
          </Card>
        ))}
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
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search apps or windows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="browser">Browser</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* App Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Application Activity ({filteredLogs.length} records)
          </CardTitle>
          <CardDescription>
            Detailed view of employee application usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Window Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Project</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div className="font-mono text-sm">
                          {log.user_id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.app_name || 'Unknown App'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md truncate text-sm">
                        {log.window_title || 'Unknown Window'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(log.category)}>
                        {log.category || 'other'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <div>
                          <div>{format(new Date(log.started_at), 'MMM dd, HH:mm')}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(log.started_at), 'yyyy')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatDuration(log.duration_seconds)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {log.project_id ? `${log.project_id.slice(0, 8)}...` : 'No project'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No application activity found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
