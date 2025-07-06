import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { 
  Download, 
  Users, 
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval, isSameDay } from "date-fns";

interface DailyHours {
  [date: string]: number;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  role: string;
  dailyHours: DailyHours;
  totalHours: number;
  activeHours: number;
  idleHours: number;
  productivity: number; // percentage
}

interface ReportStats {
  totalEmployees: number;
  totalActiveHours: number;
  totalIdleHours: number;
  averageProductivity: number;
  topPerformer: string;
}

export default function AllEmployeeReport() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [dateRange, setDateRange] = useState("week");
  const [dateLabels, setDateLabels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      loadEmployeeData();
    }
  }, [dateRange, userDetails]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (dateRange) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "week":
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last-week":
        const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 0 });
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 0 });
        end = lastWeekEnd;
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 0 });
        end = endOfWeek(now, { weekStartsOn: 0 });
    }

    return { start, end };
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { start, end } = getDateRange();
      setStartDate(start);
      setEndDate(end);

      // Generate date labels for table headers
      const days = eachDayOfInterval({ start, end });
      const labels = days.map(day => format(day, 'EEE\nM/d'));
      setDateLabels(labels);

      // First get all users (employees, admins, managers) with better error handling
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['employee', 'admin', 'manager'])
        .order('full_name');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (!usersData || usersData.length === 0) {
        setEmployees([]);
        setStats(null);
        return;
      }

      // Then get time logs for the date range with enhanced data
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          is_idle,
          status
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time');

      if (timeLogsError) {
        console.error('Error fetching time logs:', timeLogsError);
        throw new Error(`Failed to fetch time logs: ${timeLogsError.message}`);
      }

      // Process data to create employee daily hours with productivity metrics
      const employeeMap: { [userId: string]: EmployeeData } = {};

      // Initialize all employees
      (usersData || []).forEach(user => {
        const dailyHours: DailyHours = {};
        days.forEach(day => {
          dailyHours[format(day, 'yyyy-MM-dd')] = 0;
        });

        employeeMap[user.id] = {
          id: user.id,
          name: user.full_name || 'Unknown',
          email: user.email,
          role: user.role,
          dailyHours,
          totalHours: 0,
          activeHours: 0,
          idleHours: 0,
          productivity: 0
        };
      });

      // Process time logs with enhanced productivity tracking
      (timeLogsData || []).forEach(log => {
        if (!log.user_id || !employeeMap[log.user_id]) return;

        const logDate = format(new Date(log.start_time), 'yyyy-MM-dd');
        const start = new Date(log.start_time);
        const end = log.end_time ? new Date(log.end_time) : new Date();
        const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));

        // Validate reasonable hours (cap at 12 hours per session)
        const cappedHours = Math.min(hours, 12);

        if (cappedHours > 0 && employeeMap[log.user_id].dailyHours[logDate] !== undefined) {
          employeeMap[log.user_id].dailyHours[logDate] += cappedHours;
          employeeMap[log.user_id].totalHours += cappedHours;

          if (log.is_idle) {
            employeeMap[log.user_id].idleHours += cappedHours;
          } else {
            employeeMap[log.user_id].activeHours += cappedHours;
          }
        }
      });

      // Calculate productivity percentages
      Object.values(employeeMap).forEach(employee => {
        if (employee.totalHours > 0) {
          employee.productivity = Math.round((employee.activeHours / employee.totalHours) * 100);
        }
      });

      // Convert to array and sort by total hours
      const employeeArray = Object.values(employeeMap)
        .filter(emp => emp.totalHours > 0) // Only show employees with recorded hours
        .sort((a, b) => b.totalHours - a.totalHours);

      setEmployees(employeeArray);

      // Calculate overall statistics
      const totalEmployees = employeeArray.length;
      const totalActiveHours = employeeArray.reduce((sum, emp) => sum + emp.activeHours, 0);
      const totalIdleHours = employeeArray.reduce((sum, emp) => sum + emp.idleHours, 0);
      const averageProductivity = totalEmployees > 0 
        ? Math.round(employeeArray.reduce((sum, emp) => sum + emp.productivity, 0) / totalEmployees)
        : 0;
      const topPerformer = employeeArray.length > 0 ? employeeArray[0].name : 'None';

      setStats({
        totalEmployees,
        totalActiveHours,
        totalIdleHours,
        averageProductivity,
        topPerformer
      });

    } catch (error: any) {
      console.error('Error loading employee data:', error);
      setError(error.message || 'An unexpected error occurred');
      toast({
        title: "Error loading report",
        description: error.message || 'Failed to load employee data',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number): string => {
    if (hours === 0) return "0:00:00";
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const exportToCSV = () => {
    if (employees.length === 0) {
      toast({
        title: "No data to export",
        description: "Please ensure there is employee data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      'Member', 
      ...dateLabels.map(label => label.replace('\n', ' ')), 
      'Total Hours',
      'Active Hours',
      'Idle Hours',
      'Productivity %'
    ];
    
    const rows = employees.map(emp => [
      emp.name,
      ...dateLabels.map((_, index) => {
        const dateKey = format(eachDayOfInterval({ start: startDate, end: endDate })[index], 'yyyy-MM-dd');
        return formatHours(emp.dailyHours[dateKey] || 0);
      }),
      formatHours(emp.totalHours),
      formatHours(emp.activeHours),
      formatHours(emp.idleHours),
      `${emp.productivity}%`
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-employee-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Employee report has been downloaded",
    });
  };

  const getTotalHoursForDay = (dayIndex: number): number => {
    const dateKey = format(eachDayOfInterval({ start: startDate, end: endDate })[dayIndex], 'yyyy-MM-dd');
    return employees.reduce((total, emp) => total + (emp.dailyHours[dateKey] || 0), 0);
  };

  const getGrandTotal = (): number => {
    return employees.reduce((total, emp) => total + emp.totalHours, 0);
  };

  const getProductivityColor = (productivity: number): string => {
    if (productivity >= 80) return 'text-green-600 bg-green-100';
    if (productivity >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="All Employee Report"
        subtitle="Daily hours breakdown and productivity metrics for all employees"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
          </Badge>

          {stats && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.averageProductivity}% Avg Productivity
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={loadEmployeeData}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={exportToCSV}
            disabled={loading || employees.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Hours Summary ({employees.length} users)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading employee data...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>No user data found for the selected period.</div>
              <div className="text-sm mt-2">Try selecting a different date range or ensure users have logged time.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium bg-muted/30">Member</th>
                    {dateLabels.map((label, index) => (
                      <th key={index} className="text-center p-2 font-medium bg-muted/30 min-w-[80px]">
                        <div className="whitespace-pre-line text-xs">
                          {label}
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-3 font-medium bg-muted/30">Total</th>
                    <th className="text-center p-3 font-medium bg-muted/30">Productivity</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, empIndex) => (
                    <tr key={employee.id} className={empIndex % 2 === 0 ? 'bg-muted/10' : ''}>
                      <td className="p-3 font-medium">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {employee.name}
                            <Badge variant="outline" className="text-xs capitalize">
                              {employee.role}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Active: {formatHours(employee.activeHours)} | Idle: {formatHours(employee.idleHours)}
                          </div>
                        </div>
                      </td>
                      {dateLabels.map((_, dayIndex) => {
                        const dateKey = format(eachDayOfInterval({ start: startDate, end: endDate })[dayIndex], 'yyyy-MM-dd');
                        const hours = employee.dailyHours[dateKey] || 0;
                        return (
                          <td key={dayIndex} className="text-center p-2 text-sm">
                            <span className={hours > 0 ? 'font-medium' : 'text-muted-foreground'}>
                              {formatHours(hours)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="text-center p-3 font-bold text-primary">
                        {formatHours(employee.totalHours)}
                      </td>
                      <td className="text-center p-3">
                        <Badge 
                          variant="secondary" 
                          className={getProductivityColor(employee.productivity)}
                        >
                          {employee.productivity}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals Row */}
                  <tr className="border-t-2 bg-muted/20 font-bold">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        TOTALS
                      </div>
                    </td>
                    {dateLabels.map((_, dayIndex) => (
                      <td key={dayIndex} className="text-center p-2 font-bold text-primary">
                        {formatHours(getTotalHoursForDay(dayIndex))}
                      </td>
                    ))}
                    <td className="text-center p-3 font-bold text-primary text-lg">
                      {formatHours(getGrandTotal())}
                    </td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="font-bold">
                        {stats?.averageProductivity || 0}%
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      {!loading && employees.length > 0 && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalEmployees}</div>
              <div className="text-sm text-muted-foreground">Active Employees</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{formatHours(stats.totalActiveHours)}</div>
              <div className="text-sm text-muted-foreground">Total Active Hours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{formatHours(stats.totalIdleHours)}</div>
              <div className="text-sm text-muted-foreground">Total Idle Hours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.averageProductivity}%</div>
              <div className="text-sm text-muted-foreground">Avg Productivity</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-lg font-bold text-primary truncate" title={stats.topPerformer}>
                {stats.topPerformer}
              </div>
              <div className="text-sm text-muted-foreground">Top Performer</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 