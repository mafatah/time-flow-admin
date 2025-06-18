import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { format, startOfDay, endOfDay, addMinutes, differenceInMinutes } from 'date-fns';
import { Calendar, Camera, Users, Filter, Search, Download, Clock, Activity, Pause, Grid, List, Eye, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  role: string;
}

interface Project {
  id: string;
  name: string;
}

interface TimeSlot {
  time: string;
  screenshots: Screenshot[];
  activityPercent: number;
  isActive: boolean;
  isIdle: boolean;
}

interface ActivityPeriod {
  start: string;
  end: string;
  type: 'active' | 'idle';
  duration: number;
  screenshots: Screenshot[];
}

interface ScreenshotCategory {
  type: 'app' | 'web' | 'unknown';
  name: string;
  screenshots: Screenshot[];
  count: number;
}

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [userFilter, setUserFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'combined' | 'timeline' | 'grid' | 'categories'>('combined');
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showTimeline, setShowTimeline] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<number>>(new Set());
  const { userDetails } = useAuth();

  // Add modal states
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Add auto-refresh for real-time updates
  useEffect(() => {
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
    
    if (isToday) {
              // Auto-refresh every 2 minutes when viewing today's screenshots  
        const refreshInterval = setInterval(() => {
          // Auto-refresh reduced frequency for performance
          fetchData();
        }, 120000); // 2 minutes
      
      return () => clearInterval(refreshInterval);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (screenshots.length > 0) {
      // Filter change logging disabled for performance
    }
  }, [userFilter, projectFilter, categoryFilter, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const selectedDateTime = new Date(selectedDate + 'T00:00:00');
      const startDate = startOfDay(selectedDateTime);
      const endDate = endOfDay(selectedDateTime);

      // Screenshot fetch details logging disabled for performance

      const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
      let query = supabase
        .from('screenshots')
        .select('*')
        .order('captured_at', { ascending: true });
      
      if (isToday) {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('captured_at', last24Hours.toISOString());
      } else {
        query = query
          .gte('captured_at', startDate.toISOString())
          .lt('captured_at', endDate.toISOString());
      }

      let { data: screenshotsData, error: screenshotsError } = await query;

      if (screenshotsError) throw screenshotsError;
      
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

      // Fetch users - FIXED: Load all users, not just employees
      let { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .order('email');

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

  // Categorize screenshots by type (app vs web)
  const categorizeScreenshots = (screenshots: Screenshot[]): ScreenshotCategory[] => {
    const categories: { [key: string]: ScreenshotCategory } = {};
    
    screenshots.forEach(screenshot => {
      // Simple categorization based on common patterns
      let category = 'unknown';
      let name = 'Unknown';
      
      // This is a simplified categorization - in a real app you'd have more sophisticated detection
      if (screenshot.image_url.includes('browser') || screenshot.focus_percent > 70) {
        category = 'web';
        name = 'Web Browsing';
      } else if (screenshot.activity_percent > 50) {
        category = 'app';
        name = 'Desktop Applications';
      }
      
      if (!categories[category]) {
        categories[category] = {
          type: category as 'app' | 'web' | 'unknown',
          name,
          screenshots: [],
          count: 0
        };
      }
      
      categories[category].screenshots.push(screenshot);
      categories[category].count++;
    });
    
    return Object.values(categories);
  };

  const filteredScreenshots = screenshots.filter((s: any) => {
    const userMatch = userFilter === 'all' || s.user_id === userFilter;
    const projectMatch = projectFilter === 'all' || s.project_id === projectFilter;
    const searchMatch = searchTerm === '' || 
      users.find(u => u.id === s.user_id)?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projects.find(p => p.id === s.project_id)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return userMatch && projectMatch && searchMatch;
  });

  const categories = categorizeScreenshots(filteredScreenshots);

  // Generate time slots and activity periods (existing logic)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = startOfDay(new Date(selectedDate));
    
    for (let i = 0; i < 144; i++) {
      const slotTime = addMinutes(startTime, i * 10);
      const slotEnd = addMinutes(slotTime, 10);
      
      const slotScreenshots = filteredScreenshots.filter(s => {
        const capturedAt = new Date(s.captured_at);
        return capturedAt >= slotTime && capturedAt < slotEnd;
      });

      const avgActivity = slotScreenshots.length > 0 
        ? slotScreenshots.reduce((sum, s) => sum + s.activity_percent, 0) / slotScreenshots.length
        : 0;

      slots.push({
        time: format(slotTime, 'HH:mm'),
        screenshots: slotScreenshots,
        activityPercent: Math.round(avgActivity),
        isActive: avgActivity > 30,
        isIdle: avgActivity < 10 && slotScreenshots.length > 0
      });
    }
    
    return slots;
  };

  const generateActivityPeriods = (): ActivityPeriod[] => {
    const timeSlots = generateTimeSlots();
    const periods: ActivityPeriod[] = [];
    let currentPeriod: ActivityPeriod | null = null;

    timeSlots.forEach((slot) => {
      const hasScreenshots = slot.screenshots.length > 0;
      const isActive = hasScreenshots && slot.activityPercent > 10;
      const periodType = isActive ? 'active' : 'idle';

      if (hasScreenshots) {
        if (!currentPeriod || currentPeriod.type !== periodType) {
          if (currentPeriod) {
            periods.push(currentPeriod);
          }
          
          currentPeriod = {
            start: slot.time,
            end: slot.time,
            type: periodType,
            duration: 10,
            screenshots: [...slot.screenshots]
          };
        } else {
          currentPeriod.end = slot.time;
          currentPeriod.duration += 10;
          currentPeriod.screenshots.push(...slot.screenshots);
        }
      } else if (currentPeriod) {
        periods.push(currentPeriod);
        currentPeriod = null;
      }
    });

    if (currentPeriod) {
      periods.push(currentPeriod);
    }

    return periods.filter(p => p.duration > 0 && p.screenshots.length > 0);
  };

  const timeSlots = generateTimeSlots();
  const activityPeriods = generateActivityPeriods();
  const totalActiveTime = activityPeriods
    .filter(p => p.type === 'active')
    .reduce((sum, p) => sum + p.duration, 0);
  const totalIdleTime = activityPeriods
    .filter(p => p.type === 'idle')
    .reduce((sum, p) => sum + p.duration, 0);

  const togglePeriodExpansion = (index: number) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPeriods(newExpanded);
  };

  const getGridColumns = () => {
    switch (gridSize) {
      case 'small': return 'grid-cols-8';
      case 'medium': return 'grid-cols-6';
      case 'large': return 'grid-cols-4';
      default: return 'grid-cols-6';
    }
  };

  // Add modal handler functions
  const handleViewScreenshot = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
    setIsModalOpen(true);
  };

  const closeScreenshotModal = () => {
    setSelectedScreenshot(null);
    setIsModalOpen(false);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Camera className="h-8 w-8" />
            Screenshots Viewer
          </h1>
          <p className="text-muted-foreground">Monitor employee activity and productivity</p>
        </div>
        
        {/* View Mode Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Manual refresh logging disabled for performance
              fetchData();
            }}
            size="sm"
            title="Refresh Screenshots"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={viewMode === 'combined' ? 'default' : 'outline'}
            onClick={() => setViewMode('combined')}
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Combined
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            onClick={() => setViewMode('timeline')}
            size="sm"
          >
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
            size="sm"
          >
            <Grid className="h-4 w-4 mr-2" />
            Grid
          </Button>
          <Button
            variant={viewMode === 'categories' ? 'default' : 'outline'}
            onClick={() => setViewMode('categories')}
            size="sm"
          >
            <List className="h-4 w-4 mr-2" />
            Categories
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Employee</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="app">Desktop Apps</SelectItem>
                  <SelectItem value="web">Web Browsing</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users, projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Grid Size</label>
              <Select value={gridSize} onValueChange={(value: 'small' | 'medium' | 'large') => setGridSize(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredScreenshots.length}</div>
              <div className="text-sm text-muted-foreground">Total Screenshots</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(totalActiveTime / 60)}h</div>
              <div className="text-sm text-muted-foreground">Active Time</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(totalIdleTime / 60)}h</div>
              <div className="text-sm text-muted-foreground">Idle Time</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {categories.find(c => c.type === 'app')?.count || 0}
              </div>
              <div className="text-sm text-muted-foreground">App Screenshots</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {categories.find(c => c.type === 'web')?.count || 0}
              </div>
              <div className="text-sm text-muted-foreground">Web Screenshots</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading screenshots...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Combined View */}
          {viewMode === 'combined' && (
            <div className="space-y-6">
              {/* Timeline Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Activity Timeline
                      </CardTitle>
                      <CardDescription>
                        Timeline showing activity periods and productivity levels
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTimeline(!showTimeline)}
                    >
                      {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {showTimeline && (
                  <CardContent>
                    {activityPeriods.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No activity periods found for the selected date and filters.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activityPeriods.map((period, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              period.type === 'active'
                                ? 'border-green-200 bg-green-50'
                                : 'border-orange-200 bg-orange-50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={period.type === 'active' ? 'default' : 'secondary'}
                                  className={
                                    period.type === 'active'
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : 'bg-orange-500 hover:bg-orange-600'
                                  }
                                >
                                  {period.type === 'active' ? (
                                    <Activity className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Pause className="h-3 w-3 mr-1" />
                                  )}
                                  {period.type.toUpperCase()}
                                </Badge>
                                <span className="font-medium">
                                  {period.start} - {period.end}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ({Math.round(period.duration / 60)}h {period.duration % 60}m, {period.screenshots.length} screenshots)
                                </span>
                                {/* Add employee name to activity timeline */}
                                {period.screenshots.length > 0 && (
                                  <span className="text-sm font-medium text-blue-600">
                                    {users.find(u => u.id === period.screenshots[0].user_id)?.full_name || 'Unknown User'}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePeriodExpansion(index)}
                              >
                                {expandedPeriods.has(index) ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                            </div>
                            
                            {expandedPeriods.has(index) && (
                              <div className={`grid gap-2 ${getGridColumns()}`}>
                                {period.screenshots.map((screenshot) => (
                                  <div
                                    key={screenshot.id}
                                    className="aspect-video bg-gray-100 rounded-md overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => handleViewScreenshot(screenshot)}
                                  >
                                    <img
                                      src={screenshot.image_url}
                                      alt={`Screenshot ${format(new Date(screenshot.captured_at), 'HH:mm')}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-screenshot.png';
                                      }}
                                    />
                                    <div className="p-2 bg-white bg-opacity-90">
                                      <div className="text-xs text-gray-600">
                                        {format(new Date(screenshot.captured_at), 'HH:mm')}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Activity: {screenshot.activity_percent}%
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Grid Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Grid className="h-5 w-5" />
                        Screenshot Grid
                      </CardTitle>
                      <CardDescription>
                        All screenshots in a grid layout with activity indicators
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                    >
                      {showGrid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                {showGrid && (
                  <CardContent>
                    {filteredScreenshots.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No screenshots found for the selected date and filters.
                      </div>
                    ) : (
                      <div className={`grid gap-4 ${getGridColumns()}`}>
                        {filteredScreenshots.map((screenshot) => {
                          const user = users.find(u => u.id === screenshot.user_id);
                          const project = projects.find(p => p.id === screenshot.project_id);
                          const capturedTime = format(new Date(screenshot.captured_at), 'HH:mm');
                          
                          return (
                            <div
                              key={screenshot.id}
                              className="group relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer"
                              onClick={() => handleViewScreenshot(screenshot)}
                            >
                              <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                                <img
                                  src={screenshot.image_url}
                                  alt={`Screenshot ${capturedTime}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-screenshot.png';
                                  }}
                                />
                                
                                {/* Activity indicator overlay */}
                                <div className="absolute top-2 right-2">
                                  <Badge
                                    variant={screenshot.activity_percent > 50 ? 'default' : 'secondary'}
                                    className={`text-xs ${
                                      screenshot.activity_percent > 50
                                        ? 'bg-green-500 hover:bg-green-600'
                                        : screenshot.activity_percent > 20
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                  >
                                    {screenshot.activity_percent}%
                                  </Badge>
                                </div>
                              </div>
                              
                              <div className="p-3">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-sm font-medium truncate">
                                    {user?.full_name || user?.email || 'Unknown User'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {capturedTime}
                                  </div>
                                </div>
                                
                                <div className="text-xs text-muted-foreground truncate">
                                  {project?.name || 'No Project'}
                                </div>
                                
                                <div className="flex justify-between items-center mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {screenshot.focus_percent > 70 ? '🌐 Web' : '💻 App'}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground">
                                    Focus: {screenshot.focus_percent}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          )}

          {/* Timeline Only View */}
          {viewMode === 'timeline' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Timeline showing activity periods and productivity levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityPeriods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity periods found for the selected date and filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityPeriods.map((period, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${
                          period.type === 'active'
                            ? 'border-green-200 bg-green-50'
                            : 'border-orange-200 bg-orange-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={period.type === 'active' ? 'default' : 'secondary'}
                              className={
                                period.type === 'active'
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-orange-500 hover:bg-orange-600'
                              }
                            >
                              {period.type === 'active' ? (
                                <Activity className="h-3 w-3 mr-1" />
                              ) : (
                                <Pause className="h-3 w-3 mr-1" />
                              )}
                              {period.type.toUpperCase()}
                            </Badge>
                            <span className="font-medium">
                              {period.start} - {period.end}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({Math.round(period.duration / 60)}h {period.duration % 60}m, {period.screenshots.length} screenshots)
                            </span>
                            {/* Add employee name to activity timeline */}
                            {period.screenshots.length > 0 && (
                              <span className="text-sm font-medium text-blue-600">
                                {users.find(u => u.id === period.screenshots[0].user_id)?.full_name || 'Unknown User'}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePeriodExpansion(index)}
                          >
                            {expandedPeriods.has(index) ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </div>
                        
                        {expandedPeriods.has(index) && (
                          <div className={`grid gap-2 ${getGridColumns()}`}>
                            {period.screenshots.map((screenshot) => (
                              <div
                                key={screenshot.id}
                                className="aspect-video bg-gray-100 rounded-md overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleViewScreenshot(screenshot)}
                              >
                                <img
                                  src={screenshot.image_url}
                                  alt={`Screenshot ${format(new Date(screenshot.captured_at), 'HH:mm')}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-screenshot.png';
                                  }}
                                />
                                <div className="p-2 bg-white bg-opacity-90">
                                  <div className="text-xs text-gray-600">
                                    {format(new Date(screenshot.captured_at), 'HH:mm')}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Activity: {screenshot.activity_percent}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Grid Only View */}
          {viewMode === 'grid' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid className="h-5 w-5" />
                  Screenshot Grid
                </CardTitle>
                <CardDescription>
                  All screenshots in a grid layout with activity indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredScreenshots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No screenshots found for the selected date and filters.
                  </div>
                ) : (
                  <div className={`grid gap-4 ${getGridColumns()}`}>
                    {filteredScreenshots.map((screenshot) => {
                      const user = users.find(u => u.id === screenshot.user_id);
                      const project = projects.find(p => p.id === screenshot.project_id);
                      const capturedTime = format(new Date(screenshot.captured_at), 'HH:mm');
                      
                      return (
                        <div
                          key={screenshot.id}
                          className="group relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer"
                          onClick={() => handleViewScreenshot(screenshot)}
                        >
                          <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                            <img
                              src={screenshot.image_url}
                              alt={`Screenshot ${capturedTime}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-screenshot.png';
                              }}
                            />
                            
                            {/* Activity indicator overlay */}
                            <div className="absolute top-2 right-2">
                              <Badge
                                variant={screenshot.activity_percent > 50 ? 'default' : 'secondary'}
                                className={`text-xs ${
                                  screenshot.activity_percent > 50
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : screenshot.activity_percent > 20
                                    ? 'bg-yellow-500 hover:bg-yellow-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                }`}
                              >
                                {screenshot.activity_percent}%
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <div className="flex justify-between items-start mb-1">
                              <div className="text-sm font-medium truncate">
                                {user?.full_name || user?.email || 'Unknown User'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {capturedTime}
                              </div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground truncate">
                              {project?.name || 'No Project'}
                            </div>
                            
                            <div className="flex justify-between items-center mt-2">
                              <Badge variant="outline" className="text-xs">
                                {screenshot.focus_percent > 70 ? '🌐 Web' : '💻 App'}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Focus: {screenshot.focus_percent}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Categories View */}
          {viewMode === 'categories' && (
            <div className="space-y-6">
              {categories.map((category) => (
                <Card key={category.type}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.type === 'app' ? '💻' : category.type === 'web' ? '🌐' : '❓'}
                      {category.name}
                      <Badge variant="secondary">{category.count} screenshots</Badge>
                    </CardTitle>
                    <CardDescription>
                      {category.type === 'app' && 'Screenshots from desktop applications and software'}
                      {category.type === 'web' && 'Screenshots from web browsers and online activities'}
                      {category.type === 'unknown' && 'Screenshots that could not be categorized'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid gap-4 ${getGridColumns()}`}>
                      {category.screenshots.map((screenshot) => {
                        const user = users.find(u => u.id === screenshot.user_id);
                        const project = projects.find(p => p.id === screenshot.project_id);
                        const capturedTime = format(new Date(screenshot.captured_at), 'HH:mm');
                        
                        return (
                          <div
                            key={screenshot.id}
                            className="group relative bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer"
                            onClick={() => handleViewScreenshot(screenshot)}
                          >
                            <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                              <img
                                src={screenshot.image_url}
                                alt={`Screenshot ${capturedTime}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-screenshot.png';
                                }}
                              />
                              
                              {/* Activity indicator overlay */}
                              <div className="absolute top-2 right-2">
                                <Badge
                                  variant={screenshot.activity_percent > 50 ? 'default' : 'secondary'}
                                  className={`text-xs ${
                                    screenshot.activity_percent > 50
                                      ? 'bg-green-500 hover:bg-green-600'
                                      : screenshot.activity_percent > 20
                                      ? 'bg-yellow-500 hover:bg-yellow-600'
                                      : 'bg-red-500 hover:bg-red-600'
                                  }`}
                                >
                                  {screenshot.activity_percent}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div className="text-sm font-medium truncate">
                                  {user?.full_name || user?.email || 'Unknown User'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {capturedTime}
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground truncate">
                                {project?.name || 'No Project'}
                              </div>
                              
                              <div className="flex justify-between items-center mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {category.type === 'app' ? '💻 App' : category.type === 'web' ? '🌐 Web' : '❓ Unknown'}
                                </Badge>
                                <div className="text-xs text-muted-foreground">
                                  Focus: {screenshot.focus_percent}%
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Screenshot Modal */}
      {selectedScreenshot && (
        <Dialog open={isModalOpen} onOpenChange={closeScreenshotModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Screenshot Details</span>
                <Button variant="ghost" size="sm" onClick={closeScreenshotModal}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={selectedScreenshot.image_url}
                alt={`Screenshot ${selectedScreenshot.id}`}
                className="w-full h-auto rounded-lg max-h-[60vh] object-contain"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Captured:</span>
                  <p className="text-muted-foreground">
                    {format(new Date(selectedScreenshot.captured_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <span className="font-medium">User:</span>
                  <p className="text-muted-foreground">
                    {users.find(u => u.id === selectedScreenshot.user_id)?.full_name || 'Unknown User'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Activity:</span>
                  <p className="text-muted-foreground">
                    {selectedScreenshot.activity_percent ? `${selectedScreenshot.activity_percent}%` : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Focus:</span>
                  <p className="text-muted-foreground">
                    {selectedScreenshot.focus_percent ? `${selectedScreenshot.focus_percent}%` : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadScreenshot(
                    selectedScreenshot.image_url,
                    `screenshot-${selectedScreenshot.id}.png`
                  )}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
