
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UnusualActivity {
  id: string;
  user_id: string;
  detected_at: string;
  confidence: number;
  duration_hm: string;
  notes: string;
  rule_triggered: string;
}

interface ProductivityInsight {
  productivity_score: number;
  total_time_seconds: number;
  productive_time_seconds: number;
  app_breakdown: Record<string, any>;
  url_breakdown: Record<string, any>;
}

export default function InsightsPage() {
  const [unusualActivities, setUnusualActivities] = useState<UnusualActivity[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityInsight | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    try {
      // Fetch unusual activity with type assertion
      const { data: activityData, error: activityError } = await (supabase as any)
        .from('unusual_activity')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (activityError) {
        console.error('Unusual activity error:', activityError);
        setUnusualActivities([]);
      } else {
        setUnusualActivities((activityData || []) as UnusualActivity[]);
      }

      // For now, set mock productivity data since we'd need the backend API for real data
      setProductivityData({
        productivity_score: 75,
        total_time_seconds: 28800, // 8 hours
        productive_time_seconds: 21600, // 6 hours
        app_breakdown: {},
        url_breakdown: {},
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
      setUnusualActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getRuleIcon = (rule: string) => {
    switch (rule) {
      case 'low_activity':
        return <TrendingDown className="h-4 w-4" />;
      case 'long_session':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getRuleBadgeVariant = (rule: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (rule) {
      case 'low_activity':
        return 'destructive';
      case 'long_session':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Productivity Insights</h1>
      </div>

      {/* Productivity Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productivityData?.productivity_score || 0}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((productivityData?.total_time_seconds || 0) / 3600 * 100) / 100}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Productive Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((productivityData?.productive_time_seconds || 0) / 3600 * 100) / 100}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unusual Activity Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Unusual Activity Detection</CardTitle>
          <CardDescription>
            Recent unusual patterns detected in user behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unusualActivities.length > 0 ? (
              unusualActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getRuleIcon(activity.rule_triggered)}
                    <div>
                      <div className="font-medium">{activity.rule_triggered.replace('_', ' ').toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.notes}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRuleBadgeVariant(activity.rule_triggered)}>
                      {Math.round((activity.confidence || 0) * 100)}% confidence
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {activity.duration_hm}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No unusual activity detected recently
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
