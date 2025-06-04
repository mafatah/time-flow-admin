import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/providers/auth-provider';
import { format, differenceInMinutes, startOfDay, endOfDay } from 'date-fns';
import { Clock, Calendar, Download, Filter, Search, Play, Square, RefreshCw, AlertCircle, Database, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimeLog {
  id: string;
  user_id: string;
  project_id: string | null;
  start_time: string;
  end_time: string | null;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface Project {
  id: string;
  name: string;
}

interface DebugInfo {
  totalLogsInDb: number | null;
  todayLogsCount: number | null;
  todayLogs?: any[];
  recentLogs?: any[];
  allLogs?: any[];
  currentFilter: string;
  dateRange?: { start: Date; end: Date } | null;
  filteredLogsCount: number;
  currentTimezone: string;
  nowLocal: string;
  nowUTC: string;
  error?: string;
}

export default function TimeLogs() {
  const { userDetails } = useAuth();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchTimeLogs();
      fetchUsers();
      fetchProjects();
      
      // Auto-refresh every 30 seconds to show real-time updates
      const interval = setInterval(fetchTimeLogs, 30000);
      return () => clearInterval(interval);
    }
  }, [userDetails]);

  // Refetch when date filter changes
  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchTimeLogs();
    }
  }, [dateFilter]);

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 Fetching time logs with filter:', dateFilter);
      
      // First, check total logs in database
      const { count: totalCount } = await supabase
        .from('time_logs')
        .select('*', { count: 'exact', head: true });
      
      // Check today's logs specifically
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      
      const { data: todayLogs, count: todayCount } = await supabase
        .from('time_logs')
        .select('*', { count: 'exact' })
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString());
      
      // Check recent logs (last 24 hours)
      const { data: recentLogs } = await supabase
        .from('time_logs')
        .select('*')
        .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: false })
        .limit(5);

      // Check ALL logs to see what exists
      const { data: allLogs } = await supabase
        .from('time_logs')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(10);

      let query = supabase
        .from('time_logs')
        .select('*')
        .order('start_time', { ascending: false });

      // Apply date filter at database level for better performance
      if (dateFilter !== 'all') {
        const range = getDateFilterRange();
        if (range) {
          console.log('📅 Date range filter:', {
            start: range.start.toISOString(),
            end: range.end.toISOString(),
            filter: dateFilter
          });
          query = query
            .gte('start_time', range.start.toISOString())
            .lte('start_time', range.end.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Set debug information
      setDebugInfo({
        totalLogsInDb: totalCount,
        todayLogsCount: todayCount,
        todayLogs: todayLogs?.slice(0, 3), // First 3 for preview
        recentLogs: recentLogs?.slice(0, 3), // First 3 for preview
        allLogs: allLogs?.slice(0, 5), // First 5 for preview
        currentFilter: dateFilter,
        dateRange: dateFilter !== 'all' ? getDateFilterRange() : null,
        filteredLogsCount: data?.length || 0,
        currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        nowLocal: new Date().toISOString(),
        nowUTC: new Date().toUTCString()
      });
      
      console.log('📊 Debug info:', {
        totalLogsInDb: totalCount,
        todayLogsCount: todayCount,
        filteredLogsCount: data?.length || 0,
        dateFilter
      });
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching time logs:', error);
      setDebugInfo((prevDebug: DebugInfo | null) => {
        const baseDebug: DebugInfo = prevDebug || {
          totalLogsInDb: null,
          todayLogsCount: null,
          currentFilter: dateFilter,
          filteredLogsCount: 0,
          currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          nowLocal: new Date().toISOString(),
          nowUTC: new Date().toUTCString()
        };
        
        return {
          ...baseDebug,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name');

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
        .select('id, name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const getDateFilterRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);
        return { start: startOfDay(weekStart), end: endOfDay(now) };
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(monthStart.getDate() - 30);
        return { start: startOfDay(monthStart), end: endOfDay(now) };
      default:
        return null;
    }
  };

  const filteredLogs = logs.filter((log: any) => {
    const user = users.find((u: any) => u.id === log.user_id);
    const project = projects.find((p: any) => p.id === log.project_id);
    
    // Apply user filter
    if (userFilter !== 'all' && log.user_id !== userFilter) return false;
    
    // Apply project filter
    if (projectFilter !== 'all' && log.project_id !== projectFilter) return false;
    
    // Apply search term
    if (searchTerm) {
      const userMatch = user && (
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const projectMatch = project && project.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return userMatch || projectMatch;
    }
    
    return true;
  });

  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'In progress';
    const minutes = differenceInMinutes(new Date(endTime), new Date(startTime));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getActiveSessions = () => {
    return filteredLogs.filter(log => !log.end_time);
  };

  const getCompletedSessions = () => {
    return filteredLogs.filter(log => log.end_time);
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const activeSessions = getActiveSessions();
  const completedSessions = getCompletedSessions();

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Logs</h1>
          <p className="text-muted-foreground">View and manage employee time tracking data</p>
        </div>
        <Button onClick={fetchTimeLogs} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Debug Information Card - Show if no logs found for today */}
      {debugInfo && (debugInfo.filteredLogsCount === 0 || debugInfo.todayLogsCount === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Debug Information:</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Total logs in database:</strong> {debugInfo.totalLogsInDb ?? 'Unknown'}
                </div>
                <div>
                  <strong>Today's logs:</strong> {debugInfo.todayLogsCount ?? 'Unknown'}
                </div>
                <div>
                  <strong>Current filter:</strong> {debugInfo.currentFilter}
                </div>
                <div>
                  <strong>Filtered results:</strong> {debugInfo.filteredLogsCount}
                </div>
                <div>
                  <strong>Timezone:</strong> {debugInfo.currentTimezone}
                </div>
                <div>
                  <strong>Current time:</strong> {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                </div>
              </div>
              {debugInfo.dateRange && (
                <div className="mt-2 text-sm">
                  <strong>Date range:</strong> {format(debugInfo.dateRange.start, 'yyyy-MM-dd HH:mm')} to {format(debugInfo.dateRange.end, 'yyyy-MM-dd HH:mm')}
                </div>
              )}
              {debugInfo.recentLogs && debugInfo.recentLogs.length > 0 && (
                <div className="mt-2">
                  <strong>Recent logs (last 24h):</strong>
                  <ul className="text-xs mt-1">
                    {debugInfo.recentLogs.map((log: any) => (
                      <li key={log.id} className="truncate">
                        {format(new Date(log.start_time), 'MMM dd HH:mm')} - User: {log.user_id?.slice(0, 8)}...
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debugInfo.allLogs && debugInfo.allLogs.length > 0 && (
                <div className="mt-2">
                  <strong>All logs in database:</strong>
                  <ul className="text-xs mt-1">
                    {debugInfo.allLogs.map((log: any) => (
                      <li key={log.id} className="truncate">
                        {format(new Date(log.start_time), 'MMM dd HH:mm')} - User: {log.user_id?.slice(0, 8)}... - Status: {log.status || 'N/A'} - Project: {log.project_id?.slice(0, 8) || 'None'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {debugInfo.error && (
                <div className="mt-2 text-red-600">
                  <strong>Error:</strong> {debugInfo.error}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
              <div className="text-sm text-muted-foreground">Active Sessions</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedSessions.length}</div>
              <div className="text-sm text-muted-foreground">Completed Sessions</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{filteredLogs.length}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
          </CardContent>
        </Card>
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
                placeholder="Search users or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions First (if any) */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Active Sessions ({activeSessions.length})
            </CardTitle>
            <CardDescription>
              Currently running time tracking sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((log: any) => (
                    <TableRow key={log.id} className="bg-green-50">
                      <TableCell>
                        {users.find(u => u.id === log.user_id)?.full_name || 
                         users.find(u => u.id === log.user_id)?.email || 
                         'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {projects.find(p => p.id === log.project_id)?.name || 'No Project'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calculateDuration(log.start_time, null)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                          <Play className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Time Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Logs ({filteredLogs.length})
          </CardTitle>
          <CardDescription>
            Detailed view of employee time tracking entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading time logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Database className="h-8 w-8 text-muted-foreground/50" />
                <div>No time logs found matching your filters.</div>
                {debugInfo && (debugInfo.totalLogsInDb ?? 0) > 0 ? (
                  <div className="text-sm">
                    Try changing the date filter - there are {debugInfo.totalLogsInDb} total logs in the database.
                  </div>
                ) : (
                  <div className="text-sm">
                    No time logs exist in the database yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {users.find(u => u.id === log.user_id)?.full_name || 
                         users.find(u => u.id === log.user_id)?.email || 
                         'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {projects.find(p => p.id === log.project_id)?.name || 'No Project'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.end_time ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(log.end_time), 'MMM dd, yyyy HH:mm')}
                          </div>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            In Progress
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {calculateDuration(log.start_time, log.end_time)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.end_time ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
