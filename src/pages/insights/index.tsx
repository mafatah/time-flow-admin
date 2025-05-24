
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, AlertTriangle, Eye, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface UnusualActivity {
  id: string;
  user_id: string;
  detected_at: string;
  confidence: number;
  rule_triggered: string;
  duration_hm: string | null;
  notes: string | null;
  users: { full_name: string };
}

interface UtilizationData {
  user_id: string;
  full_name: string;
  total_hours: number;
  productive_hours: number;
  utilization_rate: number;
}

export default function InsightsPage() {
  const { data: unusualActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['unusual-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unusual_activity')
        .select(`
          *,
          users (full_name)
        `)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data as UnusualActivity[];
    }
  });

  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['utilization'],
    queryFn: async () => {
      // Mock utilization data - in real app, this would be calculated from time_logs and app_logs
      const mockData: UtilizationData[] = [
        { user_id: '1', full_name: 'John Doe', total_hours: 40, productive_hours: 32, utilization_rate: 80 },
        { user_id: '2', full_name: 'Jane Smith', total_hours: 38, productive_hours: 30, utilization_rate: 79 },
        { user_id: '3', full_name: 'Bob Wilson', total_hours: 35, productive_hours: 21, utilization_rate: 60 },
      ];
      return mockData;
    }
  });

  const { data: workClassification } = useQuery({
    queryKey: ['work-classification'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screenshots')
        .select('classification')
        .not('classification', 'is', null);

      if (error) throw error;
      
      const counts = data.reduce((acc, item) => {
        acc[item.classification] = (acc[item.classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      return Object.entries(counts).map(([type, count]) => ({
        type,
        count,
        percentage: (count / total) * 100
      }));
    }
  });

  const averageUtilization = utilizationData?.reduce((acc, user) => acc + user.utilization_rate, 0) / (utilizationData?.length || 1);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Insights & Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Team Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{averageUtilization?.toFixed(1)}%</span>
                <Badge variant={averageUtilization > 75 ? 'default' : 'secondary'}>
                  {averageUtilization > 75 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
              <Progress value={averageUtilization} className="h-3" />
              <p className="text-sm text-muted-foreground">
                Average team productivity utilization this week
              </p>
              
              {utilizationLoading ? (
                <div>Loading utilization data...</div>
              ) : (
                <div className="space-y-2">
                  {utilizationData?.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between text-sm">
                      <span>{user.full_name}</span>
                      <span className="font-medium">{user.utilization_rate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Work Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workClassification?.map((item) => (
                <div key={item.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{item.type.replace('_', ' ')}</span>
                    <span className="text-sm font-medium">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
              {(!workClassification || workClassification.length === 0) && (
                <p className="text-sm text-muted-foreground">No classification data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Unusual Activity Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div>Loading unusual activities...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Detected</TableHead>
                  <TableHead>Rule Triggered</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unusualActivities?.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.users.full_name}</TableCell>
                    <TableCell>{format(new Date(activity.detected_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell>{activity.rule_triggered}</TableCell>
                    <TableCell>
                      <Badge variant={activity.confidence > 0.8 ? 'destructive' : 'secondary'}>
                        {(activity.confidence * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{activity.duration_hm || 'N/A'}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Activity Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <strong>Employee:</strong> {activity.users.full_name}
                            </div>
                            <div>
                              <strong>Rule:</strong> {activity.rule_triggered}
                            </div>
                            <div>
                              <strong>Confidence:</strong> {(activity.confidence * 100).toFixed(0)}%
                            </div>
                            {activity.notes && (
                              <div>
                                <strong>Notes:</strong> {activity.notes}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {(!unusualActivities || unusualActivities.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No unusual activities detected
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
