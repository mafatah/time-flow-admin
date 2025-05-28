import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Filter, Clock, Edit } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { TimeLog } from '@/types/timeLog';

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export default function TimeLogs() {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    projectId: '',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'all' // all, active, completed
  });

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTimeLogs();
  }, [filters]);

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
      toast.error('Failed to fetch users');
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
      toast.error('Failed to fetch projects');
    }
  };

  const fetchTimeLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('time_logs')
        .select('*');

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.startDate) {
        query = query.gte('start_time', new Date(filters.startDate).toISOString());
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('start_time', endDate.toISOString());
      }

      if (filters.status === 'active') {
        query = query.is('end_time', null);
      } else if (filters.status === 'completed') {
        query = query.not('end_time', 'is', null);
      }

      const { data: timeLogData, error } = await query
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!timeLogData || timeLogData.length === 0) {
        setTimeLogs([]);
        return;
      }

      // Enrich with user and project names
      const enrichedLogs: TimeLog[] = timeLogData.map(log => {
        const user = users.find(u => u.id === log.user_id);
        const project = projects.find(p => p.id === log.project_id);
        
        return {
          ...log,
          user_name: user?.full_name || 'Unknown User',
          project_name: project?.name || 'Unknown Project'
        };
      });

      setTimeLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching time logs:', error);
      toast.error('Failed to fetch time logs');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string | null): string => {
    if (!end) return 'Ongoing';
    
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const stopTimeLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('id', logId);

      if (error) throw error;

      toast.success('Time log stopped');
      fetchTimeLogs();
    } catch (error) {
      console.error('Error stopping time log:', error);
      toast.error('Failed to stop time log');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Time Logs</h1>
        <Button onClick={fetchTimeLogs} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select 
                value={filters.projectId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Time Logs ({timeLogs.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading time logs...</div>
          ) : timeLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No time logs found for the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell>{log.project_name}</TableCell>
                    <TableCell>
                      {format(new Date(log.start_time), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {log.end_time 
                        ? format(new Date(log.end_time), 'MMM d, yyyy HH:mm')
                        : 'Ongoing'
                      }
                    </TableCell>
                    <TableCell>
                      {calculateDuration(log.start_time, log.end_time)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Badge variant={log.end_time ? 'default' : 'secondary'}>
                          {log.end_time ? 'Completed' : 'Active'}
                        </Badge>
                        {log.is_idle && (
                          <Badge variant="outline">Idle</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!log.end_time && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTimeLog(log.id)}
                        >
                          Stop
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
