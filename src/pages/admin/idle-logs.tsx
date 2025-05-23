import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, Briefcase, Clock } from "lucide-react";

interface IdleLog {
  id: string;
  user_id: string;
  project_id: string;
  idle_start: string;
  idle_end: string | null;
  duration_minutes: number | null;
  users?: {
    full_name: string;
    email: string;
  };
  projects?: {
    name: string;
  };
}

export default function AdminIdleLogs() {
  const [idleLogs, setIdleLogs] = useState<IdleLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedUser, selectedProject, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users and projects
      const [usersResponse, projectsResponse] = await Promise.all([
        supabase.from("users").select("id, full_name, email"),
        supabase.from("projects").select("id, name")
      ]);

      if (usersResponse.data) setUsers(usersResponse.data);
      if (projectsResponse.data) setProjects(projectsResponse.data);

      // Build query for idle logs with manual joins
      let query = supabase
        .from("idle_logs")
        .select("*")
        .gte('idle_start', format(selectedDate, 'yyyy-MM-dd'))
        .lt('idle_start', format(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
        .order('idle_start', { ascending: false });

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      }

      const { data: idleLogsData, error } = await query;

      if (error) throw error;

      // Manually join user and project data
      const enrichedLogs = (idleLogsData || []).map(log => {
        const user = usersResponse.data?.find(u => u.id === log.user_id);
        const project = projectsResponse.data?.find(p => p.id === log.project_id);
        
        return {
          ...log,
          users: user ? { full_name: user.full_name, email: user.email } : undefined,
          projects: project ? { name: project.name } : undefined
        };
      });

      setIdleLogs(enrichedLogs);
    } catch (error: any) {
      console.error("Error fetching idle logs:", error);
      toast({
        title: "Error fetching idle logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Idle Time Monitoring"
        subtitle="View user idle periods and productivity"
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'MMM dd, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedUser || 'all'} onValueChange={value => setSelectedUser(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <User className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Users" />
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

        <Select value={selectedProject || 'all'} onValueChange={value => setSelectedProject(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Briefcase className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Idle Time Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading idle logs...</div>
          ) : idleLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No idle logs found for the selected filters
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Idle Start</TableHead>
                    <TableHead>Idle End</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {idleLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.users?.full_name}
                      </TableCell>
                      <TableCell>{log.projects?.name}</TableCell>
                      <TableCell>
                        {format(new Date(log.idle_start), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.idle_end 
                          ? format(new Date(log.idle_end), 'HH:mm:ss')
                          : "Ongoing"
                        }
                      </TableCell>
                      <TableCell>
                        {formatDuration(log.duration_minutes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
