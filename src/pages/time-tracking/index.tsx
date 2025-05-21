
import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; 
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/layout/loading";
import { ErrorMessage } from "@/components/layout/error-message";
import { formatDate, formatDuration } from "@/lib/utils";
import { CalendarIcon, Clock, Download, Search } from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface TimeLogWithDetails {
  id: string;
  user: {
    id: string;
    full_name: string;
  };
  task: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  duration_ms: number;
}

export default function TimeTrackingPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("daily"); // daily, weekly, monthly
  const { toast } = useToast();

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
        
      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error loading users",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      return data;
    }
  });
  
  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
        
      if (error) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error loading projects",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      return data;
    }
  });
  
  // Fetch time logs with detailed info
  const { 
    data: timeLogs = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ["timeLogs", selectedDate, selectedUserId, selectedProjectId],
    queryFn: async () => {
      try {
        // First get all tasks with their project info if we have a project filter
        let tasksQuery = supabase
          .from("tasks")
          .select(`
            id,
            name,
            user_id,
            project:project_id (
              id,
              name
            )
          `);
          
        if (selectedProjectId) {
          tasksQuery = tasksQuery.eq("project_id", selectedProjectId);
        }
        
        const { data: tasks, error: tasksError } = await tasksQuery;
        
        if (tasksError) throw tasksError;
        
        // If no tasks are found and we have a project filter, return empty array
        if (tasks.length === 0 && selectedProjectId) {
          return [];
        }
        
        // Now get time logs for these tasks
        let timeLogsQuery = supabase
          .from("time_logs")
          .select(`
            id,
            user_id,
            task_id,
            start_time,
            end_time,
            is_idle
          `);
          
        // Apply user filter if selected
        if (selectedUserId) {
          timeLogsQuery = timeLogsQuery.eq("user_id", selectedUserId);
        }
        
        // Apply date filter if selected
        if (selectedDate) {
          const startDate = startOfDay(selectedDate).toISOString();
          const endDate = endOfDay(selectedDate).toISOString();
          timeLogsQuery = timeLogsQuery.gte("start_time", startDate).lte("start_time", endDate);
        }
        
        const { data: timeLogs, error: timeLogsError } = await timeLogsQuery;
        
        if (timeLogsError) throw timeLogsError;
        
        // Get users info
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name");
          
        if (usersError) throw usersError;
        
        const usersMap = new Map(usersData.map(user => [user.id, user]));
        const tasksMap = new Map(tasks.map(task => [task.id, task]));
        
        // Combine all data
        const timeLogsWithDetails: TimeLogWithDetails[] = timeLogs
          .filter(log => {
            // Filter by task if we have a project filter
            if (selectedProjectId) {
              const task = tasksMap.get(log.task_id);
              return task && task.project && task.project.id === selectedProjectId;
            }
            return true;
          })
          .map(log => {
            const user = usersMap.get(log.user_id);
            const task = tasksMap.get(log.task_id);
            
            // Calculate duration in milliseconds
            let duration_ms = 0;
            if (log.end_time) {
              duration_ms = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
            } else {
              // If log is still running, calculate duration until now
              duration_ms = new Date().getTime() - new Date(log.start_time).getTime();
            }
            
            return {
              ...log,
              user: {
                id: user?.id || log.user_id,
                full_name: user?.full_name || "Unknown User"
              },
              task: {
                id: task?.id || log.task_id,
                name: task?.name || "Unknown Task",
                project: task?.project || { id: "", name: "Unknown Project" }
              },
              duration_ms
            };
          });
          
        return timeLogsWithDetails;
      } catch (err: any) {
        console.error("Error fetching time logs:", err);
        toast({
          title: "Error loading time logs",
          description: err.message,
          variant: "destructive"
        });
        return [];
      }
    }
  });

  const filteredTimeLogs = timeLogs.filter((log) => {
    const matchesSearch = searchQuery
      ? log.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.task.project.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesSearch;
  });

  // Calculate total time
  const totalTimeMs = filteredTimeLogs.reduce((acc, log) => acc + log.duration_ms, 0);

  if (isLoading) return <Loading message="Loading time logs..." />;
  if (error) return <ErrorMessage message={(error as Error).message} />;

  return (
    <>
      <PageHeader 
        title="Time Tracking" 
        subtitle="Monitor and manage employee time entries"
      />

      <div className="mb-6 space-y-4">
        <Tabs defaultValue="daily" value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="daily">Daily View</TabsTrigger>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            <TabsTrigger value="monthly">Monthly View</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search time logs..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-muted-foreground mr-2" />
            <p className="text-sm font-medium">
              Total Time: <span className="text-primary">{formatDuration(totalTimeMs)}</span>
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {filteredTimeLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/40 rounded-lg">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Time Entries Found</h3>
          <p className="text-muted-foreground mt-1">
            No time entries match your current filters.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setSelectedUserId("");
            setSelectedProjectId("");
            setSelectedDate(new Date());
            setSearchQuery("");
          }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Project / Task</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimeLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.user.full_name}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{log.task.project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.task.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(log.start_time, "h:mm a")}
                  </TableCell>
                  <TableCell>
                    {log.end_time ? formatDate(log.end_time, "h:mm a") : "In Progress"}
                  </TableCell>
                  <TableCell>
                    {formatDuration(log.duration_ms)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={log.is_idle ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                      {log.is_idle ? "Idle Time" : "Active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
