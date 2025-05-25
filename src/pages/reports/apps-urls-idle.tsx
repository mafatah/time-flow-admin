import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Monitor, 
  Globe, 
  Coffee, 
  Search, 
  Download, 
  Filter,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AppUsage {
  app_name: string;
  total_time: number;
  usage_count: number;
  users: number;
  category: string;
  productivity_score: number;
}

interface UrlUsage {
  domain: string;
  total_visits: number;
  total_time: number;
  users: number;
  category: string;
  productivity_score: number;
}

interface IdleData {
  user: string;
  total_idle_time: number;
  idle_periods: number;
  avg_idle_duration: number;
  max_idle_duration: number;
  productivity_impact: number;
}

interface TimeDistribution {
  hour: string;
  apps: number;
  urls: number;
  idle: number;
}

const AppsUrlsIdlePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [urlUsage, setUrlUsage] = useState<UrlUsage[]>([]);
  const [idleData, setIdleData] = useState<IdleData[]>([]);
  const [timeDistribution, setTimeDistribution] = useState<TimeDistribution[]>([]);

  // Mock data - in production, this would come from your API
  useEffect(() => {
    const mockAppUsage = [
      { app_name: 'Visual Studio Code', total_time: 28800, usage_count: 145, users: 8, category: 'Development', productivity_score: 95 },
      { app_name: 'Chrome', total_time: 21600, usage_count: 89, users: 12, category: 'Browser', productivity_score: 70 },
      { app_name: 'Slack', total_time: 14400, usage_count: 234, users: 15, category: 'Communication', productivity_score: 85 },
      { app_name: 'Figma', total_time: 18000, usage_count: 67, users: 5, category: 'Design', productivity_score: 90 },
      { app_name: 'Spotify', total_time: 7200, usage_count: 45, users: 10, category: 'Entertainment', productivity_score: 30 },
      { app_name: 'Terminal', total_time: 12600, usage_count: 156, users: 6, category: 'Development', productivity_score: 92 },
      { app_name: 'Photoshop', total_time: 9000, usage_count: 34, users: 3, category: 'Design', productivity_score: 88 },
      { app_name: 'Excel', total_time: 10800, usage_count: 78, users: 7, category: 'Productivity', productivity_score: 80 }
    ];

    const mockUrlUsage = [
      { domain: 'github.com', total_visits: 456, total_time: 25200, users: 8, category: 'Development', productivity_score: 95 },
      { domain: 'stackoverflow.com', total_visits: 234, total_time: 14400, users: 10, category: 'Development', productivity_score: 90 },
      { domain: 'google.com', total_visits: 189, total_time: 7200, users: 15, category: 'Search', productivity_score: 75 },
      { domain: 'youtube.com', total_visits: 123, total_time: 18000, users: 12, category: 'Entertainment', productivity_score: 25 },
      { domain: 'linkedin.com', total_visits: 89, total_time: 5400, users: 8, category: 'Social', productivity_score: 60 },
      { domain: 'figma.com', total_visits: 67, total_time: 16200, users: 5, category: 'Design', productivity_score: 92 },
      { domain: 'notion.so', total_visits: 145, total_time: 12600, users: 9, category: 'Productivity', productivity_score: 85 },
      { domain: 'twitter.com', total_visits: 78, total_time: 3600, users: 6, category: 'Social', productivity_score: 35 }
    ];

    const mockIdleData = [
      { user: 'john.doe@company.com', total_idle_time: 7200, idle_periods: 12, avg_idle_duration: 600, max_idle_duration: 1800, productivity_impact: 15 },
      { user: 'jane.smith@company.com', total_idle_time: 5400, idle_periods: 8, avg_idle_duration: 675, max_idle_duration: 1200, productivity_impact: 12 },
      { user: 'mike.wilson@company.com', total_idle_time: 9000, idle_periods: 15, avg_idle_duration: 600, max_idle_duration: 2400, productivity_impact: 22 },
      { user: 'sarah.johnson@company.com', total_idle_time: 3600, idle_periods: 6, avg_idle_duration: 600, max_idle_duration: 900, productivity_impact: 8 },
      { user: 'alex.brown@company.com', total_idle_time: 10800, idle_periods: 18, avg_idle_duration: 600, max_idle_duration: 3600, productivity_impact: 28 }
    ];

    const mockTimeDistribution = [
      { hour: '09:00', apps: 85, urls: 70, idle: 5 },
      { hour: '10:00', apps: 92, urls: 80, idle: 8 },
      { hour: '11:00', apps: 88, urls: 75, idle: 12 },
      { hour: '12:00', apps: 45, urls: 60, idle: 35 },
      { hour: '13:00', apps: 50, urls: 65, idle: 25 },
      { hour: '14:00', apps: 90, urls: 85, idle: 10 },
      { hour: '15:00', apps: 85, urls: 78, idle: 15 },
      { hour: '16:00', apps: 80, urls: 72, idle: 18 },
      { hour: '17:00', apps: 75, urls: 68, idle: 20 }
    ];

    setAppUsage(mockAppUsage);
    setUrlUsage(mockUrlUsage);
    setIdleData(mockIdleData);
    setTimeDistribution(mockTimeDistribution);
  }, [selectedDate, selectedUser]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Development': '#3b82f6',
      'Design': '#8b5cf6',
      'Communication': '#10b981',
      'Productivity': '#f59e0b',
      'Entertainment': '#ef4444',
      'Social': '#ec4899',
      'Browser': '#6b7280',
      'Search': '#14b8a6'
    };
    return colors[category] || '#6b7280';
  };

  const filteredApps = appUsage.filter(app => 
    app.app_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || app.category === categoryFilter)
  );

  const filteredUrls = urlUsage.filter(url => 
    url.domain.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (categoryFilter === 'all' || url.category === categoryFilter)
  );

  const exportData = (type: string) => {
    let data: any[] = [];
    let filename = '';
    
    switch (type) {
      case 'apps':
        data = filteredApps;
        filename = 'app-usage-report.csv';
        break;
      case 'urls':
        data = filteredUrls;
        filename = 'url-usage-report.csv';
        break;
      case 'idle':
        data = idleData;
        filename = 'idle-time-report.csv';
        break;
    }

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Apps, URLs & Idle Reports</h1>
          <p className="text-gray-600">Detailed analysis of application usage, website visits, and idle time</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="john.doe">John Doe</SelectItem>
              <SelectItem value="jane.smith">Jane Smith</SelectItem>
              <SelectItem value="mike.wilson">Mike Wilson</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Apps Used</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appUsage.length}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Websites Visited</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urlUsage.length}</div>
            <p className="text-xs text-muted-foreground">Unique domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Idle Time</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(idleData.reduce((sum, user) => sum + user.total_idle_time, 0))}
            </div>
            <p className="text-xs text-muted-foreground">All users combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Productivity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(appUsage.reduce((sum, app) => sum + app.productivity_score, 0) / appUsage.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Based on app usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search apps or websites..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Communication">Communication</SelectItem>
                <SelectItem value="Productivity">Productivity</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Social">Social</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="apps" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="urls">Websites</TabsTrigger>
          <TabsTrigger value="idle">Idle Time</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Application Usage</h2>
            <Button onClick={() => exportData('apps')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* App Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Applications by Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredApps.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="app_name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [formatTime(value), 'Time Used']}
                      />
                      <Bar 
                        dataKey="total_time" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* App Categories Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Usage by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(
                          filteredApps.reduce((acc, app) => {
                            acc[app.category] = (acc[app.category] || 0) + app.total_time;
                            return acc;
                          }, {} as { [key: string]: number })
                        ).map(([category, time]) => ({ category, time }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="time"
                        nameKey="category"
                      >
                        {Object.keys(
                          filteredApps.reduce((acc, app) => {
                            acc[app.category] = true;
                            return acc;
                          }, {} as { [key: string]: boolean })
                        ).map((category, index) => (
                          <Cell key={`cell-${index}`} fill={getCategoryColor(category)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatTime(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* App Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Application Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Application</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Time Used</th>
                      <th className="text-left p-2">Usage Count</th>
                      <th className="text-left p-2">Users</th>
                      <th className="text-left p-2">Productivity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((app, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{app.app_name}</td>
                        <td className="p-2">
                          <Badge 
                            style={{ backgroundColor: getCategoryColor(app.category), color: 'white' }}
                          >
                            {app.category}
                          </Badge>
                        </td>
                        <td className="p-2">{formatTime(app.total_time)}</td>
                        <td className="p-2">{app.usage_count}</td>
                        <td className="p-2">{app.users}</td>
                        <td className="p-2">
                          <Badge className={getProductivityColor(app.productivity_score)}>
                            {app.productivity_score}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="urls" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Website Usage</h2>
            <Button onClick={() => exportData('urls')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* URL Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Websites by Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredUrls.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="domain" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar 
                        dataKey="total_visits" 
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* URL Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Website Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    filteredUrls.reduce((acc, url) => {
                      acc[url.category] = (acc[url.category] || 0) + url.total_visits;
                      return acc;
                    }, {} as { [key: string]: number })
                  ).map(([category, visits]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getCategoryColor(category) }}
                        />
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      <span className="text-sm text-gray-600">{visits} visits</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* URL Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Website Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Domain</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-left p-2">Total Visits</th>
                      <th className="text-left p-2">Time Spent</th>
                      <th className="text-left p-2">Users</th>
                      <th className="text-left p-2">Productivity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUrls.map((url, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{url.domain}</td>
                        <td className="p-2">
                          <Badge 
                            style={{ backgroundColor: getCategoryColor(url.category), color: 'white' }}
                          >
                            {url.category}
                          </Badge>
                        </td>
                        <td className="p-2">{url.total_visits}</td>
                        <td className="p-2">{formatTime(url.total_time)}</td>
                        <td className="p-2">{url.users}</td>
                        <td className="p-2">
                          <Badge className={getProductivityColor(url.productivity_score)}>
                            {url.productivity_score}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="idle" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Idle Time Analysis</h2>
            <Button onClick={() => exportData('idle')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Idle Time Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Idle Time Breakdown</CardTitle>
              <CardDescription>Detailed analysis of idle periods and productivity impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Total Idle Time</th>
                      <th className="text-left p-2">Idle Periods</th>
                      <th className="text-left p-2">Avg Duration</th>
                      <th className="text-left p-2">Max Duration</th>
                      <th className="text-left p-2">Productivity Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {idleData.map((user, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{user.user}</td>
                        <td className="p-2">{formatTime(user.total_idle_time)}</td>
                        <td className="p-2">{user.idle_periods}</td>
                        <td className="p-2">{formatTime(user.avg_idle_duration)}</td>
                        <td className="p-2">{formatTime(user.max_idle_duration)}</td>
                        <td className="p-2">
                          <Badge className={getProductivityColor(100 - user.productivity_impact)}>
                            -{user.productivity_impact}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <h2 className="text-xl font-semibold">Activity Overview</h2>
          
          {/* Time Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity Distribution</CardTitle>
              <CardDescription>Apps usage, URL visits, and idle time throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="apps" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="App Usage %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="urls" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="URL Activity %"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="idle" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Idle Time %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AppsUrlsIdlePage; 