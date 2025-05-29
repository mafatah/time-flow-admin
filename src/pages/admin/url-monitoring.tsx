import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, ExternalLink, Clock, User, Globe } from 'lucide-react';

interface URLLog {
  id: string;
  user_id: string;
  site_url: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  category: string | null;
  project_id: string | null;
  user?: {
    email: string;
    full_name?: string;
  };
}

interface UserData {
  id: string;
  email: string;
  full_name?: string;
}

export default function URLMonitoring() {
  const [urlLogs, setUrlLogs] = useState<URLLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    fetchURLLogs();
    fetchUsers();
  }, []);

  const fetchURLLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('url_logs')
        .select(`*`)
        .order('started_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      // Fetch user data separately
      const userIds = [...new Set(data?.map((log: any) => log.user_id) || [])];
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      // Enrich logs with user data
      const enrichedLogs = data?.map((log: any) => ({
        ...log,
        user: userData?.find((user: UserData) => user.id === log.user_id)
      })) || [];

      setUrlLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching URL logs:', error);
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

  const filteredLogs = urlLogs.filter((log: URLLog) => {
    const matchesSearch = log.site_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesUser = userFilter === 'all' || log.user_id === userFilter;
    
    return matchesSearch && matchesCategory && matchesUser;
  });

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'development':
        return 'bg-green-100 text-green-800';
      case 'research':
        return 'bg-blue-100 text-blue-800';
      case 'social':
        return 'bg-yellow-100 text-yellow-800';
      case 'entertainment':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTotalTimeByCategory = () => {
    const categoryTotals: { [key: string]: number } = {};
    filteredLogs.forEach((log: URLLog) => {
      const category = log.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (log.duration_seconds || 0);
    });
    return categoryTotals;
  };

  const categoryTotals = getTotalTimeByCategory();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">URL Monitoring</h1>
          <p className="text-muted-foreground">Track employee web browsing activity</p>
        </div>
        <Button onClick={fetchURLLogs} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(categoryTotals).map(([category, totalSeconds]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalSeconds)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredLogs.filter((log: URLLog) => (log.category || 'other') === category).length} visits
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search URLs or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="research">Research</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user: UserData) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* URL Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            URL Activity ({filteredLogs.length} records)
          </CardTitle>
          <CardDescription>
            Detailed view of employee web browsing activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: URLLog) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            {log.user?.full_name || log.user?.email || 'Unknown'}
                          </div>
                          {log.user?.full_name && (
                            <div className="text-sm text-muted-foreground">
                              {log.user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="font-mono text-sm truncate">
                          {log.site_url}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(log.category)}>
                        {log.category || 'other'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <div>
                          <div>{format(new Date(log.started_at), 'MMM dd, HH:mm')}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(log.started_at), 'yyyy')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatDuration(log.duration_seconds)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(log.site_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No URL activity found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
