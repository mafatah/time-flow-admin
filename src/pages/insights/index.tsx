import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Clock, 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Monitor,
  Globe,
  MousePointer,
  Keyboard,
  Coffee,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  User,
  TrendingDown,
  Zap
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface WorkClassification {
  category: string;
  hours: number;
  percentage: number;
  color: string;
}

interface FocusData {
  name: string;
  value: number;
  color: string;
}

interface UnusualActivity {
  id: string;
  user_id: string;
  rule_triggered: string;
  confidence: number | null;
  detected_at: string;
  duration_hm: string | null;
  notes: string | null;
  user?: {
    email: string;
    full_name?: string;
  };
}

interface ActivityPattern {
  user_id: string;
  total_time: number;
  screenshot_count: number;
  app_switches: number;
  idle_time: number;
  productivity_score: number;
  unusual_patterns: string[];
}

interface ProductivityTrend {
  time: string;
  productivity: number;
  focus: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface InsightsData {
  utilization: number;
  workClassification: WorkClassification[];
  focusData: FocusData[];
  unusualActivities: UnusualActivity[];
  productivityTrends: ProductivityTrend[];
}

const InsightsPage = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [insights, setInsights] = useState<InsightsData>({
    utilization: 0,
    workClassification: [],
    focusData: [],
    unusualActivities: [],
    productivityTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [unusualActivities, setUnusualActivities] = useState<UnusualActivity[]>([]);
  const [activityPatterns, setActivityPatterns] = useState<ActivityPattern[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  // Load real data from Supabase
  useEffect(() => {
    loadInsightsData();
    fetchUnusualActivities();
    fetchUsers();
    analyzeActivityPatterns();
  }, [selectedDate]);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      
      // Mock data with real-like unusual activities (will be replaced with real data once backend is connected)
      const mockUnusualActivities: UnusualActivity[] = [
        {
          id: '1',
          rule_triggered: 'low_activity',
          confidence: 0.85,
          detected_at: new Date().toISOString(),
          duration_hm: '45m',
          notes: 'User idle for 45 minutes during work hours',
          user_id: 'user1',
          user: { full_name: 'John Doe', email: 'john.doe@company.com' }
        },
        {
          id: '2',
          rule_triggered: 'activity_drop',
          confidence: 0.72,
          detected_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          duration_hm: '2h',
          notes: 'Activity level dropped from 85% to 25%',
          user_id: 'user2',
          user: { full_name: 'Jane Smith', email: 'jane.smith@company.com' }
        },
        {
          id: '3',
          rule_triggered: 'long_session',
          confidence: 0.90,
          detected_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          duration_hm: '6h',
          notes: 'Continuous session detected for 6 hours without break',
          user_id: 'user3',
          user: { full_name: 'Mike Wilson', email: 'mike.wilson@company.com' }
        }
      ];

      const mockInsights = {
        utilization: 78,
        workClassification: [
          { category: 'Development', hours: 6.5, percentage: 54, color: '#3b82f6' },
          { category: 'Communication', hours: 2.0, percentage: 17, color: '#10b981' },
          { category: 'Research', hours: 1.5, percentage: 13, color: '#f59e0b' },
          { category: 'Meetings', hours: 1.2, percentage: 10, color: '#ef4444' },
          { category: 'Other', hours: 0.8, percentage: 6, color: '#6b7280' }
        ],
        focusData: [
          { name: 'Deep Focus', value: 45, color: '#10b981' },
          { name: 'Light Focus', value: 30, color: '#f59e0b' },
          { name: 'Distracted', value: 15, color: '#ef4444' },
          { name: 'Idle', value: 10, color: '#6b7280' }
        ],
        unusualActivities: mockUnusualActivities,
        productivityTrends: [
          { time: '09:00', productivity: 85, focus: 90 },
          { time: '10:00', productivity: 92, focus: 88 },
          { time: '11:00', productivity: 78, focus: 75 },
          { time: '12:00', productivity: 45, focus: 40 },
          { time: '13:00', productivity: 65, focus: 70 },
          { time: '14:00', productivity: 88, focus: 85 },
          { time: '15:00', productivity: 82, focus: 80 },
          { time: '16:00', productivity: 75, focus: 78 },
          { time: '17:00', productivity: 70, focus: 72 }
        ]
      };

      const mockNotifications: Notification[] = [
        {
          id: 1,
          type: 'warning',
          title: 'Low Productivity Alert',
          message: '3 employees showing productivity below 60% today',
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          type: 'info',
          title: 'Weekly Report Ready',
          message: 'Team productivity report for week 21 is available',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          read: false
        }
      ];

      setInsights(mockInsights);
      setNotifications(mockNotifications);
      
    } catch (error) {
      console.error('Error loading insights data:', error);
      toast({
        title: 'Error loading data',
        description: 'Failed to load insights data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnusualActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('unusual_activity')
        .select(`*`)
        .order('detected_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch user data separately
      const userIds = [...new Set(data?.map(activity => activity.user_id) || [])];
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      // Enrich activities with user data
      const enrichedActivities = data?.map(activity => ({
        ...activity,
        user: userData?.find(user => user.id === activity.user_id)
      })) || [];

      setUnusualActivities(enrichedActivities);
    } catch (error) {
      console.error('Error fetching unusual activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'employee');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const analyzeActivityPatterns = async () => {
    try {
      // Analyze recent activity patterns for unusual behavior
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      // Get time logs for analysis
      const { data: timeLogs, error: timeError } = await supabase
        .from('time_logs')
        .select('*')
        .gte('start_time', yesterday.toISOString());

      if (timeError) throw timeError;

      // Get screenshots for analysis
      const { data: screenshots, error: screenshotError } = await supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', yesterday.toISOString());

      if (screenshotError) throw screenshotError;

      // Analyze patterns by user
      const userPatterns: { [key: string]: ActivityPattern } = {};
      
      // Process time logs
      timeLogs?.forEach(log => {
        if (!userPatterns[log.user_id]) {
          userPatterns[log.user_id] = {
            user_id: log.user_id,
            total_time: 0,
            screenshot_count: 0,
            app_switches: 0,
            idle_time: 0,
            productivity_score: 0,
            unusual_patterns: []
          };
        }
        
        const duration = log.end_time 
          ? new Date(log.end_time).getTime() - new Date(log.start_time).getTime()
          : 0;
        
        userPatterns[log.user_id].total_time += duration / 1000; // Convert to seconds
        
        if (log.is_idle) {
          userPatterns[log.user_id].idle_time += duration / 1000;
        }
      });

      // Process screenshots
      screenshots?.forEach(screenshot => {
        if (screenshot.user_id && userPatterns[screenshot.user_id]) {
          userPatterns[screenshot.user_id].screenshot_count++;
          
          // Add activity metrics if available
          if (screenshot.activity_percent !== null) {
            userPatterns[screenshot.user_id].productivity_score += screenshot.activity_percent || 0;
          }
        }
      });

      // Calculate averages and detect unusual patterns
      Object.values(userPatterns).forEach(pattern => {
        if (pattern.screenshot_count > 0) {
          pattern.productivity_score = pattern.productivity_score / pattern.screenshot_count;
        }

        // Detect unusual patterns
        const patterns: string[] = [];
        
        // Very low activity
        if (pattern.productivity_score < 20 && pattern.total_time > 3600) {
          patterns.push('Very low activity detected');
        }
        
        // Excessive idle time
        const idlePercentage = pattern.total_time > 0 ? (pattern.idle_time / pattern.total_time) * 100 : 0;
        if (idlePercentage > 50) {
          patterns.push('Excessive idle time');
        }
        
        // Very few screenshots for long session
        const screenshotRate = pattern.total_time > 0 ? pattern.screenshot_count / (pattern.total_time / 3600) : 0;
        if (screenshotRate < 5 && pattern.total_time > 7200) { // Less than 5 screenshots per hour for 2+ hour session
          patterns.push('Unusually few screenshots');
        }
        
        // No activity for extended period
        if (pattern.total_time > 14400 && pattern.productivity_score < 10) { // 4+ hours with <10% activity
          patterns.push('Extended period of inactivity');
        }

        pattern.unusual_patterns = patterns;
      });

      setActivityPatterns(Object.values(userPatterns).filter(p => p.unusual_patterns.length > 0));

      // Create unusual activity records for detected patterns
      for (const pattern of Object.values(userPatterns)) {
        if (pattern.unusual_patterns.length > 0) {
          await createUnusualActivityRecord(pattern);
        }
      }

    } catch (error) {
      console.error('Error analyzing activity patterns:', error);
    }
  };

  const createUnusualActivityRecord = async (pattern: ActivityPattern) => {
    try {
      const confidence = calculateConfidence(pattern);
      const duration = formatDuration(pattern.total_time);
      
      const { error } = await supabase
        .from('unusual_activity')
        .insert({
          user_id: pattern.user_id,
          rule_triggered: pattern.unusual_patterns.join(', '),
          confidence: confidence,
          duration_hm: duration,
          notes: `Productivity: ${Math.round(pattern.productivity_score)}%, Idle: ${Math.round((pattern.idle_time / pattern.total_time) * 100)}%`
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error creating unusual activity record:', error);
      }
    } catch (error) {
      console.error('Error creating unusual activity record:', error);
    }
  };

  const calculateConfidence = (pattern: ActivityPattern): number => {
    let confidence = 50; // Base confidence
    
    // Increase confidence based on severity of patterns
    if (pattern.productivity_score < 10) confidence += 30;
    else if (pattern.productivity_score < 20) confidence += 20;
    
    const idlePercentage = (pattern.idle_time / pattern.total_time) * 100;
    if (idlePercentage > 70) confidence += 25;
    else if (idlePercentage > 50) confidence += 15;
    
    if (pattern.total_time > 14400) confidence += 10; // Long sessions are more concerning
    
    return Math.min(95, confidence);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getSeverityColor = (confidence: number | null): string => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 80) return 'bg-red-100 text-red-800';
    if (confidence >= 60) return 'bg-orange-100 text-orange-800';
    if (confidence >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getSeverityLabel = (confidence: number | null): string => {
    if (!confidence) return 'Unknown';
    if (confidence >= 80) return 'HIGH';
    if (confidence >= 60) return 'MEDIUM';
    if (confidence >= 40) return 'LOW';
    return 'INFO';
  };

  const formatRuleName = (rule: string): string => {
    return rule.split(',')[0].trim(); // Show first rule if multiple
  };

  const handleInvestigate = (activity: UnusualActivity) => {
    // Navigate to detailed view or open investigation modal
    console.log('Investigating activity:', activity);
    // In a real app, this would open a detailed investigation view
  };

  const getHighRiskCount = () => {
    return unusualActivities.filter(a => (a.confidence || 0) >= 80).length;
  };

  const getMediumRiskCount = () => {
    return unusualActivities.filter(a => (a.confidence || 0) >= 60 && (a.confidence || 0) < 80).length;
  };

  const filteredActivities = unusualActivities.filter(activity => {
    const matchesSearch = activity.rule_triggered.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || getSeverityLabel(activity.confidence) === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Unusual Activity Detection</h1>
          <p className="text-gray-600">Monitor and investigate suspicious employee behavior patterns</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Utilization Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Team Utilization
                </CardTitle>
                <CardDescription>Overall productivity gauge</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32 transform -rotate-90">
                    <svg className="w-32 h-32" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeDasharray={`${insights.utilization}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{insights.utilization}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Badge variant={insights.utilization >= 80 ? "default" : insights.utilization >= 60 ? "secondary" : "destructive"}>
                    {insights.utilization >= 80 ? "Excellent" : insights.utilization >= 60 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Work Classification Bar */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Work Classification
                </CardTitle>
                <CardDescription>Time distribution by activity type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.workClassification.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm text-gray-600">{item.hours}h ({item.percentage}%)</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Focus Donut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Daily Focus Distribution
                </CardTitle>
                <CardDescription>Focus levels throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={insights.focusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {insights.focusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {insights.focusData.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Productivity Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Productivity Trends
                </CardTitle>
                <CardDescription>Hourly productivity and focus levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.productivityTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="productivity" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Productivity"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="focus" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Focus"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">24</div>
                <p className="text-sm text-gray-600">Currently tracking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2" />
                  Screenshots Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">1,247</div>
                <p className="text-sm text-gray-600">Captured automatically</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coffee className="h-5 w-5 mr-2" />
                  Break Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">2.3h</div>
                <p className="text-sm text-gray-600">Average per user</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-6">
          {/* Unusual Activity Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Unusual Activities
              </CardTitle>
              <CardDescription>Anomalies and patterns requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge className={getSeverityColor(activity.confidence)}>
                        {getSeverityLabel(activity.confidence)}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{formatRuleName(activity.rule_triggered)}</h4>
                        <p className="text-sm text-gray-600">{activity.notes}</p>
                        <p className="text-xs text-gray-500">
                          {activity.user?.full_name || activity.user?.email || 'Unknown User'} • 
                          {new Date(activity.detected_at).toLocaleString()} • 
                          Duration: {activity.duration_hm || 'N/A'} • 
                          Confidence: {Math.round((activity.confidence || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleInvestigate(activity)}
                    >
                      Investigate
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {/* Notification Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Center
              </CardTitle>
              <CardDescription>System alerts and important updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <Alert 
                    key={notification.id} 
                    className={`cursor-pointer transition-opacity ${notification.read ? 'opacity-60' : ''}`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{notification.title}</h4>
                          <span className="text-xs text-gray-500">{notification.timestamp}</span>
                        </div>
                        <AlertDescription className="mt-1">
                          {notification.message}
                        </AlertDescription>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsightsPage;
