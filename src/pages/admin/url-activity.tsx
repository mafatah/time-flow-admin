import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Clock, TrendingUp, Users, Filter, Calendar, Download, BarChart3, PieChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface URLLog {
  id: string;
  site_url: string;
  started_at: string;
  ended_at: string | null;
  duration: number;
  user_id: string;
  users?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface URLStat {
  site_url: string;
  total_duration: number;
  visit_count: number;
  unique_users: number;
  avg_duration: number;
  last_visit: string;
  category: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const URLActivity: React.FC = () => {
  const [urlLogs, setUrlLogs] = useState<URLLog[]>([]);
  const [urlStats, setUrlStats] = useState<URLStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const [users, setUsers] = useState<any[]>([]);

  // Category mapping for websites
  const getCategoryForURL = (url: string): string => {
    const domain = url.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    
    if (domain.includes('github') || domain.includes('stackoverflow') || domain.includes('developer') || domain.includes('docs.')) {
      return 'Development';
    } else if (domain.includes('gmail') || domain.includes('outlook') || domain.includes('mail')) {
      return 'Email';
    } else if (domain.includes('slack') || domain.includes('teams') || domain.includes('zoom') || domain.includes('discord')) {
      return 'Communication';
    } else if (domain.includes('youtube') || domain.includes('netflix') || domain.includes('twitch')) {
      return 'Entertainment';
    } else if (domain.includes('facebook') || domain.includes('twitter') || domain.includes('linkedin') || domain.includes('instagram')) {
      return 'Social Media';
    } else if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) {
      return 'News';
    } else if (domain.includes('shop') || domain.includes('amazon') || domain.includes('ebay')) {
      return 'Shopping';
    } else {
      return 'Other';
    }
  };

  const categoryColors = {
    'Development': '#3b82f6',
    'Email': '#ef4444',
    'Communication': '#10b981',
    'Entertainment': '#f59e0b',
    'Social Media': '#8b5cf6',
    'News': '#06b6d4',
    'Shopping': '#ec4899',
    'Other': '#6b7280'
  };

  useEffect(() => {
    fetchUsers();
    fetchURLData();
  }, [selectedUser, dateRange]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchURLData = async () => {
    setLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), daysAgo));
      const endDate = endOfDay(new Date());

      let query = supabase
        .from('url_logs')
        .select(`
          id,
          site_url,
          started_at,
          ended_at,
          duration,
          user_id,
          users (
            email,
            first_name,
            last_name
          )
        `)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString())
        .order('started_at', { ascending: false });

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;

      if (error) throw error;

      const logs = data || [];
      setUrlLogs(logs);

      // Calculate statistics
      const statsMap = new Map<string, URLStat>();
      
      logs.forEach((log: URLLog) => {
        const url = log.site_url;
        const existing = statsMap.get(url);
        
        if (existing) {
          existing.total_duration += log.duration || 0;
          existing.visit_count += 1;
          existing.last_visit = log.started_at > existing.last_visit ? log.started_at : existing.last_visit;
        } else {
          statsMap.set(url, {
            site_url: url,
            total_duration: log.duration || 0,
            visit_count: 1,
            unique_users: 1,
            avg_duration: log.duration || 0,
            last_visit: log.started_at,
            category: getCategoryForURL(url)
          });
        }
      });

      // Calculate unique users and average duration
      const stats = Array.from(statsMap.values()).map(stat => ({
        ...stat,
        avg_duration: stat.total_duration / stat.visit_count,
        unique_users: logs.filter(log => log.site_url === stat.site_url)
          .map(log => log.user_id)
          .filter((userId, index, arr) => arr.indexOf(userId) === index).length
      }));

      setUrlStats(stats.sort((a, b) => b.total_duration - a.total_duration));
    } catch (error) {
      console.error('Error fetching URL data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = urlStats.filter(stat => {
    const matchesSearch = stat.site_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || stat.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryData: CategoryData[] = Object.entries(
    filteredStats.reduce((acc, stat) => {
      acc[stat.category] = (acc[stat.category] || 0) + stat.total_duration;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({
    name,
    value,
    color: categoryColors[name as keyof typeof categoryColors] || '#6b7280'
  }));

  const topSitesData = filteredStats.slice(0, 10).map(stat => ({
    name: stat.site_url.length > 30 ? stat.site_url.substring(0, 30) + '...' : stat.site_url,
    duration: Math.round(stat.total_duration / 60), // Convert to minutes
    visits: stat.visit_count
  }));

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const exportToCSV = () => {
    const headers = ['Website', 'Category', 'Total Time', 'Visits', 'Unique Users', 'Avg Duration', 'Last Visit'];
    const csvData = [
      headers.join(','),
      ...filteredStats.map(stat => [
        `"${stat.site_url}"`,
        stat.category,
        formatDuration(stat.total_duration),
        stat.visit_count,
        stat.unique_users,
        formatDuration(stat.avg_duration),
        format(new Date(stat.last_visit), 'yyyy-MM-dd HH:mm')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalDuration = filteredStats.reduce((sum, stat) => sum + stat.total_duration, 0);
  const totalVisits = filteredStats.reduce((sum, stat) => sum + stat.visit_count, 0);
  const uniqueWebsites = filteredStats.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">URL Activity</h1>
          <p className="text-muted-foreground">
            Track and analyze website usage across your organization
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Websites</label>
              <Input
                placeholder="Search by URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(categoryColors).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium">Unique Websites</p>
                <p className="text-2xl font-bold">{uniqueWebsites}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium">Total Time</p>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium">Total Visits</p>
                <p className="text-2xl font-bold">{totalVisits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium">Avg Duration</p>
                <p className="text-2xl font-bold">
                  {totalVisits > 0 ? formatDuration(totalDuration / totalVisits) : '0m'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Activity by Category
            </CardTitle>
            <CardDescription>Time spent across different website categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatDuration(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top Websites
            </CardTitle>
            <CardDescription>Most visited websites by time spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSitesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#3b82f6" name="Duration (minutes)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Website Details</CardTitle>
          <CardDescription>
            Detailed breakdown of website usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Unique Users</TableHead>
                <TableHead>Avg Duration</TableHead>
                <TableHead>Last Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.map((stat) => (
                <TableRow key={stat.site_url}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {stat.site_url}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: categoryColors[stat.category as keyof typeof categoryColors],
                        color: categoryColors[stat.category as keyof typeof categoryColors]
                      }}
                    >
                      {stat.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDuration(stat.total_duration)}</TableCell>
                  <TableCell>{stat.visit_count}</TableCell>
                  <TableCell>{stat.unique_users}</TableCell>
                  <TableCell>{formatDuration(stat.avg_duration)}</TableCell>
                  <TableCell>
                    {format(new Date(stat.last_visit), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default URLActivity; 