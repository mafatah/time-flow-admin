import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  Coffee, 
  Clock, 
  TrendingDown, 
  AlertTriangle,
  Target,
  Calendar,
  Play,
  Square
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface IdlePeriod {
  id: string;
  idle_start: string;
  idle_end: string | null;
  duration_minutes: number | null;
}

interface IdleStats {
  totalIdleTime: number;
  idlePeriods: number;
  avgIdleDuration: number;
  maxIdleDuration: number;
  productivityImpact: number;
}

interface HourlyIdleData {
  hour: string;
  idleMinutes: number;
  periods: number;
}

interface DailyIdleData {
  date: string;
  idleHours: number;
  periods: number;
  impact: number;
}

const EmployeeIdleTime = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [idlePeriods, setIdlePeriods] = useState<IdlePeriod[]>([]);
  const [idleStats, setIdleStats] = useState<IdleStats>({
    totalIdleTime: 0,
    idlePeriods: 0,
    avgIdleDuration: 0,
    maxIdleDuration: 0,
    productivityImpact: 0
  });
  const [hourlyData, setHourlyData] = useState<HourlyIdleData[]>([]);
  const [dailyData, setDailyData] = useState<DailyIdleData[]>([]);
  const [testingIdle, setTestingIdle] = useState(false);
  const [testIdleStart, setTestIdleStart] = useState<Date | null>(null);

  useEffect(() => {
    if (userDetails?.id) {
      fetchIdleData();
    }
  }, [userDetails?.id, dateRange]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
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

  const fetchIdleData = async () => {
    if (!userDetails?.id) return;

    try {
      setLoading(true);
      const { start, end } = getDateRange();

      console.log('Fetching idle data for user:', userDetails.id);
      console.log('Date range:', { start: start.toISOString(), end: end.toISOString() });

      // Fetch real idle data from idle_logs table
      const { data: idleData, error } = await supabase
        .from('idle_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .gte('idle_start', start.toISOString())
        .lte('idle_start', end.toISOString())
        .order('idle_start', { ascending: false });

      if (error) {
        console.error('Error fetching idle data:', error);
        toast({
          title: 'Error loading idle data',
          description: error.message || 'Failed to load idle time data.',
          variant: 'destructive'
        });
        return;
      }

      console.log('Fetched idle data:', idleData);
      const formattedData: IdlePeriod[] = idleData.map(item => ({
        id: item.id,
        idle_start: item.idle_start,
        idle_end: item.idle_end,
        duration_minutes: item.duration_minutes
      }));

      setIdlePeriods(formattedData);
      calculateIdleStats(formattedData);
      calculateHourlyData(formattedData);
      calculateDailyData(formattedData);

      toast({
        title: 'Idle data loaded',
        description: `Found ${formattedData.length} idle periods for the selected time range.`,
        variant: 'default'
      });

    } catch (error: any) {
      console.error('Error fetching idle data:', error);
      toast({
        title: 'Error loading idle data',
        description: error.message || 'Failed to load idle time data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateIdleStats = (periods: IdlePeriod[]) => {
    if (periods.length === 0) {
      setIdleStats({
        totalIdleTime: 0,
        idlePeriods: 0,
        avgIdleDuration: 0,
        maxIdleDuration: 0,
        productivityImpact: 0
      });
      return;
    }

    const totalMinutes = periods.reduce((sum, period) => sum + (period.duration_minutes || 0), 0);
    const maxDuration = Math.max(...periods.map(p => p.duration_minutes || 0));
    const avgDuration = totalMinutes / periods.length;

    // Calculate productivity impact (rough estimate)
    const totalHours = totalMinutes / 60;
    const workingHours = 8; // Assume 8-hour workday
    const productivityImpact = Math.min((totalHours / workingHours) * 100, 100);

    setIdleStats({
      totalIdleTime: totalMinutes * 60, // Convert to seconds for display compatibility
      idlePeriods: periods.length,
      avgIdleDuration: avgDuration * 60, // Convert to seconds
      maxIdleDuration: maxDuration * 60, // Convert to seconds
      productivityImpact
    });
  };

  const calculateHourlyData = (periods: IdlePeriod[]) => {
    const hourlyMap: Record<string, { minutes: number; periods: number }> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      hourlyMap[hour] = { minutes: 0, periods: 0 };
    }

    periods.forEach(period => {
      const hour = format(new Date(period.idle_start), 'HH');
      hourlyMap[hour].minutes += period.duration_minutes || 0;
      hourlyMap[hour].periods += 1;
    });

    const hourlyArray = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: `${hour}:00`,
      idleMinutes: Math.round(data.minutes),
      periods: data.periods
    }));

    setHourlyData(hourlyArray);
  };

  const calculateDailyData = (periods: IdlePeriod[]) => {
    const dailyMap: Record<string, { minutes: number; periods: number }> = {};

    periods.forEach(period => {
      const dateKey = format(new Date(period.idle_start), 'yyyy-MM-dd');
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { minutes: 0, periods: 0 };
      }
      dailyMap[dateKey].minutes += period.duration_minutes || 0;
      dailyMap[dateKey].periods += 1;
    });

    const dailyArray = Object.entries(dailyMap).map(([date, data]) => {
      const hours = data.minutes / 60;
      const impact = Math.min((hours / 8) * 100, 100); // Impact as % of 8-hour day
      
      return {
        date: format(new Date(date), 'MMM dd'),
        idleHours: Number(hours.toFixed(1)),
        periods: data.periods,
        impact: Math.round(impact)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    setDailyData(dailyArray);
  };

  const startIdleTest = () => {
    if (!userDetails?.id) return;
    
    setTestingIdle(true);
    setTestIdleStart(new Date());
    
    toast({
      title: 'Idle Time Test Started',
      description: 'Manual idle period simulation has begun. Click "Stop Test" to end.',
    });
  };

  const stopIdleTest = async () => {
    if (!testIdleStart || !userDetails?.id) return;
    
    const idleEnd = new Date();
    const durationSeconds = Math.floor((idleEnd.getTime() - testIdleStart.getTime()) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    
    try {
      // Create a test idle log entry in the proper idle_logs table
      const testIdleData = {
        user_id: userDetails.id,
        project_id: null, // Can be null for test entries
        idle_start: testIdleStart.toISOString(),
        idle_end: idleEnd.toISOString(),
        duration_minutes: durationMinutes
      };
      
      const { data, error } = await supabase
        .from('idle_logs')
        .insert(testIdleData)
        .select();
      
      if (error) {
        console.error('Error creating test idle log:', error);
        toast({
          title: 'Test Failed',
          description: `Failed to log test idle period: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Idle Test Completed',
          description: `Test idle period recorded: ${durationMinutes} minutes (${durationSeconds}s)`,
        });
        
        // Refresh the data to show the new test entry
        await fetchIdleData();
      }
    } catch (error) {
      console.error('Error in idle test:', error);
      toast({
        title: 'Test Error',
        description: 'An unexpected error occurred during the idle test.',
        variant: 'destructive'
      });
    }
    
    setTestingIdle(false);
    setTestIdleStart(null);
  };

  const createSampleData = async () => {
    if (!userDetails?.id) return;

    const now = new Date();
    const samplePeriods = [
      {
        user_id: userDetails.id,
        project_id: null,
        idle_start: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        idle_end: new Date(now.getTime() - 55 * 60 * 1000).toISOString(),   // 55 min ago
        duration_minutes: 5
      },
      {
        user_id: userDetails.id,
        project_id: null,
        idle_start: new Date(now.getTime() - 40 * 60 * 1000).toISOString(), // 40 min ago
        idle_end: new Date(now.getTime() - 38 * 60 * 1000).toISOString(),   // 38 min ago
        duration_minutes: 2
      },
      {
        user_id: userDetails.id,
        project_id: null,
        idle_start: new Date(now.getTime() - 25 * 60 * 1000).toISOString(), // 25 min ago
        idle_end: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),   // 15 min ago
        duration_minutes: 10
      }
    ];

    try {
      const { error } = await supabase
        .from('idle_logs')
        .insert(samplePeriods);

      if (error) {
        console.error('Error creating sample data:', error);
        toast({
          title: 'Sample Data Error',
          description: `Failed to create sample data: ${error.message}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sample Data Created',
          description: 'Sample idle periods have been created and will appear in your data.',
        });
        
        // Refresh the data to show the new sample entries
        await fetchIdleData();
      }
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast({
        title: 'Sample Data Error',
        description: 'An unexpected error occurred while creating sample data.',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getIdleSeverity = (minutes: number) => {
    if (minutes < 5) return { label: 'Short', color: 'bg-green-100 text-green-800' }; // < 5 min
    if (minutes < 30) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' }; // < 30 min
    return { label: 'Long', color: 'bg-red-100 text-red-800' }; // >= 30 min
  };

  const getProductivityColor = (impact: number) => {
    if (impact < 10) return 'text-green-600';
    if (impact < 25) return 'text-yellow-600';
    return 'text-red-600';
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
          <h1 className="text-3xl font-bold text-gray-900">Idle Time Analysis</h1>
          <p className="text-gray-600">Track and analyze your idle time patterns</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={createSampleData}
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Create Sample Data</span>
            </Button>
            
            {!testingIdle ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startIdleTest}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Start Idle Test</span>
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopIdleTest}
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop Test ({testIdleStart ? Math.floor((Date.now() - testIdleStart.getTime()) / 1000) : 0}s)</span>
              </Button>
            )}
          </div>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Test Status */}
      {testingIdle && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse">
                <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-yellow-800">Idle Time Test In Progress</p>
                <p className="text-sm text-yellow-700">
                  Started at {testIdleStart?.toLocaleTimeString()} - Duration: {testIdleStart ? Math.floor((Date.now() - testIdleStart.getTime()) / 1000) : 0} seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Idle Time</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(idleStats.totalIdleTime)}</div>
            <p className="text-xs text-muted-foreground">
              {idleStats.idlePeriods} idle periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(idleStats.avgIdleDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Per idle period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Period</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(idleStats.maxIdleDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Maximum idle time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity Impact</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProductivityColor(idleStats.productivityImpact)}`}>
              {idleStats.productivityImpact.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Of working time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Idle Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Hourly Idle Pattern</CardTitle>
            <CardDescription>Idle time distribution throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'idleMinutes' ? `${value} min` : value,
                      name === 'idleMinutes' ? 'Idle Time' : 'Periods'
                    ]}
                  />
                  <Bar dataKey="idleMinutes" fill="#f59e0b" name="Idle Minutes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Idle Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Idle Trend</CardTitle>
            <CardDescription>Idle time over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'idleHours' ? `${value}h` : `${value}%`,
                      name === 'idleHours' ? 'Idle Time' : 'Impact'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="idleHours" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Idle Hours"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Idle Periods */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Idle Periods</CardTitle>
          <CardDescription>Detailed breakdown of your idle time periods</CardDescription>
        </CardHeader>
        <CardContent>
          {idlePeriods.length === 0 ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <Target className="h-8 w-8 mx-auto mb-2" />
                <p>No idle periods found for the selected period</p>
                <p className="text-sm">Great focus and productivity!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {idlePeriods.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Coffee className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(item.idle_start), 'MMM dd, HH:mm')} - {item.idle_end ? format(new Date(item.idle_end), 'HH:mm') : 'Ongoing'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Duration: {item.duration_minutes || 0} minutes
                      </p>
                    </div>
                  </div>
                  <Badge className={getIdleSeverity(item.duration_minutes || 0).color}>
                    {getIdleSeverity(item.duration_minutes || 0).label}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productivity Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Reduce Idle Time</h4>
              <p className="text-sm text-blue-800">
                Take regular short breaks instead of long idle periods. Use techniques like the Pomodoro method.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Stay Focused</h4>
              <p className="text-sm text-green-800">
                Minimize distractions and set clear goals for each work session to maintain productivity.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">Track Patterns</h4>
              <p className="text-sm text-yellow-800">
                Notice when you're most prone to idle time and plan your most important tasks accordingly.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">Set Reminders</h4>
              <p className="text-sm text-purple-800">
                Use productivity apps or browser extensions to remind you to stay active during work hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeIdleTime;
