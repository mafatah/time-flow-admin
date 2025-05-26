import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Filter, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  user_id: string;
  project_id: string;
  image_url: string;
  captured_at: string;
  activity_percent?: number;
  focus_percent?: number;
  classification?: string;
  user_name?: string;
  user_email?: string;
  project_name?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    searchTerm: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchScreenshots();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    }
  };

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('screenshots')
        .select(`
          id,
          user_id,
          project_id,
          image_url,
          captured_at,
          classification
        `);

      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.date) {
        const startDate = new Date(filters.date);
        const endDate = new Date(filters.date);
        endDate.setDate(endDate.getDate() + 1);
        
        query = query
          .gte('captured_at', startDate.toISOString())
          .lt('captured_at', endDate.toISOString());
      }

      const { data: screenshotData, error } = await query
        .order('captured_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!screenshotData || screenshotData.length === 0) {
        setScreenshots([]);
        return;
      }

      // Enrich with user and project names
      const enrichedScreenshots = screenshotData.map(screenshot => {
        const user = users.find(u => u.id === screenshot.user_id);
        const project = projects.find(p => p.id === screenshot.project_id);
        
        return {
          ...screenshot,
          user_name: user?.full_name || 'Unknown User',
          user_email: user?.email || 'Unknown',
          project_name: project?.name || 'Unknown Project'
        };
      });

      // Apply search filter
      let filteredScreenshots = enrichedScreenshots;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredScreenshots = enrichedScreenshots.filter(screenshot =>
          screenshot.user_name?.toLowerCase().includes(searchLower) ||
          screenshot.project_name?.toLowerCase().includes(searchLower) ||
          screenshot.classification?.toLowerCase().includes(searchLower)
        );
      }

      setScreenshots(filteredScreenshots);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      toast.error('Failed to fetch screenshots');
    } finally {
      setLoading(false);
    }
  };

  const handleViewScreenshot = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  const handleDownloadScreenshot = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Screenshot downloaded');
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      toast.error('Failed to download screenshot');
    }
  };

  const getActivityColor = (percent?: number) => {
    if (!percent) return 'gray';
    if (percent >= 80) return 'green';
    if (percent >= 60) return 'yellow';
    return 'red';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Screenshots Viewer</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user or project..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select 
                value={filters.userId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select 
                value={filters.projectId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            Screenshots ({screenshots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No screenshots found with the current filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {screenshots.map((screenshot) => (
                <div key={screenshot.id} className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative group">
                    <img
                      src={screenshot.image_url}
                      alt="Screenshot"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleViewScreenshot(screenshot.image_url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadScreenshot(
                          screenshot.image_url,
                          `screenshot-${screenshot.id}.png`
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div className="text-sm font-medium">{screenshot.user_name}</div>
                    <div className="text-xs text-gray-500">{screenshot.project_name}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(screenshot.captured_at), 'MMM d, yyyy HH:mm')}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      {screenshot.activity_percent && (
                        <Badge variant="outline" className={`text-${getActivityColor(screenshot.activity_percent)}-600`}>
                          {screenshot.activity_percent}% Activity
                        </Badge>
                      )}
                      {screenshot.classification && (
                        <Badge variant="secondary">
                          {screenshot.classification}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
