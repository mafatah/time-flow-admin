
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { Calendar, Clock, Download, Filter, Search } from 'lucide-react';

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string;
  user_id: string;
  project_id: string;
  projects: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function EmployeeReports() {
  const { userDetails, user } = useAuth();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTimeLogs();
  }, [dateRange, searchTerm]);

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

  const fetchTimeLogs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startDate = getStartDate();
      const endDate = new Date(); // Today

      let query = supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          project_id,
          projects (name)
        `)
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (searchTerm) {
        query = query.ilike('projects.name', `%${searchTerm}%`);
      }

      const { data: timeLogsData, error: timeLogsError } = await query;

      if (timeLogsError) {
        console.error('Error fetching time logs:', timeLogsError);
        return;
      }

      // Transform the data to match our interface
      const transformedLogs: TimeLog[] = (timeLogsData || []).map((log: any) => ({
        id: log.id,
        start_time: log.start_time,
        end_time: log.end_time,
        user_id: log.user_id,
        project_id: log.project_id,
        projects: {
          name: log.projects?.name || 'Unknown Project'
        }
      }));

      setTimeLogs(transformedLogs);
    } catch (error) {
      console.error('Error fetching time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return today;
      case 'week':
        return subDays(today, 7);
      case 'month':
        return subDays(today, 30);
      default:
        return today;
    }
  };

  const calculateTotalTime = () => {
    let total = 0;
    timeLogs.forEach((log) => {
      if (log.end_time) {
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        total += end - start;
      }
    });
    return total;
  };

  const totalTime = calculateTotalTime();
  const totalHours = Math.floor(totalTime / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Time Reports</h1>
          <p className="text-muted-foreground">Your tracked time and activity</p>
        </div>
        <Button onClick={fetchTimeLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>View your time logs and project allocations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search by project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold">
              Total Time Tracked: {totalHours} hours and {totalMinutes} minutes
            </h3>
          </div>

          <div className="overflow-x-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((timeLog: any) => {
                  const project = projects.find((p: any) => p.id === timeLog.project_id);
                  const startTime = new Date(timeLog.start_time);
                  const endTime = timeLog.end_time ? new Date(timeLog.end_time) : null;
                  const duration = endTime ? (endTime.getTime() - startTime.getTime()) : 0;
                  const durationInMinutes = Math.floor(duration / (1000 * 60));

                  return (
                    <TableRow key={timeLog.id}>
                      <TableCell>{project?.name || 'No Project'}</TableCell>
                      <TableCell>{format(startTime, 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell>{endTime ? format(endTime, 'MMM dd, yyyy HH:mm') : 'N/A'}</TableCell>
                      <TableCell>{endTime ? `${durationInMinutes} minutes` : 'N/A'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
