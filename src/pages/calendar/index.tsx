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
    rawDuration: number; // in minutes
    status: string;
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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
      
      // Get data for the visible date range based on current view
      let startDate, endDate;
      const currentMoment = moment(currentDate);
      
      switch (currentView) {
        case 'month':
          startDate = currentMoment.clone().startOf('month').startOf('week');
          endDate = currentMoment.clone().endOf('month').endOf('week');
          break;
        case 'week':
          startDate = currentMoment.clone().startOf('week');
          endDate = currentMoment.clone().endOf('week');
          break;
        case 'day':
          startDate = currentMoment.clone().startOf('day');
          endDate = currentMoment.clone().endOf('day');
          break;
        default:
          startDate = currentMoment.clone().subtract(7, 'days');
          endDate = currentMoment.clone().add(7, 'days');
      }
      
      let query = supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          project_id,
          status,
          users!inner(id, full_name, email),
          projects(id, name)
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data: timeLogs, error } = await query;

      if (error) throw error;

      // Transform time logs into calendar events with proper duration calculation
      const calendarEvents: CalendarEvent[] = (timeLogs || [])
        .filter(log => log.start_time) // Ensure we have valid start time
        .map((log: any) => {
          const userName = log.users?.full_name || log.users?.email || 'Unknown User';
          const projectName = log.projects?.name || 'Default Project';
          
          const startTime = new Date(log.start_time);
          
          // Handle end time properly - if no end_time, use current time but cap at reasonable limit
          let endTime: Date;
          if (log.end_time) {
            endTime = new Date(log.end_time);
          } else {
            // For active sessions, use current time but cap display duration
            const now = new Date();
            const maxDuration = 24 * 60 * 60 * 1000; // 24 hours max
            const sessionDuration = now.getTime() - startTime.getTime();
            
            if (sessionDuration > maxDuration) {
              endTime = new Date(startTime.getTime() + maxDuration);
            } else {
              endTime = now;
            }
          }
          
          // Calculate duration in minutes and validate
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));
          
          // Cap unreasonable durations (longer than 16 hours)
          const cappedDuration = Math.min(durationMinutes, 16 * 60);
          
          // Adjust end time if duration was capped
          const finalEndTime = new Date(startTime.getTime() + cappedDuration * 60 * 1000);
          
          // Format duration display
          const hours = Math.floor(cappedDuration / 60);
          const minutes = cappedDuration % 60;
          const durationDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          
          return {
            id: log.id,
            title: `${userName}`,
            start: startTime,
            end: finalEndTime,
            resource: {
              user: userName,
              project: projectName,
              duration: durationDisplay,
              rawDuration: cappedDuration,
              status: log.status || 'completed'
            }
          };
        })
        .filter(event => event.resource.rawDuration > 0); // Filter out zero-duration events

      console.log(`📅 Loaded ${calendarEvents.length} calendar events for ${currentView} view`);
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching time logs:', error);
      toast.error('Failed to fetch time logs');
    } finally {
      setLoading(false);
    }
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    toast.info(`Selected: ${event.resource.user} - ${event.resource.project} (${event.resource.duration})`);
  };

  // Handle slot selection (for creating new events - admin feature)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (userDetails?.role === 'admin') {
      const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      toast.info(`Selected time slot: ${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')} (${duration}min)`);
    }
  };

  // Custom event component with better styling
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const isActive = event.resource.status === 'active';
    const isLongSession = event.resource.rawDuration > 480; // 8+ hours
    
    return (
      <div 
        className={`text-xs p-2 rounded cursor-pointer transition-all hover:opacity-90 min-h-[60px] flex flex-col justify-between ${
          isActive ? 'bg-green-500 text-white' : 
          isLongSession ? 'bg-orange-500 text-white' : 
          'bg-blue-500 text-white'
        }`}
        onClick={() => handleSelectEvent(event)}
        style={{ margin: '1px', minHeight: '50px' }}
      >
        <div className="flex-1">
          <div className="font-medium text-sm leading-tight mb-1">{event.resource.user}</div>
          <div className="text-xs opacity-90 leading-tight">{event.resource.project}</div>
        </div>
        <div className="mt-1">
          <span className="text-xs bg-black bg-opacity-20 px-1 py-0.5 rounded">
            {event.resource.duration} {isActive && '(Active)'}
          </span>
        </div>
      </div>
    );
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
          
          <Button 
            variant="outline" 
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Statistics Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{events.length}</div>
              <div className="text-sm text-muted-foreground">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.resource.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(events.reduce((total, e) => total + e.resource.rawDuration, 0) / 60)}h
              </div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(events.map(e => e.resource.user)).size}
              </div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Tracking Calendar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click on any time block to see details. Green = Active sessions, Orange = Long sessions (8+ hours)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading calendar data...</div>
          ) : (
            <div style={{ height: '600px' }} className="calendar-container">
              <style>{`
                .rbc-calendar {
                  font-family: inherit;
                }
                .rbc-event {
                  border: none !important;
                  border-radius: 6px !important;
                  padding: 4px 6px !important;
                  margin: 2px 1px !important;
                  min-height: 45px !important;
                  overflow: visible !important;
                }
                .rbc-month-view .rbc-event {
                  min-height: 20px !important;
                  margin: 1px !important;
                }
                .rbc-week-view .rbc-event, .rbc-day-view .rbc-event {
                  min-height: 50px !important;
                  margin: 2px 1px !important;
                }
                .rbc-agenda-view .rbc-event {
                  min-height: auto !important;
                }
                .rbc-event-content {
                  font-size: 12px !important;
                  line-height: 1.2 !important;
                }
                .rbc-time-slot {
                  border-bottom: 1px solid #e5e7eb !important;
                }
                .rbc-timeslot-group {
                  border-bottom: 1px solid #d1d5db !important;
                }
                .rbc-time-view .rbc-time-gutter .rbc-time-slot {
                  font-size: 12px !important;
                }
                .rbc-month-view .rbc-date-cell {
                  padding: 8px 4px !important;
                  min-height: 80px !important;
                }
                .rbc-week-view .rbc-time-content, .rbc-day-view .rbc-time-content {
                  min-height: 500px !important;
                }
              `}</style>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={handleSelectSlot}
                selectable={userDetails?.role === 'admin'}
                style={{ height: '100%' }}
                eventPropGetter={(event: CalendarEvent) => {
                  const isActive = event.resource.status === 'active';
                  const isLongSession = event.resource.rawDuration > 480;
                  
                  return {
                    style: {
                      backgroundColor: isActive ? '#22c55e' : isLongSession ? '#f97316' : '#3b82f6',
                      borderRadius: '4px',
                      opacity: 0.9,
                      color: 'white',
                      border: '0px',
                      display: 'block',
                      cursor: 'pointer'
                    }
                  };
                }}
                components={{
                  event: EventComponent
                }}
                min={moment().hour(6).minute(0).toDate()} // Start calendar at 6 AM
                max={moment().hour(22).minute(0).toDate()} // End calendar at 10 PM
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Event Details */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>User:</strong> {selectedEvent.resource.user}
              </div>
              <div>
                <strong>Project:</strong> {selectedEvent.resource.project}
              </div>
              <div>
                <strong>Start Time:</strong> {moment(selectedEvent.start).format('MMMM D, YYYY h:mm A')}
              </div>
              <div>
                <strong>End Time:</strong> {moment(selectedEvent.end).format('MMMM D, YYYY h:mm A')}
              </div>
              <div>
                <strong>Duration:</strong> {selectedEvent.resource.duration}
              </div>
              <div>
                <strong>Status:</strong> 
                <Badge variant={selectedEvent.resource.status === 'active' ? 'default' : 'secondary'} className="ml-2">
                  {selectedEvent.resource.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
