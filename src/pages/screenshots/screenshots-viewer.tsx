import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/providers/auth-provider';
import { format, startOfDay, endOfDay, addMinutes, differenceInMinutes } from 'date-fns';
import { Calendar, Camera, Users, Filter, Search, Download, Clock, Activity, Pause } from 'lucide-react';

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

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [userFilter, setUserFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('grid');
  const { userDetails } = useAuth();

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    // Also fetch data when filters change
    if (screenshots.length > 0) {
      console.log('🔄 Filters changed, recalculating timeline...');
    }
  }, [userFilter, projectFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Use local date for the selected date, but convert to UTC for database query
      const selectedDateTime = new Date(selectedDate + 'T00:00:00');
      const startDate = startOfDay(selectedDateTime);
      const endDate = endOfDay(selectedDateTime);

      console.log('🔍 Fetching screenshots for date range:', {
        selectedDate,
        selectedDateTime: selectedDateTime.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currentUTC: new Date().toISOString()
      });

      // Fetch screenshots - query the last 24 hours if today is selected
      const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');
      let query = supabase
        .from('screenshots')
        .select('*')
        .order('captured_at', { ascending: true });
      
      if (isToday) {
        // For today, get screenshots from the last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query = query.gte('captured_at', last24Hours.toISOString());
      } else {
        // For other dates, use the date range
        query = query
          .gte('captured_at', startDate.toISOString())
          .lt('captured_at', endDate.toISOString());
      }

      let { data: screenshotsData, error: screenshotsError } = await query;

      if (screenshotsError) throw screenshotsError;
      
      console.log('📊 Raw screenshots data:', screenshotsData);
      
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

      console.log('📸 Mapped screenshots:', mappedScreenshots);
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
    const userMatch = userFilter === 'all' || s.user_id === userFilter;
    const projectMatch = projectFilter === 'all' || s.project_id === projectFilter;
    return userMatch && projectMatch;
  });

  // Generate 10-minute time slots for the day
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = startOfDay(new Date(selectedDate));
    
    for (let i = 0; i < 144; i++) { // 24 hours * 6 (10-minute slots per hour)
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

  // Generate activity periods (active/idle stretches)
  const generateActivityPeriods = (): ActivityPeriod[] => {
    const timeSlots = generateTimeSlots();
    const periods: ActivityPeriod[] = [];
    let currentPeriod: ActivityPeriod | null = null;

    console.log('🕐 Generated time slots:', timeSlots.filter(slot => slot.screenshots.length > 0));

    timeSlots.forEach((slot, index) => {
      // If there are screenshots in this slot, it's always considered an active period
      const hasScreenshots = slot.screenshots.length > 0;
      const isActive = hasScreenshots && slot.activityPercent > 10; // Lower threshold
      const periodType = isActive ? 'active' : 'idle';

      // Only process slots that have screenshots
      if (hasScreenshots) {
        if (!currentPeriod || currentPeriod.type !== periodType) {
          // Start new period
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
          // Extend current period
          currentPeriod.end = slot.time;
          currentPeriod.duration += 10;
          currentPeriod.screenshots.push(...slot.screenshots);
        }
      } else if (currentPeriod) {
        // End the current period if we hit a slot with no screenshots
        periods.push(currentPeriod);
        currentPeriod = null;
      }
    });

    if (currentPeriod) {
      periods.push(currentPeriod);
    }

    const filteredPeriods = periods.filter(p => p.duration > 0 && p.screenshots.length > 0);
    console.log('📈 Generated activity periods:', filteredPeriods);
    
    return filteredPeriods;
  };

  const timeSlots = generateTimeSlots();
  const activityPeriods = generateActivityPeriods();
  const totalActiveTime = activityPeriods
    .filter(p => p.type === 'active')
    .reduce((sum, p) => sum + p.duration, 0);
  const totalIdleTime = activityPeriods
    .filter(p => p.type === 'idle')
    .reduce((sum, p) => sum + p.duration, 0);

  // Debug info
  console.log('🐛 Debug Info:', {
    selectedDate,
    userFilter,
    projectFilter,
    totalScreenshots: screenshots.length,
    filteredScreenshots: filteredScreenshots.length,
    activityPeriods: activityPeriods.length,
    totalActiveTime,
    totalIdleTime
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Screenshots Timeline</h1>
          <p className="text-muted-foreground">Track activity and screenshots in 10-minute intervals</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            onClick={() => setViewMode('timeline')}
            size="sm"
          >
            <Clock className="h-4 w-4 mr-1" />
            Timeline
          </Button>
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
            size="sm"
          >
            <Camera className="h-4 w-4 mr-1" />
            Grid
          </Button>
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{filteredScreenshots.length}</div>
                <div className="text-sm text-muted-foreground">Screenshots</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{Math.round(totalActiveTime / 60)}h {totalActiveTime % 60}m</div>
                <div className="text-sm text-muted-foreground">Active Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{Math.round(totalIdleTime / 60)}h {totalIdleTime % 60}m</div>
                <div className="text-sm text-muted-foreground">Idle Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{activityPeriods.length}</div>
                <div className="text-sm text-muted-foreground">Activity Periods</div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
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

      {/* Main Content - Timeline or Grid View */}
      {viewMode === 'timeline' ? (
        <div className="space-y-4">
          {/* Activity Periods Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                Activity and idle periods throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading timeline...</div>
              ) : activityPeriods.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-4 text-muted-foreground">
                    No activity periods detected.
                  </div>
                  {filteredScreenshots.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Individual Screenshots ({filteredScreenshots.length})</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {filteredScreenshots.slice(0, 12).map((screenshot, index) => (
                          <div key={screenshot.id} className="space-y-1">
                            <img
                              src={screenshot.image_url}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-20 object-cover rounded border cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(screenshot.image_url, '_blank')}
                            />
                            <div className="text-xs text-center text-muted-foreground">
                              {format(new Date(screenshot.captured_at), 'HH:mm')}
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredScreenshots.length > 12 && (
                        <div className="text-center">
                          <Button variant="outline" size="sm" onClick={() => setViewMode('grid')}>
                            View All {filteredScreenshots.length} Screenshots
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activityPeriods.map((period, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        {period.type === 'active' ? (
                          <Activity className="h-4 w-4 text-green-500" />
                        ) : (
                          <Pause className="h-4 w-4 text-orange-500" />
                        )}
                        <Badge variant={period.type === 'active' ? 'default' : 'secondary'}>
                          {period.type === 'active' ? 'Active' : 'Idle'}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {period.start} - {period.end} ({Math.round(period.duration / 60)}h {period.duration % 60}m)
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {period.screenshots.length} screenshots captured
                        </div>
                      </div>
                      {period.screenshots.length > 0 && (
                        <div className="flex gap-1">
                          {period.screenshots.slice(0, 3).map((screenshot, idx) => (
                            <img
                              key={idx}
                              src={screenshot.image_url}
                              alt={`Screenshot ${idx + 1}`}
                              className="w-12 h-8 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => window.open(screenshot.image_url, '_blank')}
                            />
                          ))}
                          {period.screenshots.length > 3 && (
                            <div className="w-12 h-8 bg-muted rounded border flex items-center justify-center text-xs">
                              +{period.screenshots.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 10-minute Intervals Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Heatmap (10-minute intervals)</CardTitle>
              <CardDescription>
                Visual representation of activity throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Time labels */}
                <div className="grid grid-cols-24 gap-1 text-xs text-center text-muted-foreground">
                  {Array.from({length: 24}, (_, i) => (
                    <div key={i}>{i.toString().padStart(2, '0')}</div>
                  ))}
                </div>
                
                {/* Activity blocks */}
                <div className="grid grid-cols-144 gap-1">
                  {timeSlots.map((slot, index) => {
                    const intensity = slot.screenshots.length > 0 ? 
                      Math.min(slot.activityPercent / 100, 1) : 0;
                    
                    return (
                      <div
                        key={index}
                        className={`h-4 rounded cursor-pointer transition-all hover:scale-110 ${
                          slot.screenshots.length === 0 
                            ? 'bg-gray-100' 
                            : slot.isActive 
                              ? 'bg-green-500' 
                              : slot.isIdle 
                                ? 'bg-orange-300' 
                                : 'bg-blue-300'
                        }`}
                        style={{
                          opacity: slot.screenshots.length > 0 ? Math.max(0.3, intensity) : 0.1
                        }}
                        title={`${slot.time}: ${slot.screenshots.length} screenshots, ${slot.activityPercent}% activity`}
                        onClick={() => {
                          if (slot.screenshots.length > 0) {
                            window.open(slot.screenshots[0].image_url, '_blank');
                          }
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span>Active (&gt;30% activity)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-300 rounded"></div>
                    <span>Low Activity (10-30%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-300 rounded"></div>
                    <span>Idle (&lt;10% activity)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 rounded"></div>
                    <span>No Data</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Screenshots Grid ({filteredScreenshots.length} records)
            </CardTitle>
            <CardDescription>
              All captured screenshots in grid format
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading screenshots...</div>
            ) : filteredScreenshots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No screenshots found for selected date and filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredScreenshots.map((screenshot: any) => {
                  const user = users.find((u: any) => u.id === screenshot.user_id);
                  const project = projects.find((p: any) => p.id === screenshot.project_id);
                  
                  return (
                    <div key={screenshot.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <img
                        src={screenshot.image_url}
                        alt={`Screenshot ${screenshot.id}`}
                        className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(screenshot.image_url, '_blank')}
                      />
                      <div className="p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="text-sm font-medium truncate">
                            {user?.full_name || user?.email || 'Unknown User'}
                          </div>
                          {project && (
                            <Badge variant="secondary" className="text-xs">
                              {project.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {format(new Date(screenshot.captured_at), 'HH:mm:ss')}
                        </p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            <span>{screenshot.activity_percent}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            <span>{screenshot.focus_percent}%</span>
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
    </div>
  );
}
