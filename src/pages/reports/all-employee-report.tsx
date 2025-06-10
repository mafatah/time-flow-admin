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
  RefreshCw
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, eachDayOfInterval, isSameDay } from "date-fns";

interface DailyHours {
  [date: string]: number;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  dailyHours: DailyHours;
  totalHours: number;
}

export default function AllEmployeeReport() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [dateRange, setDateRange] = useState("week");
  const [dateLabels, setDateLabels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
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
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last-week":
        const lastWeekEnd = endOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        start = startOfWeek(subDays(now, 7), { weekStartsOn: 1 });
        end = lastWeekEnd;
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    }

    return { start, end };
  };

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      
      const { start, end } = getDateRange();
      setStartDate(start);
      setEndDate(end);

      // Generate date labels for table headers
      const days = eachDayOfInterval({ start, end });
      const labels = days.map(day => format(day, 'EEE\nM/d'));
      setDateLabels(labels);

      // First get all employees
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employee')
        .order('full_name');

      if (usersError) throw usersError;

      // Then get time logs for the date range
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select(`
          id,
          user_id,
          start_time,
          end_time,
          is_idle
        `)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time');

      if (timeLogsError) throw timeLogsError;

      // Process data to create employee daily hours
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
          dailyHours,
          totalHours: 0
        };
      });

      // Process time logs
      (timeLogsData || []).forEach(log => {
        if (!log.user_id || !employeeMap[log.user_id]) return;

        const logDate = format(new Date(log.start_time), 'yyyy-MM-dd');
        const start = new Date(log.start_time);
        const end = log.end_time ? new Date(log.end_time) : new Date();
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        // Only count active time (non-idle)
        if (!log.is_idle && hours > 0) {
          if (employeeMap[log.user_id].dailyHours[logDate] !== undefined) {
            employeeMap[log.user_id].dailyHours[logDate] += hours;
            employeeMap[log.user_id].totalHours += hours;
          }
        }
      });

      // Convert to array and sort by total hours
      const employeeArray = Object.values(employeeMap)
        .sort((a, b) => b.totalHours - a.totalHours);

      setEmployees(employeeArray);

    } catch (error: any) {
      console.error('Error loading employee data:', error);
      toast({
        title: "Error loading report",
        description: error.message,
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
    const headers = ['Member', ...dateLabels.map(label => label.replace('\n', ' ')), 'Total'];
    const rows = employees.map(emp => [
      emp.name,
      ...dateLabels.map((_, index) => {
        const dateKey = format(eachDayOfInterval({ start: startDate, end: endDate })[index], 'yyyy-MM-dd');
        return formatHours(emp.dailyHours[dateKey] || 0);
      }),
      formatHours(emp.totalHours)
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
  };

  const getTotalHoursForDay = (dayIndex: number): number => {
    const dateKey = format(eachDayOfInterval({ start: startDate, end: endDate })[dayIndex], 'yyyy-MM-dd');
    return employees.reduce((total, emp) => total + (emp.dailyHours[dateKey] || 0), 0);
  };

  const getGrandTotal = (): number => {
    return employees.reduce((total, emp) => total + emp.totalHours, 0);
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="All Employee Report"
        subtitle="Daily hours breakdown for all employees"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Hours Summary ({employees.length} employees)
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
              <div>No employee data found for the selected period.</div>
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
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, empIndex) => (
                    <tr key={employee.id} className={empIndex % 2 === 0 ? 'bg-muted/10' : ''}>
                      <td className="p-3 font-medium">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
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
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {!loading && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{employees.length}</div>
              <div className="text-sm text-muted-foreground">Active Employees</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{formatHours(getGrandTotal())}</div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {employees.length > 0 ? formatHours(getGrandTotal() / employees.length) : '0:00:00'}
              </div>
              <div className="text-sm text-muted-foreground">Avg per Employee</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {formatHours(getGrandTotal() / dateLabels.length)}
              </div>
              <div className="text-sm text-muted-foreground">Avg per Day</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 