import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Download,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TimeEntry {
  id: string;
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  project_id: string | null;
  projects?: {
    name: string;
  };
}

interface ProjectStats {
  name: string;
  hours: number;
  percentage: number;
}

interface DailyStats {
  date: string;
  hours: number;
  activeHours: number;
  idleHours: number;
}

const EmployeeReports = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [dateRange, setDateRange] = useState('week');
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalHours: 0,
    activeHours: 0,
    idleHours: 0,
    entries: 0,
    avgDailyHours: 0
  });

  useEffect(() => {
    if (userDetails?.id) {
      fetchReports();
    }
  }, [userDetails?.id, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      default:
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        };
    }
  };

  const fetchReports = async () => {
    if (!userDetails?.id) return;

    try {
      setLoading(true);
      const { start, end } = getDateRange();

      console.log('Fetching time logs for user:', userDetails.id);
      console.log('Date range:', start.toISOString(), 'to', end.toISOString());

      // Fetch time logs without embedding to avoid relationship issues
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time, is_idle, project_id')
        .eq('user_id', userDetails.id)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });

      if (timeLogsError) {
        console.error('Time logs error:', timeLogsError);
        throw timeLogsError;
      }

      console.log('Time logs fetched:', timeLogsData?.length || 0);

      // Fetch all projects separately
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name');

      if (projectsError) {
        console.error('Projects error:', projectsError);
        throw projectsError;
      }

      console.log('Projects fetched:', projectsData?.length || 0);

      // Combine the data manually to match TimeEntry interface
      const entries: TimeEntry[] = (timeLogsData || []).map(timeLog => {
        const project = projectsData?.find(p => p.id === timeLog.project_id);
        return {
          ...timeLog,
          projects: project ? { name: project.name } : { name: 'Unknown Project' }
        };
      });

      console.log('Combined entries:', entries.length);
      setTimeEntries(entries);

      // Calculate statistics
      calculateStats(entries);

    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast({
        title: 'Error loading reports',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: TimeEntry[]) => {
    let totalMinutes = 0;
    let activeMinutes = 0;
    let idleMinutes = 0;
    const projectHours: Record<string, number> = {};
    const dailyHours: Record<string, { total: number; active: number; idle: number }> = {};

    entries.forEach(entry => {
      if (!entry.end_time) return;

      const duration = differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time));
      const hours = duration / 60;
      
      totalMinutes += duration;
      
      if (entry.is_idle) {
        idleMinutes += duration;
      } else {
        activeMinutes += duration;
      }

      // Project stats
      const projectName = entry.projects?.name || 'Unknown Project';
      projectHours[projectName] = (projectHours[projectName] || 0) + hours;

      // Daily stats
      const dateKey = format(new Date(entry.start_time), 'yyyy-MM-dd');
      if (!dailyHours[dateKey]) {
        dailyHours[dateKey] = { total: 0, active: 0, idle: 0 };
      }
      dailyHours[dateKey].total += hours;
      if (entry.is_idle) {
        dailyHours[dateKey].idle += hours;
      } else {
        dailyHours[dateKey].active += hours;
      }
    });

    const totalHours = totalMinutes / 60;
    const activeHours = activeMinutes / 60;
    const idleHours = idleMinutes / 60;

    // Set total stats
    setTotalStats({
      totalHours,
      activeHours,
      idleHours,
      entries: entries.length,
      avgDailyHours: Object.keys(dailyHours).length > 0 ? totalHours / Object.keys(dailyHours).length : 0
    });

    // Set project stats
    const projectStatsArray = Object.entries(projectHours)
      .map(([name, hours]) => ({
        name,
        hours,
        percentage: totalHours > 0 ? (hours / totalHours) * 100 : 0
      }))
      .sort((a, b) => b.hours - a.hours);
    setProjectStats(projectStatsArray);

    // Set daily stats
    const dailyStatsArray = Object.entries(dailyHours)
      .map(([date, stats]) => ({
        date: format(new Date(date), 'MMM dd'),
        hours: Number(stats.total.toFixed(1)),
        activeHours: Number(stats.active.toFixed(1)),
        idleHours: Number(stats.idle.toFixed(1))
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setDailyStats(dailyStatsArray);
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Project', 'Start Time', 'End Time', 'Duration', 'Status'];
    const csvData = timeEntries.map(entry => [
      format(new Date(entry.start_time), 'yyyy-MM-dd'),
      entry.projects?.name || 'Unknown',
      format(new Date(entry.start_time), 'HH:mm:ss'),
      entry.end_time ? format(new Date(entry.end_time), 'HH:mm:ss') : 'Active',
      entry.end_time ? formatTime(differenceInMinutes(new Date(entry.end_time), new Date(entry.start_time)) / 60) : 'Active',
      entry.is_idle ? 'Idle' : 'Active'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-time-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: 'Your time report has been exported to CSV.',
    });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Reports</h1>
          <p className="text-gray-600">View your time tracking statistics and reports</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.totalHours)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.entries} time entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.activeHours)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalHours > 0 ? Math.round((totalStats.activeHours / totalStats.totalHours) * 100) : 0}% of total time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.idleHours)}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.totalHours > 0 ? Math.round((totalStats.idleHours / totalStats.totalHours) * 100) : 0}% of total time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(totalStats.avgDailyHours)}</div>
            <p className="text-xs text-muted-foreground">
              Average hours per day
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Hours worked per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}h`, 
                      name === 'activeHours' ? 'Active' : name === 'idleHours' ? 'Idle' : 'Total'
                    ]}
                  />
                  <Bar dataKey="activeHours" stackId="a" fill="#10b981" name="Active" />
                  <Bar dataKey="idleHours" stackId="a" fill="#f59e0b" name="Idle" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Distribution</CardTitle>
            <CardDescription>Time spent by project</CardDescription>
          </CardHeader>
          <CardContent>
            {projectStats.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                No project data available
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="hours"
                      nameKey="name"
                    >
                      {projectStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Project Breakdown</CardTitle>
          <CardDescription>Detailed time breakdown by project</CardDescription>
        </CardHeader>
        <CardContent>
          {projectStats.length === 0 ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              No project data available
            </div>
          ) : (
            <div className="space-y-4">
              {projectStats.map((project, index) => (
                <div key={project.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.percentage.toFixed(1)}% of total time</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatTime(project.hours)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReports;
