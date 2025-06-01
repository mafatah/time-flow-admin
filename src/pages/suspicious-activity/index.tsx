import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import { AlertTriangle, Eye, Clock, Smartphone, Globe, TrendingDown, User, Shield, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

interface SuspiciousActivity {
  user_id: string;
  risk_score: number;
  social_media_usage: number;
  news_consumption: number;
  idle_time_hours: number;
  unproductive_websites: number;
  entertainment_apps: number;
  low_focus_periods: number;
  screenshot_analysis: {
    total_screenshots: number;
    suspicious_screenshots: number;
    entertainment_count: number;
    social_media_count: number;
    news_count: number;
    gaming_count: number;
  };
  productivity_metrics: {
    avg_activity_level: number;
    productive_hours: number;
    total_hours: number;
    efficiency_rating: number;
  };
  flags: string[];
  last_analyzed: string;
}

// Suspicious domain patterns
const SUSPICIOUS_PATTERNS = {
  social_media: [
    'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'tiktok.com',
    'snapchat.com', 'reddit.com', 'pinterest.com', 'whatsapp.com', 'telegram.org'
  ],
  news: [
    'cnn.com', 'bbc.com', 'fox.com', 'reuters.com', 'ap.org', 'news.google.com',
    'yahoo.com/news', 'msn.com/news', 'nytimes.com', 'washingtonpost.com'
  ],
  entertainment: [
    'youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'twitch.tv',
    'spotify.com', 'soundcloud.com', 'tiktok.com', 'vine.co'
  ],
  gaming: [
    'steam.com', 'epic.com', 'battlenet.com', 'origin.com', 'uplay.com',
    'minecraft.net', 'roblox.com', 'twitch.tv/games'
  ],
  shopping: [
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'alibaba.com',
    'aliexpress.com', 'etsy.com', 'shopify.com'
  ]
};

export default function SuspiciousActivityPage() {
  const { userDetails } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateRange, setDateRange] = useState<number>(7); // days
  const [riskThreshold, setRiskThreshold] = useState<number>(70);
  const [detailsEmployee, setDetailsEmployee] = useState<SuspiciousActivity | null>(null);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchEmployees();
      analyzeSuspiciousActivity();
    }
  }, [userDetails, selectedEmployee, dateRange]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'employee')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  };

  const analyzeSuspiciousActivity = async () => {
    setAnalyzing(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);

      const employeesToAnalyze = selectedEmployee === 'all' 
        ? employees 
        : employees.filter(e => e.id === selectedEmployee);

      const activities: SuspiciousActivity[] = [];

      for (const employee of employeesToAnalyze) {
        const activity = await analyzeEmployeeActivity(employee.id, startDate, endDate);
        if (activity) {
          activities.push(activity);
        }
      }

      // Sort by risk score descending
      activities.sort((a, b) => b.risk_score - a.risk_score);
      setSuspiciousActivities(activities);
    } catch (error) {
      console.error('Error analyzing suspicious activity:', error);
      toast.error('Failed to analyze suspicious activity');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const analyzeEmployeeActivity = async (userId: string, startDate: Date, endDate: Date): Promise<SuspiciousActivity | null> => {
    try {
      // Fetch screenshots
      const { data: screenshots, error: screenshotError } = await supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (screenshotError) throw screenshotError;

      // Fetch URL logs
      const { data: urlLogs, error: urlError } = await supabase
        .from('url_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (urlError) throw urlError;

      // Fetch app logs
      const { data: appLogs, error: appError } = await supabase
        .from('app_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (appError) throw appError;

      // Fetch idle logs
      const { data: idleLogs, error: idleError } = await supabase
        .from('idle_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (idleError) throw idleError;

      // Analyze the data
      return performSuspiciousAnalysis(
        userId,
        screenshots || [],
        urlLogs || [],
        appLogs || [],
        idleLogs || []
      );
    } catch (error) {
      console.error(`Error analyzing activity for user ${userId}:`, error);
      return null;
    }
  };

  const performSuspiciousAnalysis = (
    userId: string,
    screenshots: any[],
    urlLogs: any[],
    appLogs: any[],
    idleLogs: any[]
  ): SuspiciousActivity => {
    let riskScore = 0;
    const flags: string[] = [];

    // Analyze URLs for suspicious patterns
    let socialMediaUsage = 0;
    let newsConsumption = 0;
    let unproductiveWebsites = 0;

    urlLogs.forEach(log => {
      const url = log.url.toLowerCase();
      
      if (SUSPICIOUS_PATTERNS.social_media.some(domain => url.includes(domain))) {
        socialMediaUsage++;
        riskScore += 2;
      }
      
      if (SUSPICIOUS_PATTERNS.news.some(domain => url.includes(domain))) {
        newsConsumption++;
        riskScore += 1;
      }
      
      if (SUSPICIOUS_PATTERNS.entertainment.some(domain => url.includes(domain))) {
        unproductiveWebsites++;
        riskScore += 3;
      }
      
      if (SUSPICIOUS_PATTERNS.gaming.some(domain => url.includes(domain))) {
        unproductiveWebsites++;
        riskScore += 4;
      }
      
      if (SUSPICIOUS_PATTERNS.shopping.some(domain => url.includes(domain))) {
        unproductiveWebsites++;
        riskScore += 2;
      }
    });

    // Analyze apps for entertainment/gaming
    let entertainmentApps = 0;
    appLogs.forEach(log => {
      const appName = log.app_name.toLowerCase();
      
      if (appName.includes('game') || appName.includes('steam') || 
          appName.includes('discord') || appName.includes('spotify')) {
        entertainmentApps++;
        riskScore += 3;
      }
    });

    // Calculate idle time
    const totalIdleTime = idleLogs.reduce((sum, log) => {
      if (log.end_time) {
        const start = new Date(log.start_time);
        const end = new Date(log.end_time);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
      }
      return sum;
    }, 0);

    // Analyze screenshots for suspicious content
    const screenshotAnalysis = {
      total_screenshots: screenshots.length,
      suspicious_screenshots: 0,
      entertainment_count: 0,
      social_media_count: 0,
      news_count: 0,
      gaming_count: 0
    };

    screenshots.forEach(screenshot => {
      // Analyze based on active window title and URL if available
      const title = (screenshot.active_window_title || '').toLowerCase();
      const url = (screenshot.url || '').toLowerCase();
      
      let isSuspicious = false;
      
      if (SUSPICIOUS_PATTERNS.social_media.some(domain => title.includes(domain.split('.')[0]) || url.includes(domain))) {
        screenshotAnalysis.social_media_count++;
        isSuspicious = true;
      }
      
      if (SUSPICIOUS_PATTERNS.entertainment.some(domain => title.includes(domain.split('.')[0]) || url.includes(domain))) {
        screenshotAnalysis.entertainment_count++;
        isSuspicious = true;
      }
      
      if (SUSPICIOUS_PATTERNS.news.some(domain => title.includes(domain.split('.')[0]) || url.includes(domain))) {
        screenshotAnalysis.news_count++;
        isSuspicious = true;
      }
      
      if (SUSPICIOUS_PATTERNS.gaming.some(domain => title.includes(domain.split('.')[0]) || url.includes(domain))) {
        screenshotAnalysis.gaming_count++;
        isSuspicious = true;
      }
      
      if (isSuspicious) {
        screenshotAnalysis.suspicious_screenshots++;
      }
    });

    // Calculate productivity metrics
    const totalHours = Math.max(1, dateRange * 8); // Assume 8 hour work days
    const productiveHours = Math.max(0, totalHours - totalIdleTime);
    const avgActivityLevel = Math.max(0, 100 - (totalIdleTime / totalHours * 100));
    const efficiencyRating = Math.max(0, 100 - riskScore);

    // Add flags based on analysis
    if (socialMediaUsage > 20) flags.push('High social media usage');
    if (newsConsumption > 15) flags.push('Excessive news consumption');
    if (totalIdleTime > totalHours * 0.3) flags.push('High idle time');
    if (entertainmentApps > 10) flags.push('Entertainment apps during work');
    if (screenshotAnalysis.suspicious_screenshots / screenshotAnalysis.total_screenshots > 0.3) {
      flags.push('Suspicious content in screenshots');
    }
    if (avgActivityLevel < 50) flags.push('Low activity level');
    if (unproductiveWebsites > 25) flags.push('Unproductive website usage');

    // Calculate final risk score (0-100)
    riskScore = Math.min(100, Math.max(0, riskScore + (totalIdleTime * 2) + (flags.length * 10)));

    return {
      user_id: userId,
      risk_score: Math.round(riskScore),
      social_media_usage: socialMediaUsage,
      news_consumption: newsConsumption,
      idle_time_hours: Math.round(totalIdleTime * 10) / 10,
      unproductive_websites: unproductiveWebsites,
      entertainment_apps: entertainmentApps,
      low_focus_periods: idleLogs.length,
      screenshot_analysis: screenshotAnalysis,
      productivity_metrics: {
        avg_activity_level: Math.round(avgActivityLevel),
        productive_hours: Math.round(productiveHours * 10) / 10,
        total_hours: Math.round(totalHours * 10) / 10,
        efficiency_rating: Math.round(efficiencyRating)
      },
      flags,
      last_analyzed: new Date().toISOString()
    };
  };

  const getEmployeeName = (userId: string): string => {
    const employee = employees.find(e => e.id === userId);
    return employee?.full_name || 'Unknown Employee';
  };

  const getRiskColor = (score: number): string => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'destructive';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  const filteredActivities = suspiciousActivities.filter(activity => 
    activity.risk_score >= riskThreshold
  );

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Suspicious Activity Detection
          </h1>
          <p className="text-muted-foreground">AI-powered analysis to identify unproductive employee behavior</p>
        </div>
        
        <Button onClick={analyzeSuspiciousActivity} disabled={analyzing}>
          <Search className="h-4 w-4 mr-2" />
          {analyzing ? 'Analyzing...' : 'Analyze Activity'}
        </Button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="employee-select">Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="date-range">Date Range</Label>
          <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 1 day</SelectItem>
              <SelectItem value="3">Last 3 days</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="risk-threshold">Risk Threshold</Label>
          <Select value={riskThreshold.toString()} onValueChange={(value) => setRiskThreshold(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Show All (0%)</SelectItem>
              <SelectItem value="30">Low Risk (30%+)</SelectItem>
              <SelectItem value="50">Medium Risk (50%+)</SelectItem>
              <SelectItem value="70">High Risk (70%+)</SelectItem>
              <SelectItem value="90">Critical Risk (90%+)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="text-sm">
            <div className="font-medium">Found: {filteredActivities.length} employees</div>
            <div className="text-muted-foreground">Above {riskThreshold}% risk</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {suspiciousActivities.filter(a => a.risk_score >= 80).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical Risk</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {suspiciousActivities.filter(a => a.risk_score >= 60 && a.risk_score < 80).length}
              </div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {suspiciousActivities.filter(a => a.risk_score >= 40 && a.risk_score < 60).length}
              </div>
              <div className="text-sm text-muted-foreground">Medium Risk</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {suspiciousActivities.filter(a => a.risk_score < 40).length}
              </div>
              <div className="text-sm text-muted-foreground">Low Risk</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Suspicious Activity Report
          </CardTitle>
          <CardDescription>
            Employees flagged for potentially unproductive behavior patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || analyzing ? (
            <div className="text-center py-8">
              {analyzing ? 'Analyzing employee activity patterns...' : 'Loading data...'}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No suspicious activity detected above {riskThreshold}% risk threshold.
              </p>
              <p className="text-sm text-muted-foreground">
                Try lowering the risk threshold or analyzing a different date range.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity) => {
                const employee = employees.find(e => e.id === activity.user_id);
                
                return (
                  <div key={activity.user_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{getEmployeeName(activity.user_id)}</h3>
                        <p className="text-sm text-muted-foreground">{employee?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskBadgeVariant(activity.risk_score)}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {activity.risk_score}% Risk
                        </Badge>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Detailed Analysis - {getEmployeeName(activity.user_id)}</DialogTitle>
                              <DialogDescription>
                                Comprehensive breakdown of suspicious activity patterns
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {/* Risk Factors */}
                              <div>
                                <h4 className="font-medium mb-2">Risk Factors</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>Social Media: {activity.social_media_usage} visits</div>
                                  <div>News Sites: {activity.news_consumption} visits</div>
                                  <div>Idle Time: {activity.idle_time_hours}h</div>
                                  <div>Entertainment Apps: {activity.entertainment_apps}</div>
                                </div>
                              </div>

                              {/* Screenshot Analysis */}
                              <div>
                                <h4 className="font-medium mb-2">Screenshot Analysis</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>Total Screenshots: {activity.screenshot_analysis.total_screenshots}</div>
                                  <div>Suspicious: {activity.screenshot_analysis.suspicious_screenshots}</div>
                                  <div>Entertainment: {activity.screenshot_analysis.entertainment_count}</div>
                                  <div>Social Media: {activity.screenshot_analysis.social_media_count}</div>
                                </div>
                              </div>

                              {/* Productivity Metrics */}
                              <div>
                                <h4 className="font-medium mb-2">Productivity Metrics</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>Activity Level: {activity.productivity_metrics.avg_activity_level}%</div>
                                  <div>Productive Hours: {activity.productivity_metrics.productive_hours}h</div>
                                  <div>Efficiency Rating: {activity.productivity_metrics.efficiency_rating}%</div>
                                  <div>Total Hours: {activity.productivity_metrics.total_hours}h</div>
                                </div>
                              </div>

                              {/* Flags */}
                              {activity.flags.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Red Flags</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {activity.flags.map((flag, index) => (
                                      <Badge key={index} variant="destructive">
                                        {flag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Social Media:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Smartphone className="h-4 w-4" />
                          {activity.social_media_usage} visits
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Idle Time:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-4 w-4" />
                          {activity.idle_time_hours}h
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Activity Level:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingDown className="h-4 w-4" />
                          {activity.productivity_metrics.avg_activity_level}%
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Efficiency:</span>
                        <div className="flex items-center gap-1 mt-1">
                          <User className="h-4 w-4" />
                          {activity.productivity_metrics.efficiency_rating}%
                        </div>
                      </div>
                    </div>

                    {activity.flags.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="font-medium text-sm">Red Flags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.flags.slice(0, 3).map((flag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {flag}
                            </Badge>
                          ))}
                          {activity.flags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{activity.flags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 