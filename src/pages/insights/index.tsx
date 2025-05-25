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
  AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

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
  id: number;
  type: string;
  description: string;
  timestamp: string;
  severity: string;
  user: string;
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [insights, setInsights] = useState<InsightsData>({
    utilization: 0,
    workClassification: [],
    focusData: [],
    unusualActivities: [],
    productivityTrends: []
  });

  // Mock data - in production, this would come from your API
  useEffect(() => {
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
      unusualActivities: [
        {
          id: 1,
          type: 'Extended Idle',
          description: 'User idle for 45 minutes during work hours',
          timestamp: '2024-05-25 14:30:00',
          severity: 'high',
          user: 'john.doe@company.com'
        },
        {
          id: 2,
          type: 'Off-hours Activity',
          description: 'Activity detected at 11:30 PM',
          timestamp: '2024-05-25 23:30:00',
          severity: 'medium',
          user: 'jane.smith@company.com'
        },
        {
          id: 3,
          type: 'Unusual App Usage',
          description: 'Gaming application detected during work hours',
          timestamp: '2024-05-25 15:45:00',
          severity: 'high',
          user: 'mike.wilson@company.com'
        },
        {
          id: 4,
          type: 'Productivity Drop',
          description: 'Activity level below 20% for 2 hours',
          timestamp: '2024-05-25 13:00:00',
          severity: 'medium',
          user: 'sarah.johnson@company.com'
        }
      ],
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

    const mockNotifications = [
      {
        id: 1,
        type: 'warning',
        title: 'Low Productivity Alert',
        message: '3 employees showing productivity below 60% today',
        timestamp: '2024-05-25 14:30:00',
        read: false
      },
      {
        id: 2,
        type: 'info',
        title: 'Weekly Report Ready',
        message: 'Team productivity report for week 21 is available',
        timestamp: '2024-05-25 09:00:00',
        read: false
      },
      {
        id: 3,
        type: 'success',
        title: 'Goal Achieved',
        message: 'Development team exceeded 85% productivity target',
        timestamp: '2024-05-24 17:00:00',
        read: true
      }
    ];

    setInsights(mockInsights);
    setNotifications(mockNotifications);
  }, [selectedDate]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleInvestigate = (activity: UnusualActivity) => {
    // Show detailed investigation modal or navigate to detailed view
    alert(`Investigating: ${activity.type}\n\nDetails:\n${activity.description}\n\nUser: ${activity.user}\nTime: ${activity.timestamp}\nSeverity: ${activity.severity}`);
    
    // In a real application, this would:
    // 1. Open a detailed investigation modal
    // 2. Navigate to a detailed activity view
    // 3. Show related screenshots, app usage, etc.
    // 4. Allow adding notes or marking as resolved
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insights Dashboard</h1>
          <p className="text-gray-600">Advanced analytics and productivity insights</p>
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
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
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
                {insights.unusualActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge className={getSeverityColor(activity.severity)}>
                        {activity.severity.toUpperCase()}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{activity.type}</h4>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500">{activity.user} • {activity.timestamp}</p>
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
