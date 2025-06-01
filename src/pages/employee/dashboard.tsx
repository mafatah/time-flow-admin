import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Clock, 
  Coffee, 
  Activity, 
  Timer, 
  TrendingUp,
  Calendar,
  Target,
  AlertCircle
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DesktopDownload from '@/components/ui/desktop-download';

interface EmployeeStats {
  todayHours: number;
  todayIdleTime: number;
  weekHours: number;
  weekIdleTime: number;
  currentTask: string | null;
  isTracking: boolean;
  productivityScore: number;
  hourlyActivity: Array<{ hour: string; active: number; idle: number }>;
  idlePeriods: Array<{ start: string; end: string; duration: number }>;
}

const EmployeeDashboard = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmployeeStats>({
    todayHours: 0,
    todayIdleTime: 0,
    weekHours: 0,
    weekIdleTime: 0,
    currentTask: null,
    isTracking: false,
    productivityScore: 0,
    hourlyActivity: [],
    idlePeriods: []
  });

  useEffect(() => {
    if (userDetails?.id) {
      fetchEmployeeStats();
      // Refresh every minute
      const interval = setInterval(fetchEmployeeStats, 60000);
      return () => clearInterval(interval);
    }
  }, [userDetails?.id]);

  const fetchEmployeeStats = async () => {
    if (!userDetails?.id) return;

    try {
      setLoading(true);
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      const startOfThisWeek = startOfWeek(today);
      const endOfThisWeek = endOfWeek(today);

      // Get time logs for today specifically
      const { data: todayTimeLogs, error: todayTimeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .gte('start_time', startOfToday.toISOString())
        .lte('start_time', endOfToday.toISOString());

      if (todayTimeLogsError) throw todayTimeLogsError;

      // Get time logs for this week
      const { data: weekTimeLogs, error: weekTimeLogsError } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .gte('start_time', startOfThisWeek.toISOString())
        .lte('start_time', endOfThisWeek.toISOString());

      if (weekTimeLogsError) throw weekTimeLogsError;

      // Get idle logs for today - Now enabled since database schema is fixed
      const { data: idleLogs, error: idleLogsError } = await supabase
        .from('idle_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .gte('idle_start', startOfToday.toISOString())
        .lte('idle_start', endOfToday.toISOString())
        .order('idle_start', { ascending: false });
      
      if (idleLogsError) {
        console.warn('Error fetching idle logs:', idleLogsError);
        // Continue with empty array if idle logs fail
      }

                    // Check if currently tracking
       const { data: activeLog, error: activeLogError } = await supabase
         .from('time_logs')
         .select('*')
         .eq('user_id', userDetails.id)
         .filter('end_time', 'is', null)
         .order('start_time', { ascending: false })
         .limit(1)
         .single();

      // Process data
      let todayHours = 0;
      let todayIdleTime = 0;
      let weekHours = 0;
      let weekIdleTime = 0;
      const hourlyActivity: Record<string, { active: number; idle: number }> = {};

      // Initialize hourly activity
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        hourlyActivity[hour] = { active: 0, idle: 0 };
      }

      // Process time logs for today
      todayTimeLogs?.forEach((log: any) => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const durationMinutes = differenceInMinutes(endTime, startTime);
        const hours = durationMinutes / 60;

        todayHours += hours;
        if (log.is_idle) {
          todayIdleTime += hours;
        }

        // Hourly activity
        const hourKey = format(startTime, 'HH');
        if (log.is_idle) {
          hourlyActivity[hourKey].idle += hours;
        } else {
          hourlyActivity[hourKey].active += hours;
        }
      });

      // Process time logs for week
      weekTimeLogs?.forEach((log: any) => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const durationMinutes = differenceInMinutes(endTime, startTime);
        const hours = durationMinutes / 60;

        weekHours += hours;
        if (log.is_idle) {
          weekIdleTime += hours;
        }
      });

      // Process idle periods from idle_logs
      const idlePeriods = (idleLogs || []).map((log: any) => ({
        start: log.idle_start,
        end: log.idle_end || new Date().toISOString(), // Use current time if still idle
        duration: log.duration_seconds || (log.duration_minutes ? log.duration_minutes * 60 : 0)
      }));

      // Calculate productivity score
      const totalActiveTime = todayHours - todayIdleTime;
      const productivityScore = todayHours > 0 ? Math.round((totalActiveTime / todayHours) * 100) : 0;

      // Format hourly activity
      const hourlyActivityArray = Object.entries(hourlyActivity)
        .map(([hour, data]) => ({
          hour: `${hour}:00`,
          active: Number(data.active.toFixed(2)),
          idle: Number(data.idle.toFixed(2))
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      setStats({
        todayHours,
        todayIdleTime,
        weekHours,
        weekIdleTime,
        currentTask: null, // Will be fetched separately
        isTracking: !!activeLog && !activeLogError,
        productivityScore,
        hourlyActivity: hourlyActivityArray,
        idlePeriods
      });

    } catch (error: any) {
      console.error('Error fetching employee stats:', error);
      toast({
        title: 'Error loading dashboard',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

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
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600">Welcome back, {userDetails?.full_name}</p>
        </div>
        <div className="flex items-center space-x-2">
          {stats.isTracking ? (
            <Badge className="bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Tracking: {stats.currentTask}
            </Badge>
          ) : (
            <Badge variant="outline">
              <Timer className="h-3 w-3 mr-1" />
              Not Tracking
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Work</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.todayHours)}</div>
            <p className="text-xs text-muted-foreground">
              Active: {formatTime(stats.todayHours - stats.todayIdleTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Idle Time</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.todayIdleTime)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.idlePeriods.length} idle periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats.weekHours)}</div>
            <p className="text-xs text-muted-foreground">
              Idle: {formatTime(stats.weekIdleTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productivityScore}%</div>
            <Badge className={getProductivityColor(stats.productivityScore)}>
              {stats.productivityScore >= 80 ? 'Excellent' : 
               stats.productivityScore >= 60 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Activity</CardTitle>
            <CardDescription>Hourly breakdown of active vs idle time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.hourlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)}h`, 
                      name === 'active' ? 'Active Time' : 'Idle Time'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Active"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="idle" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Idle"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Idle Periods */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Idle Periods</CardTitle>
            <CardDescription>Today's idle time breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.idlePeriods.length === 0 ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                <div className="text-center">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <p>No idle periods today - great focus!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {stats.idlePeriods.slice(0, 10).map((period, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(period.start), 'HH:mm')} - {format(new Date(period.end), 'HH:mm')}
                        </p>
                        <p className="text-xs text-gray-500">
                          Duration: {formatDuration(period.duration)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {period.duration > 1800 ? 'Long' : period.duration > 600 ? 'Medium' : 'Short'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Button 
              onClick={() => window.location.href = '/employee/time-tracker'}
              className="flex items-center space-x-2"
            >
              <Timer className="h-4 w-4" />
              <span>Time Tracker</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/employee/reports'}
              className="flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>My Reports</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/employee/idle-time'}
              className="flex items-center space-x-2"
            >
              <Coffee className="h-4 w-4" />
              <span>Idle Time Analysis</span>
            </Button>
          </div>
          
          {/* Desktop App Download Section */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 text-sm text-muted-foreground">Need the desktop app?</h4>
            <DesktopDownload variant="compact" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard; 