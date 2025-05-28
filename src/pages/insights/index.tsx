import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingUp, Clock, Monitor } from "lucide-react";
import { format } from "date-fns";

interface UnusualActivity {
  id: string;
  rule_triggered: string;
  confidence: number | null;
  detected_at: string;
  duration_hm: string | null;
  notes: string | null;
}

interface ActivityPattern {
  hour: number;
  activity_count: number;
  avg_productivity: number;
}

interface ProductivityTrend {
  date: string;
  avg_productivity: number;
  total_screenshots: number;
}

export default function Insights() {
  const [unusualActivities, setUnusualActivities] = useState<UnusualActivity[]>([]);
  const [activityPatterns, setActivityPatterns] = useState<ActivityPattern[]>([]);
  const [productivityTrends, setProductivityTrends] = useState<ProductivityTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      
      // Fetch unusual activities
      const { data: unusual, error: unusualError } = await supabase
        .from('unusual_activity')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (unusualError) {
        console.error('Error fetching unusual activities:', unusualError);
      } else {
        setUnusualActivities(unusual || []);
      }

      // Fetch activity patterns by hour
      const { data: screenshots, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('captured_at, activity_percent')
        .gte('captured_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (screenshotsError) {
        console.error('Error fetching screenshots:', screenshotsError);
      } else if (screenshots) {
        // Process activity patterns by hour
        const hourlyData: { [key: number]: { total: number; count: number; productivity: number } } = {};
        
        screenshots.forEach(screenshot => {
          const hour = new Date(screenshot.captured_at).getHours();
          if (!hourlyData[hour]) {
            hourlyData[hour] = { total: 0, count: 0, productivity: 0 };
          }
          hourlyData[hour].count++;
          hourlyData[hour].productivity += screenshot.activity_percent || 0;
        });

        const patterns = Object.entries(hourlyData).map(([hour, data]) => ({
          hour: parseInt(hour),
          activity_count: data.count,
          avg_productivity: data.count > 0 ? data.productivity / data.count : 0
        }));

        setActivityPatterns(patterns);

        // Process productivity trends by day
        const dailyData: { [key: string]: { total: number; count: number } } = {};
        
        screenshots.forEach(screenshot => {
          const date = format(new Date(screenshot.captured_at), 'yyyy-MM-dd');
          if (!dailyData[date]) {
            dailyData[date] = { total: 0, count: 0 };
          }
          dailyData[date].count++;
          dailyData[date].total += screenshot.activity_percent || 0;
        });

        const trends = Object.entries(dailyData).map(([date, data]) => ({
          date,
          avg_productivity: data.count > 0 ? data.total / data.count : 0,
          total_screenshots: data.count
        }));

        setProductivityTrends(trends.sort((a, b) => a.date.localeCompare(b.date)));
      }

      await analyzeActivityPatterns();
      
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeActivityPatterns = async () => {
    try {
      // Get recent screenshots for analysis
      const { data: recentScreenshots, error } = await supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('captured_at', { ascending: false });

      if (error || !recentScreenshots) {
        console.error('Error fetching recent screenshots:', error);
        return;
      }

      // Analyze for unusual patterns
      const lowActivityCount = recentScreenshots.filter(s => (s.activity_percent || 0) < 10).length;
      const totalCount = recentScreenshots.length;
      
      if (totalCount > 0 && lowActivityCount / totalCount > 0.5) {
        await createUnusualActivityRecord(
          'high_idle_percentage',
          75, // Fixed to use 0-100 scale
          `High idle time detected: ${Math.round((lowActivityCount / totalCount) * 100)}% of recent activity shows low engagement`
        );
      }

      // Check for late night activity
      const lateNightActivity = recentScreenshots.filter(s => {
        const hour = new Date(s.captured_at).getHours();
        return hour >= 22 || hour <= 5;
      }).length;

      if (lateNightActivity > 5) {
        await createUnusualActivityRecord(
          'unusual_work_hours',
          80, // Fixed to use 0-100 scale
          `${lateNightActivity} screenshots captured during late night/early morning hours`
        );
      }

    } catch (error) {
      console.error('Error analyzing activity patterns:', error);
    }
  };

  const createUnusualActivityRecord = async (rule: string, confidence: number, notes: string) => {
    try {
      const { data, error } = await supabase
        .from('unusual_activity')
        .insert({
          user_id: '189a8371-8aaf-4551-9b33-8fed7f4cee5d',
          rule_triggered: rule,
          confidence: confidence, // Now using 0-100 scale as per fixed constraint
          notes: notes
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('duplicate')) {
          // Ignore duplicate entries
          return;
        } else if (error.message.includes('row-level security') || error.message.includes('confidence_check')) {
          console.warn('⚠️ Database constraint issue - unusual activity not saved:', error.message);
          console.log('📋 Please apply the database fixes from apply-constraint-fixes.cjs');
          return;
        } else {
          console.error('Error creating unusual activity record:', error);
        }
      } else {
        console.log('Created unusual activity record:', data);
      }
    } catch (error) {
      console.error('Error creating unusual activity record:', error);
    }
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "bg-gray-500";
    if (confidence >= 80) return "bg-red-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getSeverityBadge = (confidence: number | null) => {
    if (!confidence) return <Badge variant="outline">Unknown</Badge>;
    if (confidence >= 80) return <Badge variant="destructive">High</Badge>;
    if (confidence >= 60) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading insights...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insights & Analytics</h1>
          <p className="text-gray-600">AI-powered analysis of activity patterns and unusual behavior</p>
        </div>
      </div>

      <Tabs defaultValue="unusual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="unusual">Unusual Activity</TabsTrigger>
          <TabsTrigger value="patterns">Activity Patterns</TabsTrigger>
          <TabsTrigger value="trends">Productivity Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="unusual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Unusual Activity Detected
              </CardTitle>
              <CardDescription>
                AI-detected anomalies in work patterns and behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unusualActivities.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No unusual activity detected in recent data.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {unusualActivities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{activity.rule_triggered.replace(/_/g, ' ').toUpperCase()}</span>
                          {getSeverityBadge(activity.confidence)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {format(new Date(activity.detected_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Confidence:</span>
                        <Progress value={activity.confidence || 0} className="flex-1 max-w-32" />
                        <span className="text-sm font-medium">{activity.confidence || 0}%</span>
                      </div>
                      
                      {activity.notes && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {activity.notes}
                        </p>
                      )}
                      
                      {activity.duration_hm && (
                        <p className="text-sm text-gray-500">
                          Duration: {activity.duration_hm}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Activity Patterns
              </CardTitle>
              <CardDescription>
                Activity distribution throughout the day (last 7 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activityPatterns
                  .sort((a, b) => a.hour - b.hour)
                  .map((pattern) => (
                    <div key={pattern.hour} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{pattern.hour}:00</span>
                        <Badge variant="outline">{pattern.activity_count} captures</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Avg Productivity:</span>
                          <span>{Math.round(pattern.avg_productivity)}%</span>
                        </div>
                        <Progress value={pattern.avg_productivity} />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Productivity Trends
              </CardTitle>
              <CardDescription>
                Productivity trends over the last week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productivityTrends.map((trend) => (
                  <div key={trend.date} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{format(new Date(trend.date), 'MMM dd, yyyy')}</span>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">{trend.total_screenshots} screenshots</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Average Productivity:</span>
                        <span>{Math.round(trend.avg_productivity)}%</span>
                      </div>
                      <Progress value={trend.avg_productivity} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
