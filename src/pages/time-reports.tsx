
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Clock, Download, Filter, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface TimeReport {
  id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  users?: {
    full_name: string;
    email: string;
  };
  projects?: {
    name: string;
  };
}

export default function TimeReports() {
  const [reports, setReports] = useState<TimeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('week');
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadFilters();
  }, [userDetails]);

  useEffect(() => {
    loadReports();
  }, [selectedProject, selectedUser, dateFilter, userDetails]);

  const loadFilters = async () => {
    try {
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load users (only for admins)
      if (userDetails?.role === 'admin') {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .order('full_name');

        if (usersError) throw usersError;
        setUsers(usersData || []);
      }
    } catch (error: any) {
      console.error('Error loading filters:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let startDate: Date;
      const endDate = endOfDay(new Date());
      
      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(new Date());
          break;
        case 'week':
          startDate = startOfDay(subDays(new Date(), 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(new Date(), 30));
          break;
        default:
          startDate = startOfDay(subDays(new Date(), 7));
      }

      let query = supabase
        .from('time_logs')
        .select(`
          id,
          user_id,
          project_id,
          start_time,
          end_time,
          is_idle,
          users:user_id (full_name, email),
          projects:project_id (name)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      // Filter by user for employees
      if (userDetails?.role === 'employee') {
        query = query.eq('user_id', userDetails.id);
      } else if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      // Filter by project if selected
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      setReports(data || []);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 'Active';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = end - start;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTotalHours = () => {
    let totalMs = 0;
    reports.forEach(report => {
      if (report.end_time) {
        const start = new Date(report.start_time).getTime();
        const end = new Date(report.end_time).getTime();
        totalMs += (end - start);
      }
    });
    return (totalMs / (1000 * 60 * 60)).toFixed(1);
  };

  const exportCSV = () => {
    const csvData = reports.map(report => ({
      User: report.users?.full_name || 'Unknown',
      Email: report.users?.email || '',
      Project: report.projects?.name || 'Unknown',
      'Start Time': format(new Date(report.start_time), 'yyyy-MM-dd HH:mm:ss'),
      'End Time': report.end_time ? format(new Date(report.end_time), 'yyyy-MM-dd HH:mm:ss') : 'Active',
      Duration: formatDuration(report.start_time, report.end_time),
      'Is Idle': report.is_idle ? 'Yes' : 'No'
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Time Reports" subtitle="View detailed time tracking reports" />
        <div className="text-center py-8">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Time Reports" subtitle="View detailed time tracking reports" />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Summary
            </CardTitle>
            <Button onClick={exportCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{getTotalHours()}h</div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{reports.length}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {new Set(reports.map(r => r.user_id)).size}
              </div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userDetails?.role === 'admin' && (
              <div>
                <label className="text-sm font-medium mb-2 block">User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Logs ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {report.users?.full_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {report.projects?.name || 'Unknown Project'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(report.start_time), 'MMM dd, yyyy HH:mm')}
                      {report.end_time && ` - ${format(new Date(report.end_time), 'HH:mm')}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={report.end_time ? "secondary" : "default"}>
                      {formatDuration(report.start_time, report.end_time)}
                    </Badge>
                    {report.is_idle && (
                      <Badge variant="outline" className="ml-2">
                        Idle
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time logs found</p>
              <p className="text-sm">Try adjusting your filters or check back later</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
