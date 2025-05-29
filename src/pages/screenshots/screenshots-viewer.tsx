import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { format } from 'date-fns';
import { Calendar, Camera, Users, Filter, Search, Download } from 'lucide-react';

interface Screenshot {
  id: string;
  user_id: string;
  project_id: string | null;
  captured_at: string;
  image_url: string;
  activity_percent: number;
  focus_percent: number;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
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
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const { userDetails } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch screenshots
      let { data: screenshotsData, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', startDate.toISOString())
        .lt('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false });

      if (screenshotsError) throw screenshotsError;
      
      // Map database fields to interface, filtering out null user_ids
      const mappedScreenshots: Screenshot[] = (screenshotsData || [])
        .filter((screenshot: any) => screenshot.user_id !== null)
        .map((screenshot: any) => ({
          id: screenshot.id,
          user_id: screenshot.user_id,
          project_id: screenshot.project_id,
          captured_at: screenshot.captured_at,
          image_url: screenshot.image_url,
          activity_percent: screenshot.activity_percent || 0,
          focus_percent: screenshot.focus_percent || 0
        }));

      setScreenshots(mappedScreenshots);

      // Fetch users
      let { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'employee');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch projects
      let { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScreenshots = screenshots.filter((s: any) => {
    if (!dateFilter) return true;
    const capturedDate = new Date(s.captured_at);
    return (
      capturedDate.getFullYear() === dateFilter.getFullYear() &&
      capturedDate.getMonth() === dateFilter.getMonth() &&
      capturedDate.getDate() === dateFilter.getDate()
    );
  }).filter((s: any) => {
    const userMatch = userFilter === 'all' || s.user_id === userFilter;
    const projectMatch = projectFilter === 'all' || s.project_id === projectFilter;
    return userMatch && projectMatch;
  }).filter((s: any) => {
    return (
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.image_url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Screenshots Viewer</h1>
          <p className="text-muted-foreground">Review employee screenshots</p>
        </div>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Apply filters to narrow down screenshots
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Input
                placeholder="Search screenshots..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user: User) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Screenshots ({filteredScreenshots.length} records)
          </CardTitle>
          <CardDescription>
            Captured screenshots from employee screens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading screenshots...</div>
          ) : filteredScreenshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No screenshots found matching your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredScreenshots.map((screenshot: any) => {
                const user = users.find((u: any) => u.id === screenshot.user_id);
                const project = projects.find((p: any) => p.id === screenshot.project_id);
                
                return (
                  <div key={screenshot.id} className="border rounded-lg">
                    <img
                      src={screenshot.image_url}
                      alt={`Screenshot ${screenshot.id}`}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-sm font-medium">{user?.full_name || user?.email || 'Unknown User'}</div>
                        {project && (
                          <Badge variant="secondary" className="text-xs">
                            {project.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Captured on {format(new Date(screenshot.captured_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs">Activity: {screenshot.activity_percent}%</div>
                          <div className="text-xs">Focus: {screenshot.focus_percent}%</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => window.open(screenshot.image_url, '_blank')}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
