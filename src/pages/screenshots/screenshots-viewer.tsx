
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Eye, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  user_id: string | null;
  project_id: string | null;
  image_url: string;
  captured_at: string;
  classification: string | null;
  activity_percent?: number | null;
  focus_percent?: number | null;
  task_id?: string | null;
  user_name?: string;
  user_email?: string;
  project_name?: string;
}

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchScreenshots();
    fetchUsers();
  }, [selectedDate]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      const { data: screenshotData, error: screenshotError } = await supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', startDate.toISOString())
        .lt('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false });

      if (screenshotError) throw screenshotError;

      if (!screenshotData || screenshotData.length === 0) {
        setScreenshots([]);
        return;
      }

      // Get unique user IDs and project IDs, filtering out nulls
      const userIds = [...new Set(screenshotData.map(s => s.user_id).filter(Boolean))] as string[];
      const projectIds = [...new Set(screenshotData.map(s => s.project_id).filter(Boolean))] as string[];

      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      // Fetch project data
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      // Combine data
      const enrichedScreenshots = screenshotData.map(screenshot => ({
        ...screenshot,
        user_name: userData?.find(u => u.id === screenshot.user_id)?.full_name || 'Unknown',
        user_email: userData?.find(u => u.id === screenshot.user_id)?.email || 'Unknown',
        project_name: projectData?.find(p => p.id === screenshot.project_id)?.name || 'Unknown Project'
      }));

      setScreenshots(enrichedScreenshots);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      toast.error('Failed to fetch screenshots');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filteredScreenshots = screenshots.filter(screenshot => {
    const matchesSearch = screenshot.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         screenshot.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClassification = classificationFilter === 'all' || screenshot.classification === classificationFilter;
    const matchesUser = userFilter === 'all' || screenshot.user_id === userFilter;
    
    return matchesSearch && matchesClassification && matchesUser;
  });

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

  const getClassificationColor = (classification: string | null) => {
    switch (classification) {
      case 'productive':
        return 'bg-green-100 text-green-800';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800';
      case 'distracting':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Screenshots Viewer</h1>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
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
                placeholder="Search users or projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="productive">Productive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="distracting">Distracting</SelectItem>
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Screenshots for {format(new Date(selectedDate), 'MMMM d, yyyy')} ({filteredScreenshots.length} found)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading screenshots...</div>
          ) : filteredScreenshots.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No screenshots found for the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredScreenshots.map((screenshot) => (
                <div key={screenshot.id} className="border rounded-lg p-4 space-y-3">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={screenshot.image_url}
                      alt="Screenshot"
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleViewScreenshot(screenshot.image_url)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {format(new Date(screenshot.captured_at), 'HH:mm:ss')}
                      </span>
                      <Badge className={getClassificationColor(screenshot.classification)}>
                        {screenshot.classification || 'unclassified'}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <div>User: {screenshot.user_name}</div>
                      <div>Project: {screenshot.project_name}</div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewScreenshot(screenshot.image_url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadScreenshot(
                          screenshot.image_url,
                          `screenshot-${screenshot.id}.png`
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
