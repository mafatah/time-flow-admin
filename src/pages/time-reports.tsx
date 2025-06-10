import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/use-toast';
import { format, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Clock, Download, Filter, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Add logging for module loading
console.log('🚀 TimeReports module loaded successfully');
console.log('📦 Checking dependencies:', {
  react: !!React,
  supabase: !!supabase,
  components: {
    Card: !!Card,
    Button: !!Button,
    Badge: !!Badge,
    Select: !!Select,
    Input: !!Input,
    Table: !!Table
  }
});

interface TimeReport {
  id: string;
  user_id: string;
  project_id: string | null; // Updated to allow null
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
  user_name?: string;
  user_email?: string;
  project_name?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export default function TimeReports() {
  console.log('🔧 TimeReports component function called');
  
  const [reports, setReports] = useState<TimeReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: 'all',
    projectId: 'all',
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    includeIdle: true
  });

  console.log('🎯 Initial state set:', {
    reportsCount: reports.length,
    usersCount: users.length,
    projectsCount: projects.length,
    loading,
    filters
  });

  const { user } = useAuth();
  const { toast } = useToast();

  console.log('🔐 Auth context:', { 
    hasUser: !!user, 
    userId: user?.id,
    hasToast: !!toast 
  });

  useEffect(() => {
    console.log('🔄 Initial useEffect triggered - mounting component');
    console.log('📡 Starting initial data fetch...');
    
    const initializeComponent = async () => {
      try {
        console.log('👥 Fetching users...');
        await fetchUsers();
        
        console.log('📋 Fetching projects...');
        await fetchProjects();
        
        console.log('📊 Fetching reports...');
        await fetchReports();
        
        console.log('✅ Component initialization complete');
      } catch (error) {
        console.error('❌ Error during component initialization:', error);
      }
    };

    initializeComponent();
  }, []);

  useEffect(() => {
    console.log('🔄 Filters useEffect triggered - filters changed:', filters);
    console.log('📊 Re-fetching reports due to filter change...');
    fetchReports();
  }, [filters]);

  const fetchUsers = async () => {
    console.log('👥 Starting fetchUsers');
    try {
      console.log('📡 Making Supabase query for users...');
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      console.log('👥 Users query response:', { data: data?.length || 0, error });

      if (error) {
        console.error('❌ Error in users query:', error);
        throw error;
      }
      
      console.log('✅ Users fetched successfully:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    }
  };

  const fetchProjects = async () => {
    console.log('📋 Starting fetchProjects');
    try {
      console.log('📡 Making Supabase query for projects...');
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      console.log('📋 Projects query response:', { data: data?.length || 0, error });

      if (error) {
        console.error('❌ Error in projects query:', error);
        throw error;
      }
      
      console.log('✅ Projects fetched successfully:', data?.length || 0);
      setProjects(data || []);
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch projects',
        variant: 'destructive',
      });
    }
  };

  const fetchReports = async () => {
    console.log('📊 Starting fetchReports');
    setLoading(true);
    try {
      const startDate = startOfDay(new Date(filters.startDate));
      const endDate = endOfDay(new Date(filters.endDate));

      console.log('📅 Date range for query:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        filters
      });

      // Use a direct SQL-like query with joins to get user and project data
      let query = supabase
        .from('time_logs')
        .select(`
          *,
          users!fk_time_logs_user(id, full_name, email),
          projects!fk_time_logs_project(id, name)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      console.log('🔍 Building query with filters...');

      if (filters.userId && filters.userId !== 'all') {
        console.log('👤 Adding user filter:', filters.userId);
        query = query.eq('user_id', filters.userId);
      }

      if (filters.projectId && filters.projectId !== 'all') {
        console.log('📁 Adding project filter:', filters.projectId);
        query = query.eq('project_id', filters.projectId);
      }

      if (!filters.includeIdle) {
        console.log('⚡ Excluding idle time logs');
        query = query.eq('is_idle', false);
      }

      console.log('📡 Executing time logs query...');
      const { data: timeLogData, error } = await query
        .order('start_time', { ascending: false });

      console.log('📊 Time logs query response:', { 
        dataCount: timeLogData?.length || 0, 
        error,
        hasData: !!timeLogData
      });

      if (error) {
        console.error('❌ Error in time logs query:', error);
        throw error;
      }

      if (!timeLogData || timeLogData.length === 0) {
        console.log('📊 No time log data found');
        setReports([]);
        return;
      }

      console.log('🔄 Processing time log data...');
      // Map the joined data directly
      const enrichedReports = timeLogData.map((report, index) => {
        const enriched = {
          ...report,
          user_name: (report as any).users?.full_name || 'Unknown User',
          user_email: (report as any).users?.email || 'Unknown',
          project_name: (report as any).projects?.name || 'Unknown Project'
        };
        
        if (index < 3) { // Log first 3 records for debugging
          console.log(`📝 Enriched record ${index}:`, {
            id: enriched.id,
            user_name: enriched.user_name,
            project_name: enriched.project_name,
            start_time: enriched.start_time,
            is_idle: enriched.is_idle
          });
        }
        
        return enriched;
      });

      console.log('✅ Reports processed successfully:', enrichedReports.length);
      setReports(enrichedReports);
    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch time reports',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 fetchReports completed, setting loading to false');
      setLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string | null): string => {
    if (!end) return 'Ongoing';
    
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    console.log('📥 Starting CSV export with', reports.length, 'reports');
    try {
      const csvData = reports.map((report: TimeReport) => ({
        'User': report.user_name,
        'Email': report.user_email,
        'Project': report.project_name,
        'Start Time': format(new Date(report.start_time), 'yyyy-MM-dd HH:mm:ss'),
        'End Time': report.end_time ? format(new Date(report.end_time), 'yyyy-MM-dd HH:mm:ss') : 'Ongoing',
        'Duration': calculateDuration(report.start_time, report.end_time),
        'Status': report.is_idle ? 'Idle' : 'Active'
      }));

      const csvHeaders = Object.keys(csvData[0] || {});
      const csvRows = csvData.map(row => 
        csvHeaders.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
      );
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `time-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      
      console.log('✅ CSV export successful');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Report exported successfully',
      });
    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to export to CSV',
        variant: 'destructive',
      });
    }
  };

  const getTotalHours = (): string => {
    const totalMs = reports.reduce((total, report) => {
      const start = new Date(report.start_time);
      const end = report.end_time ? new Date(report.end_time) : new Date(); // Use current time for ongoing sessions
      return total + (end.getTime() - start.getTime());
    }, 0);

    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const filteredReports = reports.filter(report => {
    if (filters.userId && filters.userId !== 'all' && report.user_id !== filters.userId) return false;
    if (filters.projectId && filters.projectId !== 'all' && report.project_id !== filters.projectId) return false;
    if (!filters.includeIdle && report.is_idle) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Time Reports</h1>
        <Button onClick={exportToCSV} disabled={reports.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select 
                value={filters.projectId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Include Idle Time</label>
              <Select 
                value={filters.includeIdle ? 'true' : 'false'} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, includeIdle: value === 'true' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{getTotalHours()}</div>
            <div className="text-sm text-gray-500">Total Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {reports.filter(r => !r.is_idle).length}
            </div>
            <div className="text-sm text-gray-500">Active Sessions</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Log Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No time logs found for the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{report.user_name}</div>
                        <div className="text-sm text-gray-500">{report.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{report.project_name}</TableCell>
                    <TableCell>
                      {format(new Date(report.start_time), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {report.end_time 
                        ? format(new Date(report.end_time), 'MMM d, yyyy HH:mm')
                        : 'Ongoing'
                      }
                    </TableCell>
                    <TableCell>
                      {calculateDuration(report.start_time, report.end_time)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={report.is_idle ? 'secondary' : 'default'}>
                        {report.is_idle ? 'Idle' : 'Active'}
                      </Badge>
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
