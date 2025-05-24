
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardUser {
  id: string;
  full_name: string;
  email: string;
  hours_today: number;
  hours_this_week: number;
  weekly_activity_percent: number;
  low_activity: boolean;
  recent_screenshot_url: string | null;
}

export default function EnhancedDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // Try to use the dashboard view first
      const { data: viewData, error: viewError } = await supabase
        .from('v_dashboard' as any)
        .select('*');
      
      if (!viewError && viewData) {
        return viewData as DashboardUser[];
      }

      // Fallback to basic user data if view doesn't exist
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Transform basic user data to match expected interface
      return users.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        hours_today: 0,
        hours_this_week: 0,
        weekly_activity_percent: 0,
        low_activity: false,
        recent_screenshot_url: null
      })) as DashboardUser[];
    }
  });

  const { data: totalStats } = useQuery({
    queryKey: ['total-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      // Get basic stats from time_logs
      const { data: todayLogs } = await supabase
        .from('time_logs')
        .select('*')
        .gte('start_time', today);
      
      const { data: weekLogs } = await supabase
        .from('time_logs')
        .select('*')
        .gte('start_time', weekStart.toISOString());
      
      const { data: activeLogs } = await supabase
        .from('time_logs')
        .select('user_id')
        .gte('start_time', today)
        .is('end_time', null);
      
      return {
        todayHours: todayLogs?.length || 0,
        weekHours: weekLogs?.length || 0,
        activeUsers: new Set(activeLogs?.map(u => u.user_id)).size || 0
      };
    }
  });

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  const lowActivityUsers = dashboardData?.filter(user => user.low_activity) || [];
  const avgWeeklyActivity = dashboardData?.reduce((acc, user) => acc + user.weekly_activity_percent, 0) / (dashboardData?.length || 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.reduce((acc, user) => acc + (user.hours_today || 0), 0).toFixed(1) || 0}h
            </div>
            <p className="text-xs text-muted-foreground">Total logged today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWeeklyActivity.toFixed(1)}%</div>
            <Progress value={avgWeeklyActivity} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowActivityUsers.length}</div>
            <p className="text-xs text-muted-foreground">Users below 60%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low Activity Users</CardTitle>
            <CardDescription>Users with less than 60% activity this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowActivityUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="destructive">
                    {user.weekly_activity_percent.toFixed(1)}%
                  </Badge>
                </div>
              ))}
              {lowActivityUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">All users are performing well!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Screenshots</CardTitle>
            <CardDescription>Latest activity snapshots from today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {dashboardData
                ?.filter(user => user.recent_screenshot_url)
                .slice(0, 9)
                .map((user) => (
                  <div key={user.id} className="relative group">
                    <img
                      src={user.recent_screenshot_url!}
                      alt={`${user.full_name}'s activity`}
                      className="w-full h-20 object-cover rounded border"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                      <p className="text-white text-xs font-medium">{user.full_name}</p>
                    </div>
                  </div>
                ))}
            </div>
            {!dashboardData?.some(user => user.recent_screenshot_url) && (
              <p className="text-sm text-muted-foreground">No screenshots captured today</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
