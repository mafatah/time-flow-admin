
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Clock, Focus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Cell, PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface UnusualActivity {
  id: string;
  user_id: string;
  detected_at: string;
  confidence: number;
  rule_triggered: string;
  duration_hm: string;
  notes: string;
  users: { full_name: string } | null;
}

interface WorkClassification {
  name: string;
  value: number;
  color: string;
}

export default function InsightsPage() {
  const { data: unusualActivities, isLoading: unusualLoading } = useQuery({
    queryKey: ['unusual-activities'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('unusual_activity' as any)
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching unusual activities:', error);
          return [] as UnusualActivity[];
        }
        
        return (data || []).map(item => ({
          ...item,
          users: { full_name: 'Unknown User' }
        })) as UnusualActivity[];
      } catch (error) {
        console.error('Error fetching unusual activities:', error);
        return [] as UnusualActivity[];
      }
    }
  });

  const { data: workClassification } = useQuery({
    queryKey: ['work-classification'],
    queryFn: async () => {
      try {
        const { data: screenshots } = await supabase
          .from('screenshots')
          .select('classification')
          .not('classification', 'is', null);

        const classifications = screenshots?.reduce((acc: any, screenshot: any) => {
          const classification = screenshot.classification || 'unclassified';
          acc[classification] = (acc[classification] || 0) + 1;
          return acc;
        }, {}) || {};

        return [
          { name: 'Core Work', value: classifications.core || 0, color: '#10b981' },
          { name: 'Non-Core', value: classifications.non_core || 0, color: '#f59e0b' },
          { name: 'Unproductive', value: classifications.unproductive || 0, color: '#ef4444' },
        ] as WorkClassification[];
      } catch (error) {
        console.error('Error fetching work classification:', error);
        return [] as WorkClassification[];
      }
    }
  });

  const { data: teamUtilization } = useQuery({
    queryKey: ['team-utilization'],
    queryFn: async () => {
      try {
        const { data: dashboardData } = await supabase
          .from('v_dashboard' as any)
          .select('weekly_activity_percent');
        
        if (dashboardData && dashboardData.length > 0) {
          const avgUtilization = dashboardData.reduce((acc: number, user: any) => 
            acc + (user.weekly_activity_percent || 0), 0) / dashboardData.length;
          return Math.round(avgUtilization);
        }
        
        return 75; // Default value
      } catch (error) {
        console.error('Error fetching team utilization:', error);
        return 75;
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Insights</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Team Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">{teamUtilization}%</div>
            <Progress value={teamUtilization} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Average weekly activity across all team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Focus className="h-5 w-5" />
              Work Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workClassification}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {workClassification?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {workClassification?.map((item, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Unusual Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {unusualActivities?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Detected anomalies this week
            </p>
            <div className="space-y-2">
              {unusualActivities?.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{activity.users?.full_name}</div>
                    <div className="text-muted-foreground">{activity.rule_triggered}</div>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {Math.round((activity.confidence || 0) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unusual Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {unusualLoading ? (
            <div>Loading unusual activities...</div>
          ) : (
            <div className="space-y-4">
              {unusualActivities?.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">{activity.users?.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.rule_triggered} • {new Date(activity.detected_at).toLocaleDateString()}
                      </div>
                      {activity.duration_hm && (
                        <div className="text-sm text-muted-foreground">
                          Duration: {activity.duration_hm}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">
                      {Math.round((activity.confidence || 0) * 100)}% confidence
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Unusual Activity Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <strong>Employee:</strong> {activity.users?.full_name}
                          </div>
                          <div>
                            <strong>Rule Triggered:</strong> {activity.rule_triggered}
                          </div>
                          <div>
                            <strong>Confidence:</strong> {Math.round((activity.confidence || 0) * 100)}%
                          </div>
                          <div>
                            <strong>Detected At:</strong> {new Date(activity.detected_at).toLocaleString()}
                          </div>
                          {activity.duration_hm && (
                            <div>
                              <strong>Duration:</strong> {activity.duration_hm}
                            </div>
                          )}
                          {activity.notes && (
                            <div>
                              <strong>Notes:</strong> {activity.notes}
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
              {(!unusualActivities || unusualActivities.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No unusual activity detected
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
