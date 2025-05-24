
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  users: { full_name: string } | null;
  tasks: { name: string; projects: { name: string } } | null;
}

export default function TimesheetsPage() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState('all');

  const { data: timeLogs, isLoading } = useQuery({
    queryKey: ['time-logs', selectedWeek, selectedUser],
    queryFn: async () => {
      try {
        const weekStart = startOfWeek(selectedWeek);
        const weekEnd = endOfWeek(selectedWeek);

        let query = supabase
          .from('time_logs')
          .select(`
            id,
            user_id,
            task_id,
            start_time,
            end_time,
            is_idle
          `)
          .gte('start_time', weekStart.toISOString())
          .lte('start_time', weekEnd.toISOString())
          .order('start_time', { ascending: false });

        if (selectedUser !== 'all') {
          query = query.eq('user_id', selectedUser);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        // Transform data to match expected interface
        return (data || []).map(item => ({
          ...item,
          users: { full_name: 'Unknown User' },
          tasks: { name: 'Unknown Task', projects: { name: 'Unknown Project' } }
        })) as TimeLog[];
      } catch (error) {
        console.error('Error fetching time logs:', error);
        return [] as TimeLog[];
      }
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      return data;
    }
  });

  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'Ongoing';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const exportTimesheet = () => {
    if (!timeLogs) return;
    
    const csv = [
      'Employee,Project,Task,Start Time,End Time,Duration,Status',
      ...timeLogs.map(log => [
        log.users?.full_name || 'Unknown',
        log.tasks?.projects.name || 'Unknown',
        log.tasks?.name || 'Unknown',
        format(new Date(log.start_time), 'yyyy-MM-dd HH:mm'),
        log.end_time ? format(new Date(log.end_time), 'yyyy-MM-dd HH:mm') : 'Ongoing',
        calculateDuration(log.start_time, log.end_time),
        log.is_idle ? 'Idle' : 'Active'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-${format(selectedWeek, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalHours = timeLogs?.reduce((total, log) => {
    if (!log.end_time) return total;
    const start = new Date(log.start_time);
    const end = new Date(log.end_time);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Timesheets</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportTimesheet}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Input
            type="week"
            value={format(selectedWeek, 'yyyy-\\WWW')}
            onChange={(e) => {
              const [year, week] = e.target.value.split('-W');
              const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
              setSelectedWeek(date);
            }}
            className="w-40"
          />
        </div>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {users?.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeLogs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeLogs?.filter(log => !log.end_time).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading time logs...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.users?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>{log.tasks?.projects.name || 'Unknown'}</TableCell>
                        <TableCell>{log.tasks?.name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(log.start_time), 'MMM d, HH:mm')}</TableCell>
                        <TableCell>
                          {log.end_time ? format(new Date(log.end_time), 'MMM d, HH:mm') : 'Ongoing'}
                        </TableCell>
                        <TableCell>{calculateDuration(log.start_time, log.end_time)}</TableCell>
                        <TableCell>
                          <Badge variant={log.is_idle ? 'secondary' : log.end_time ? 'default' : 'outline'}>
                            {log.is_idle ? 'Idle' : log.end_time ? 'Completed' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!timeLogs || timeLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No time entries found for the selected period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Calendar view coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
