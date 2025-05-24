
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Users, Activity, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardUser {
  id: string;
  full_name: string;
  email: string;
  hours_today: number;
  hours_this_week: number;
  recent_screenshot_url: string | null;
  weekly_activity_percent: number;
  low_activity: boolean;
}

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_hours_today: number;
  average_activity: number;
}

export function EnhancedDashboard() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard view data with type assertion
      const { data: dashboardData, error: dashboardError } = await (supabase as any)
        .from('v_dashboard')
        .select('*');

      if (dashboardError) {
        console.error('Dashboard data error:', dashboardError);
        setUsers([]);
      } else {
        setUsers((dashboardData || []) as DashboardUser[]);
      }

      // Calculate stats from users data
      if (dashboardData && Array.isArray(dashboardData)) {
        const totalUsers = dashboardData.length;
        const activeUsers = dashboardData.filter(user => user.hours_today > 0).length;
        const totalHoursToday = dashboardData.reduce((sum, user) => sum + (user.hours_today || 0), 0);
        const averageActivity = dashboardData.reduce((sum, user) => sum + (user.weekly_activity_percent || 0), 0) / totalUsers;

        setStats({
          total_users: totalUsers,
          active_users: activeUsers,
          total_hours_today: totalHoursToday,
          average_activity: averageActivity || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Enhanced Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((stats?.total_hours_today || 0) * 100) / 100}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Activity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats?.average_activity || 0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>Current status of all team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={user.recent_screenshot_url || undefined} />
                      <AvatarFallback>
                        {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{Math.round((user.hours_today || 0) * 100) / 100}h today</div>
                      <div className="text-sm text-muted-foreground">{Math.round((user.hours_this_week || 0) * 100) / 100}h this week</div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={user.low_activity ? "destructive" : "default"}>
                        {Math.round(user.weekly_activity_percent || 0)}% activity
                      </Badge>
                      {user.low_activity && (
                        <Badge variant="outline" className="text-xs">
                          Low Activity
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No user data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
