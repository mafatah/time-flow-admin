
import { useState, useEffect } from "react";
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
import { Tables } from "@/types/database";
import { formatDate, formatDuration } from "@/lib/utils";
import { CalendarIcon, Clock, Download, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [timeLogs, setTimeLogs] = useState<TimeLogWithDetails[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState("daily"); // daily, weekly, monthly

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // In a real app, we would fetch real data from Supabase
        // For this demo, we're using mock data
        const mockUsers = [
          { id: "1", full_name: "Admin User" },
          { id: "2", full_name: "Manager User" },
          { id: "3", full_name: "Employee One" },
          { id: "4", full_name: "Employee Two" },
          { id: "5", full_name: "Second Manager" },
        ];
        
        const mockProjects = [
          { id: "1", name: "Website Redesign" },
          { id: "2", name: "Mobile App Development" },
          { id: "3", name: "Marketing Campaign" },
          { id: "4", name: "CRM Integration" },
        ];
        
        const mockTimeLogs: TimeLogWithDetails[] = [
          {
            id: "1",
            user: {
              id: "3",
              full_name: "Employee One"
            },
            task: {
              id: "1",
              name: "Frontend Development",
              project: {
                id: "1",
                name: "Website Redesign"
              }
            },
            start_time: "2023-07-15T09:00:00Z",
            end_time: "2023-07-15T12:30:00Z",
            is_idle: false,
            duration_ms: 12600000 // 3.5 hours
          },
          {
            id: "2",
            user: {
              id: "3",
              full_name: "Employee One"
            },
            task: {
              id: "1",
              name: "Frontend Development",
              project: {
                id: "1",
                name: "Website Redesign"
              }
            },
            start_time: "2023-07-15T13:30:00Z",
            end_time: "2023-07-15T17:00:00Z",
            is_idle: false,
            duration_ms: 12600000 // 3.5 hours
          },
          {
            id: "3",
            user: {
              id: "4",
              full_name: "Employee Two"
            },
            task: {
              id: "2",
              name: "API Integration",
              project: {
                id: "1",
                name: "Website Redesign"
              }
            },
            start_time: "2023-07-15T09:15:00Z",
            end_time: "2023-07-15T13:00:00Z",
            is_idle: true,
            duration_ms: 13500000 // 3.75 hours
          },
          {
            id: "4",
            user: {
              id: "4",
              full_name: "Employee Two"
            },
            task: {
              id: "3",
              name: "App Design",
              project: {
                id: "2",
                name: "Mobile App Development"
              }
            },
            start_time: "2023-07-15T14:00:00Z",
            end_time: "2023-07-15T18:00:00Z",
            is_idle: false,
            duration_ms: 14400000 // 4 hours
          }
        ];

        setUsers(mockUsers);
        setProjects(mockProjects);
        setTimeLogs(mockTimeLogs);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load time tracking data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredTimeLogs = timeLogs.filter((log) => {
    const matchesUser = selectedUserId ? log.user.id === selectedUserId : true;
    const matchesProject = selectedProjectId ? log.task.project.id === selectedProjectId : true;
    const matchesDate = selectedDate
      ? new Date(log.start_time).toDateString() === selectedDate.toDateString()
      : true;
    const matchesSearch = searchQuery
      ? log.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.task.project.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesUser && matchesProject && matchesDate && matchesSearch;
  });

  // Calculate total time
  const totalTimeMs = filteredTimeLogs.reduce((acc, log) => acc + log.duration_ms, 0);

  if (loading) return <Loading message="Loading time logs..." />;
  if (error) return <ErrorMessage message={error} />;

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
