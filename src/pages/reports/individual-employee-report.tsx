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
  User, 
  Calendar,
  Clock,
  RefreshCw,
  Activity,
  Pause,
  Play,
  Target
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

interface TimeSession {
  id: string;
  project: string;
  start_time: string;
  end_time: string | null;
  duration: number; // in seconds
  status: 'Active' | 'Idle';
  date: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SessionSummary {
  totalSessions: number;
  totalHours: number;
  activeHours: number;
  idleHours: number;
  activityRate: number;
}

export default function IndividualEmployeeReport() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<SessionSummary>({
    totalSessions: 0,
    totalHours: 0,
    activeHours: 0,
    idleHours: 0,
    activityRate: 0
  });
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      loadEmployees();
    }
  }, [userDetails]);

  useEffect(() => {
    if (selectedEmployee && userDetails?.role === 'admin') {
      loadEmployeeReport();
    }
  }, [selectedEmployee, dateRange, userDetails]);

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

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['employee', 'admin', 'manager'])
        .order('full_name');

      if (error) throw error;

      const employeeList = (data || []).map(emp => ({
        id: emp.id,
        name: emp.full_name || 'Unknown',
        email: emp.email,
        role: emp.role
      }));

      setEmployees(employeeList);

      // Auto-select first employee if none selected
      if (employeeList.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employeeList[0].id);
      }

    } catch (error: any) {
      console.error('Error loading employees:', error);
      toast({
        title: "Error loading employees",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadEmployeeReport = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      
      const { start, end } = getDateRange();
      setStartDate(start);
      setEndDate(end);

      // Get time logs for the selected employee
      const { data: timeLogsData, error: timeLogsError } = await supabase
        .from('time_logs')
        .select(`
          id,
          user_id,
          project_id,
          start_time,
          end_time,
          is_idle,
          projects (
            name
          )
        `)
        .eq('user_id', selectedEmployee)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: false });

      if (timeLogsError) throw timeLogsError;

      // Process sessions
      const sessionData: TimeSession[] = (timeLogsData || []).map(log => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

        return {
          id: log.id,
          project: log.projects?.name || 'Default Project',
          start_time: log.start_time,
          end_time: log.end_time,
          duration: durationSeconds,
          status: log.is_idle ? 'Idle' : 'Active',
          date: format(startTime, 'yyyy-MM-dd')
        };
      });

      setSessions(sessionData);

      // Calculate summary
      const totalSessions = sessionData.length;
      const totalSeconds = sessionData.reduce((sum, session) => sum + session.duration, 0);
      const activeSeconds = sessionData
        .filter(session => session.status === 'Active')
        .reduce((sum, session) => sum + session.duration, 0);
      const idleSeconds = totalSeconds - activeSeconds;
      
      const totalHours = totalSeconds / 3600;
      const activeHours = activeSeconds / 3600;
      const idleHours = idleSeconds / 3600;
      const activityRate = totalHours > 0 ? (activeHours / totalHours) * 100 : 0;

      setSummary({
        totalSessions,
        totalHours,
        activeHours,
        idleHours,
        activityRate
      });

    } catch (error: any) {
      console.error('Error loading employee report:', error);
      toast({
        title: "Error loading report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatTime = (timeString: string): string => {
    return format(new Date(timeString), 'M/d/yyyy h:mm a');
  };

  const exportToCSV = () => {
    const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
    if (!selectedEmp) return;

    const headers = ['User', 'Email', 'Project', 'Start Time', 'End Time', 'Duration', 'Status'];
    const rows = sessions.map(session => [
      selectedEmp.name,
      selectedEmp.email,
      session.project,
      formatTime(session.start_time),
      session.end_time ? formatTime(session.end_time) : 'Ongoing',
      formatDuration(session.duration),
      session.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedEmp.name.replace(/\s+/g, '-')}-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  return (
    <div className="container py-6">
      <PageHeader
        title="Individual Employee Report"
        subtitle="Detailed session data for a specific employee"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            onClick={loadEmployeeReport}
            disabled={loading || !selectedEmployee}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={exportToCSV}
            disabled={loading || sessions.length === 0 || !selectedEmployee}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Employee Info & Summary */}
      {selectedEmployeeData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Employee</span>
              </div>
              <div className="font-bold">{selectedEmployeeData.name}</div>
              <div className="text-xs text-muted-foreground">{selectedEmployeeData.email}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalSessions}</div>
              <div className="text-xs text-muted-foreground">Total Sessions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{formatDuration(Math.floor(summary.activeHours * 3600))}</div>
              <div className="text-xs text-muted-foreground">Active Time</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{formatDuration(Math.floor(summary.idleHours * 3600))}</div>
              <div className="text-xs text-muted-foreground">Idle Time</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(summary.activityRate)}%</div>
              <div className="text-xs text-muted-foreground">Activity Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Details ({sessions.length} sessions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading session data...
            </div>
          ) : !selectedEmployee ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>Please select an employee to view their report.</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div>No session data found for the selected period.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-center p-3 font-medium">Start Time</th>
                    <th className="text-center p-3 font-medium">End Time</th>
                    <th className="text-center p-3 font-medium">Duration</th>
                    <th className="text-center p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr key={session.id} className={index % 2 === 0 ? 'bg-muted/10' : ''}>
                      <td className="p-3 font-medium">{selectedEmployeeData?.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{selectedEmployeeData?.email}</td>
                      <td className="p-3">{session.project}</td>
                      <td className="p-3 text-center text-sm">{formatTime(session.start_time)}</td>
                      <td className="p-3 text-center text-sm">
                        {session.end_time ? formatTime(session.end_time) : (
                          <Badge variant="outline" className="text-xs">
                            <Play className="h-3 w-3 mr-1" />
                            Ongoing
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-sm">{formatDuration(session.duration)}</td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant={session.status === 'Active' ? 'default' : 'secondary'}
                          className={session.status === 'Active' 
                            ? 'bg-green-100 text-green-800 border-green-300' 
                            : 'bg-orange-100 text-orange-800 border-orange-300'
                          }
                        >
                          {session.status === 'Active' ? (
                            <Activity className="h-3 w-3 mr-1" />
                          ) : (
                            <Pause className="h-3 w-3 mr-1" />
                          )}
                          {session.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Summary */}
      {!loading && sessions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Summary Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/20 rounded-lg">
                <div className="text-lg font-bold text-primary">{formatDuration(Math.floor(summary.totalHours * 3600))}</div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {sessions.filter(s => s.status === 'Active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active Sessions</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {sessions.filter(s => s.status === 'Idle').length}
                </div>
                <div className="text-sm text-muted-foreground">Idle Sessions</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {sessions.length > 0 ? formatDuration(Math.floor((summary.totalHours * 3600) / sessions.length)) : '0h 0m 0s'}
                </div>
                <div className="text-sm text-muted-foreground">Avg Session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 