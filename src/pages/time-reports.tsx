import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Download, User, Clock as ClockIcon } from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  user_id: string;
  task_id: string;
  tasks: {
    id: string;
    name: string;
    projects: {
      id: string;
      name: string;
    } | null;
  };
  users: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function TimeReportsPage() {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState("week");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedTask, setSelectedTask] = useState("all");
  
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, [userDetails]);

  useEffect(() => {
    applyFilters();
  }, [timeLogs, dateRange, selectedUser, selectedTask]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load time logs with related data
      const { data: logsData, error: logsError } = await supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          task_id,
          tasks!inner (
            id,
            name,
            projects (
              id,
              name
            )
          ),
          users!inner (
            id,
            full_name,
            email
          )
        `)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });

      if (logsError) throw logsError;

      setTimeLogs(logsData as any || []);

      // Load users for filter (admin/manager only)
      if (userDetails?.role !== 'employee') {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .order('full_name');

        if (usersError) throw usersError;
        setUsers(usersData || []);
      }

      // Load tasks for filter
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          projects (
            id,
            name
          )
        `)
        .order('name');

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...timeLogs];

    // Filter by date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    if (dateRange !== "all") {
      filtered = filtered.filter(log => {
        const logDate = parseISO(log.start_time);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    // Filter by user (admin/manager only)
    if (selectedUser !== "all" && userDetails?.role !== 'employee') {
      filtered = filtered.filter(log => log.user_id === selectedUser);
    } else if (userDetails?.role === 'employee') {
      // Employees can only see their own logs
      filtered = filtered.filter(log => log.user_id === userDetails.id);
    }

    // Filter by task
    if (selectedTask !== "all") {
      filtered = filtered.filter(log => log.task_id === selectedTask);
    }

    setFilteredLogs(filtered);
  };

  const calculateTotalTime = () => {
    let totalMs = 0;
    filteredLogs.forEach(log => {
      if (log.end_time) {
        const start = parseISO(log.start_time).getTime();
        const end = parseISO(log.end_time).getTime();
        totalMs += (end - start);
      }
    });
    return totalMs;
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "In Progress";
    
    const start = parseISO(startTime).getTime();
    const end = parseISO(endTime).getTime();
    const duration = end - start;
    
    return formatTime(duration);
  };

  const exportToCSV = () => {
    const headers = ["Date", "User", "Project", "Task", "Start Time", "End Time", "Duration"];
    const csvData = filteredLogs.map(log => [
      format(parseISO(log.start_time), "yyyy-MM-dd"),
      log.users.full_name,
      log.tasks.projects?.name || "No Project",
      log.tasks.name,
      format(parseISO(log.start_time), "HH:mm:ss"),
      log.end_time ? format(parseISO(log.end_time), "HH:mm:ss") : "In Progress",
      formatDuration(log.start_time, log.end_time)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `time_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Time logs have been exported to CSV file.",
    });
  };

  if (loading) {
    return (
      <div className="container py-6">
        <PageHeader
          title="Time Reports"
          subtitle="View and export time tracking data"
        />
        <div className="mt-6 text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="Time Reports"
        subtitle="View and export time tracking data"
      />

      <div className="mt-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* User Filter (Admin/Manager only) */}
              {userDetails?.role !== 'employee' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Task Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Task</label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.projects?.name || 'No Project'} - {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{formatTime(calculateTotalTime())}</div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{filteredLogs.length}</div>
                <div className="text-sm text-muted-foreground">Time Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time logs found for the selected filters
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {log.tasks.projects?.name || 'No Project'} - {log.tasks.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {log.users.full_name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(log.start_time), "MMM d, yyyy")}
                      </div>
                      <div className="text-sm">
                        {format(parseISO(log.start_time), "h:mm a")} - {" "}
                        {log.end_time 
                          ? format(parseISO(log.end_time), "h:mm a")
                          : "In Progress"
                        }
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatDuration(log.start_time, log.end_time)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 