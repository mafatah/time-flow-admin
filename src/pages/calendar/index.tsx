import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  user_id: string;
  project_id: string | null;
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    user: string;
    project: string;
    duration: string;
  };
}

export default function CalendarPage() {
  const { userDetails } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchUsers();
      fetchProjects();
    }
  }, [userDetails]);

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchTimeLogs();
    }
  }, [selectedUser, selectedProject, currentDate, currentView, userDetails]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'employee');

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
        .select('id, name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    }
  };

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('time_logs')
        .select('*')
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false });

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data: timeLogs, error } = await query;

      if (error) throw error;

      // Transform time logs into calendar events
      const calendarEvents: CalendarEvent[] = (timeLogs || []).map((log: TimeLog) => {
        const user = users.find((u: User) => u.id === log.user_id);
        const project = projects.find((p: Project) => p.id === log.project_id);
        
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        return {
          id: log.id,
          title: `${user?.full_name || 'Unknown'} - ${project?.name || 'No Project'}`,
          start: startTime,
          end: endTime,
          resource: {
            user: user?.full_name || 'Unknown',
            project: project?.name || 'No Project',
            duration: `${Math.floor(duration / 60)}h ${duration % 60}m`
          }
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching time logs:', error);
      toast.error('Failed to fetch time logs');
    } finally {
      setLoading(false);
    }
  };

  

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Calendar View</h1>
        <div className="flex items-center space-x-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user: User) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Project" />
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

      <Card>
        <CardHeader>
          <CardTitle>Time Tracking Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading calendar data...</div>
          ) : (
            <div style={{ height: '600px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                style={{ height: '100%' }}
                eventPropGetter={() => ({
                  style: {
                    backgroundColor: '#3b82f6',
                    borderRadius: '4px',
                    opacity: 0.8,
                    color: 'white',
                    border: '0px',
                    display: 'block'
                  }
                })}
                components={{
                  event: ({ event }) => (
                    <div className="text-xs">
                      <div className="font-medium">{event.resource.user}</div>
                      <div>{event.resource.project}</div>
                      <Badge variant="secondary" className="text-xs">
                        {event.resource.duration}
                      </Badge>
                    </div>
                  )
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
