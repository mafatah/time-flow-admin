
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Edit, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TimeLog {
  id: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  tasks: { name: string; projects: { name: string } };
  users: { full_name: string };
}

export default function TimesheetsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  const { data: timeLogs, isLoading } = useQuery({
    queryKey: ['time-logs', selectedDate, view],
    queryFn: async () => {
      const startDate = view === 'daily' 
        ? format(selectedDate, 'yyyy-MM-dd')
        : format(new Date(selectedDate.getTime() - selectedDate.getDay() * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      const endDate = view === 'daily'
        ? format(selectedDate, 'yyyy-MM-dd')
        : format(new Date(selectedDate.getTime() + (6 - selectedDate.getDay()) * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          *,
          tasks (name, projects (name)),
          users (full_name)
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate + 'T23:59:59');

      if (error) throw error;
      return data as TimeLog[];
    }
  });

  const calculateDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    if (!timeLogs) return;
    
    const csvContent = [
      ['Employee', 'Project', 'Task', 'Start Time', 'End Time', 'Duration', 'Status'],
      ...timeLogs.map(log => [
        log.users.full_name,
        log.tasks.projects.name,
        log.tasks.name,
        format(new Date(log.start_time), 'yyyy-MM-dd HH:mm'),
        log.end_time ? format(new Date(log.end_time), 'yyyy-MM-dd HH:mm') : 'Ongoing',
        calculateDuration(log.start_time, log.end_time),
        log.is_idle ? 'Idle' : 'Active'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${format(selectedDate, 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Timesheets</h1>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as 'daily' | 'weekly')}>
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            <TabsContent value="daily" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Daily Timesheet - {format(selectedDate, 'MMMM d, yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div>Loading timesheets...</div>
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
                            <TableCell className="font-medium">{log.users.full_name}</TableCell>
                            <TableCell>{log.tasks.projects.name}</TableCell>
                            <TableCell>{log.tasks.name}</TableCell>
                            <TableCell>{format(new Date(log.start_time), 'HH:mm')}</TableCell>
                            <TableCell>
                              {log.end_time ? format(new Date(log.end_time), 'HH:mm') : 'Ongoing'}
                            </TableCell>
                            <TableCell>{calculateDuration(log.start_time, log.end_time)}</TableCell>
                            <TableCell>
                              <Badge variant={log.is_idle ? 'secondary' : 'default'}>
                                {log.is_idle ? 'Idle' : 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!timeLogs || timeLogs.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No time logs found for this date
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground">
                    Weekly timesheet view coming soon
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
