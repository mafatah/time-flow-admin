import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { Loader2, Download, Calendar, User, Clock } from "lucide-react";
import { format, startOfWeek, endOfWeek, isToday, isYesterday, addDays, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";

export default function TimeLogs() {
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date())
  });
  const [showingCalendar, setShowingCalendar] = useState(false);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  // Fetch time logs
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Build query for time logs
        let query = supabase
          .from("time_logs")
          .select(`
            *,
            users!fk_time_logs_users(id, full_name, email),
            tasks!fk_time_logs_tasks(id, name, projects!fk_tasks_projects(id, name))
          `)
          .gte('start_time', dateRange.from.toISOString())
          .lte('start_time', dateRange.to.toISOString());
          
        // Add filters if needed
        if (selectedUser) {
          query = query.eq('user_id', selectedUser);
        } else if (userDetails?.role === 'employee') {
          // Employees can only see their own logs
          query = query.eq('user_id', userDetails.id);
        }
        
        if (selectedTask) {
          query = query.eq('task_id', selectedTask);
        }
        
        const { data, error } = await query.order('start_time', { ascending: false });

        if (error) throw error;
        setTimeLogs(data || []);
        
        // Fetch users if admin or manager
        if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .order('full_name');
            
          if (usersError) throw usersError;
          setUsers(usersData || []);
        }
        
        // Fetch tasks
        let tasksQuery = supabase
          .from("tasks")
          .select(`
            id, 
            name,
            projects(id, name)
          `);
          
        if (userDetails?.role === 'employee') {
          tasksQuery = tasksQuery.eq('user_id', userDetails.id);
        } else if (selectedUser) {
          tasksQuery = tasksQuery.eq('user_id', selectedUser);
        }
        
        const { data: tasksData, error: tasksError } = await tasksQuery.order('name');
        
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
        
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast, dateRange, selectedUser, selectedTask, userDetails]);

  // Calculate total time
  const calculateTotalTime = () => {
    let totalMs = 0;
    
    timeLogs.forEach(log => {
      const start = new Date(log.start_time).getTime();
      const end = log.end_time ? new Date(log.end_time).getTime() : new Date().getTime();
      totalMs += (end - start);
    });
    
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Format time duration
  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
    const durationMs = end - start;
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  // Export to CSV
  const exportToCsv = () => {
    // Generate CSV content
    const headers = ['Date', 'User', 'Project', 'Task', 'Start Time', 'End Time', 'Duration', 'Status'];
    
    const rows = timeLogs.map(log => [
      format(new Date(log.start_time), 'yyyy-MM-dd'),
      log.users.full_name,
      log.tasks.projects.name,
      log.tasks.name,
      format(new Date(log.start_time), 'HH:mm:ss'),
      log.end_time ? format(new Date(log.end_time), 'HH:mm:ss') : 'Active',
      formatDuration(log.start_time, log.end_time),
      log.is_idle ? 'Idle' : 'Active'
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `time-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle date range selection
  const handleDateRangeSelect = (range: { from: Date; to: Date }) => {
    if (range.from && range.to) {
      setDateRange(range);
      setShowingCalendar(false);
    }
  };

  // Preset date ranges
  const selectThisWeek = () => {
    setDateRange({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date())
    });
    setShowingCalendar(false);
  };
  
  const selectLastWeek = () => {
    const today = new Date();
    setDateRange({
      from: startOfWeek(addDays(today, -7)),
      to: endOfWeek(addDays(today, -7))
    });
    setShowingCalendar(false);
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Time Logs"
        subtitle="View and export time tracking data"
      >
        <Button onClick={exportToCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 mt-6 mb-4">
        {/* Date Range Selector */}
        <Popover open={showingCalendar} onOpenChange={setShowingCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectThisWeek}>This Week</Button>
                <Button variant="ghost" size="sm" onClick={selectLastWeek}>Last Week</Button>
              </div>
            </div>
            <CalendarUI
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect as any}
              numberOfMonths={1}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* User Filter - only for admin/manager */}
        {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (
          <Select
            value={selectedUser || ''}
            onValueChange={value => setSelectedUser(value || null)}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Users" />
              </div>
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
        )}

        {/* Task Filter */}
        <Select
          value={selectedTask || ''}
          onValueChange={value => setSelectedTask(value || null)}
        >
          <SelectTrigger className="w-full md:w-[220px]">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Tasks" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tasks</SelectItem>
            {tasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.projects?.name} - {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Time Entries</CardTitle>
          <div className="text-sm font-medium">
            Total Time: <span className="text-primary">{calculateTotalTime()}</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : timeLogs.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              No time logs found for the selected filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (
                    <TableHead>User</TableHead>
                  )}
                  <TableHead>Project</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeLogs.map((log) => (
                  <TableRow key={log.id} className={log.is_idle ? "bg-muted/50" : ""}>
                    <TableCell>{formatDate(log.start_time)}</TableCell>
                    {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (
                      <TableCell>{log.users?.full_name}</TableCell>
                    )}
                    <TableCell>{log.tasks?.projects?.name}</TableCell>
                    <TableCell>{log.tasks?.name}</TableCell>
                    <TableCell>{formatDuration(log.start_time, log.end_time)}</TableCell>
                    <TableCell>
                      {!log.end_time ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : log.is_idle ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Idle
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          Completed
                        </span>
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
