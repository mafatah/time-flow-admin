
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { 
  Users, 
  Clock, 
  Camera, 
  AlertTriangle,
  Activity,
  BarChart3
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalHoursThisWeek: number;
  screenshotsToday: number;
  idleTime: number;
}

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  user_id: string;
  project_id: string | null;
  users?: {
    full_name: string;
  };
  projects?: {
    name: string;
  };
}

export default function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalHoursThisWeek: 0,
    screenshotsToday: 0,
    idleTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<TimeLog[]>([]);
  
  const { userDetails } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, [userDetails]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users (users with time logs this week)
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      
      const { data: activeUsersData } = await supabase
        .from('time_logs')
        .select('user_id')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      const activeUsers = new Set(activeUsersData?.map((log: any) => log.user_id)).size;

      // Get total hours this week
      const { data: timeLogsData } = await supabase
        .from('time_logs')
        .select('start_time, end_time')
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .filter('end_time', 'not.is', null);

      let totalHours = 0;
      timeLogsData?.forEach((log: any) => {
        if (log.end_time) {
          const start = new Date(log.start_time).getTime();
          const end = new Date(log.end_time).getTime();
          totalHours += (end - start) / (1000 * 60 * 60);
        }
      });

      // Get screenshots today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { count: screenshotsToday } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true })
        .gte('captured_at', today.toISOString())
        .lt('captured_at', tomorrow.toISOString());

      // Get recent activity (recent time logs with project info)
      const { data: recentLogs } = await supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          project_id,
          users:user_id (full_name),
          projects:project_id (name)
        `)
        .order('start_time', { ascending: false })
        .limit(10);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalHoursThisWeek: Math.round(totalHours * 10) / 10,
        screenshotsToday: screenshotsToday || 0,
        idleTime: 0 // This would need to be calculated based on idle logs
      });

      setRecentActivity(recentLogs || []);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHoursThisWeek}h</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Screenshots Today</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.screenshotsToday}</div>
            <p className="text-xs text-muted-foreground">
              Captured automatically
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity: TimeLog) => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium">
                      {activity.users?.full_name || 'Unknown User'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.projects?.name || 'Unknown Project'}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={activity.end_time ? "secondary" : "default"}>
                      {formatDuration(activity.start_time, activity.end_time)}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.start_time), 'MMM dd, HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
