
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
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

interface ReportData {
  totalHours: number;
  totalUsers: number;
  totalProjects: number;
  avgHoursPerUser: number;
  topProjects: Array<{
    name: string;
    hours: number;
    percentage: number;
  }>;
  topUsers: Array<{
    name: string;
    hours: number;
    percentage: number;
  }>;
  dailyActivity: Array<{
    date: string;
    hours: number;
    users: number;
  }>;
  productivityMetrics: {
    activeTime: number;
    idleTime: number;
    focusScore: number;
  };
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dateRange, setDateRange] = useState("week");
  const [reportType, setReportType] = useState("overview");
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadReportData();
  }, [dateRange, userDetails]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
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
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "quarter":
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        default:
          startDate = subDays(now, 30);
      }

      // Fetch time logs with related data
      let query = supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          project_id,
          projects(
            id,
            name
          ),
          users(
            id,
            full_name,
            email
          )
        `)
        .not('end_time', 'is', null)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      // Filter by user role
      if (userDetails?.role === 'employee') {
        query = query.eq('user_id', userDetails.id);
      }

      const { data: timeLogs, error } = await query;
      if (error) throw error;

      // Process data for reports
      const processedData = processReportData(timeLogs || []);
      setReportData(processedData);

    } catch (error: any) {
      console.error('Error loading report data:', error);
      toast({
        title: "Error loading reports",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (timeLogs: any[]): ReportData => {
    // Calculate total hours
    let totalHours = 0;
    const userHours: { [key: string]: { name: string; hours: number } } = {};
    const projectHours: { [key: string]: { name: string; hours: number } } = {};
    const dailyActivity: { [key: string]: { hours: number; users: Set<string> } } = {};

    timeLogs.forEach(log => {
      if (log.end_time) {
        const start = new Date(log.start_time).getTime();
        const end = new Date(log.end_time).getTime();
        const hours = (end - start) / (1000 * 60 * 60);
        
        totalHours += hours;

        // User hours
        const userId = log.user_id;
        const userName = log.users?.full_name || 'Unknown User';
        if (!userHours[userId]) {
          userHours[userId] = { name: userName, hours: 0 };
        }
        userHours[userId].hours += hours;

        // Project hours
        const projectId = log.project_id || 'no-project';
        const projectName = log.projects?.name || 'No Project';
        if (!projectHours[projectId]) {
          projectHours[projectId] = { name: projectName, hours: 0 };
        }
        projectHours[projectId].hours += hours;

        // Daily activity
        const date = format(new Date(log.start_time), 'yyyy-MM-dd');
        if (!dailyActivity[date]) {
          dailyActivity[date] = { hours: 0, users: new Set() };
        }
        dailyActivity[date].hours += hours;
        dailyActivity[date].users.add(userId);
      }
    });

    // Sort and get top projects/users
    const topProjects = Object.values(projectHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map(project => ({
        name: project.name,
        hours: project.hours,
        percentage: totalHours > 0 ? (project.hours / totalHours) * 100 : 0
      }));

    const topUsers = Object.values(userHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
      .map(user => ({
        name: user.name,
        hours: user.hours,
        percentage: totalHours > 0 ? (user.hours / totalHours) * 100 : 0
      }));

    // Convert daily activity
    const dailyActivityArray = Object.entries(dailyActivity)
      .map(([date, data]) => ({
        date,
        hours: data.hours,
        users: data.users.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalHours,
      totalUsers: Object.keys(userHours).length,
      totalProjects: Object.keys(projectHours).length,
      avgHoursPerUser: Object.keys(userHours).length > 0 ? totalHours / Object.keys(userHours).length : 0,
      topProjects,
      topUsers,
      dailyActivity: dailyActivityArray,
      productivityMetrics: {
        activeTime: totalHours,
        idleTime: 0, // Would need idle tracking data
        focusScore: Math.min(100, (totalHours / 8) * 100) // Simple focus score based on 8h workday
      }
    };
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvData = [
      ['Report Type', 'Time Tracking Analytics'],
      ['Date Range', dateRange],
      ['Generated', format(new Date(), 'PPpp')],
      [''],
      ['Summary'],
      ['Total Hours', reportData.totalHours.toFixed(2)],
      ['Total Users', reportData.totalUsers.toString()],
      ['Total Projects', reportData.totalProjects.toString()],
      ['Average Hours per User', reportData.avgHoursPerUser.toFixed(2)],
      [''],
      ['Top Projects'],
      ['Project Name', 'Hours', 'Percentage'],
      ...reportData.topProjects.map(p => [p.name, p.hours.toFixed(2), p.percentage.toFixed(1) + '%']),
      [''],
      ['Top Users'],
      ['User Name', 'Hours', 'Percentage'],
      ...reportData.topUsers.map(u => [u.name, u.hours.toFixed(2), u.percentage.toFixed(1) + '%'])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time_tracking_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "Analytics report has been downloaded as CSV.",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Reports" subtitle="Analytics and insights" />
        <div className="text-center py-8">Loading reports...</div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="space-y-4">
        <PageHeader title="Reports" subtitle="Analytics and insights" />
        <div className="text-center py-8">No data available for the selected period.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Analytics and insights" />

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report Configuration</CardTitle>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="custom">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="projects">Projects</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Tracked in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Users with logged time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.avgHoursPerUser.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Average per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.topProjects.map((project, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" style={{
                      backgroundColor: `hsl(${index * 72}, 70%, 50%)`
                    }} />
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{project.hours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">{project.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.topUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="text-sm font-medium">{user.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{user.hours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">{user.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Daily Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.dailyActivity.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{format(new Date(day.date), 'EEEE, MMM dd')}</p>
                  <p className="text-sm text-gray-500">{day.users} active users</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{day.hours.toFixed(1)}h</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
