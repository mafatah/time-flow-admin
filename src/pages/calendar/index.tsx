import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css'; // We'll create custom styles

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
    userId: string;
    projectId: string;
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

      // Transform time logs into calendar events with proper duration calculation and improved display
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
            const maxDuration = 12 * 60 * 60 * 1000; // 12 hours max for active sessions
            const sessionDuration = now.getTime() - startTime.getTime();
            
            if (sessionDuration > maxDuration) {
              endTime = new Date(startTime.getTime() + maxDuration);
            } else {
              endTime = now;
            }
          }
          
          // Calculate duration in minutes and validate
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = Math.max(10, Math.round(durationMs / (1000 * 60))); // Minimum 10 minutes
          
          // Cap unreasonable durations (longer than 12 hours)
          const cappedDuration = Math.min(durationMinutes, 12 * 60);
          
          // Adjust end time if duration was capped
          const finalEndTime = new Date(startTime.getTime() + cappedDuration * 60 * 1000);
          
          // Format duration display
          const hours = Math.floor(cappedDuration / 60);
          const minutes = cappedDuration % 60;
          const durationDisplay = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
          
          // Color-code based on duration and status
          const getStatusColor = () => {
            if (!log.end_time) return 'active'; // Still running
            if (cappedDuration >= 480) return 'long'; // 8+ hours
            if (cappedDuration >= 240) return 'medium'; // 4+ hours
            return 'short'; // Less than 4 hours
          };
          
          return {
            id: log.id,
            title: `${userName.split(' ')[0]} - ${projectName}`, // Shortened for better display
            start: startTime,
            end: finalEndTime,
            resource: {
              user: userName,
              project: projectName,
              duration: durationDisplay,
              rawDuration: cappedDuration,
              status: getStatusColor(),
              userId: log.user_id,
              projectId: log.project_id || ''
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

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // You can implement manual time entry here if needed
    console.log('Selected slot:', start, end);
  };

  // Custom event component with better styling
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const { resource } = event;
    
    const getEventColors = () => {
      switch (resource.status) {
        case 'active':
          return 'bg-green-500 text-white border-green-600';
        case 'long':
          return 'bg-orange-500 text-white border-orange-600';
        case 'medium':
          return 'bg-blue-500 text-white border-blue-600';
        case 'short':
          return 'bg-gray-500 text-white border-gray-600';
        default:
          return 'bg-gray-400 text-white border-gray-500';
      }
    };

    return (
      <div className={`px-1 py-0.5 rounded text-xs font-medium border ${getEventColors()} overflow-hidden`}>
        <div className="truncate">{event.title}</div>
        <div className="text-xs opacity-90">{resource.duration}</div>
      </div>
    );
  };

  // Custom week header component  
  const WeekHeader = ({ date, localizer }: any) => {
    return (
      <div className="text-center py-2">
        <div className="font-semibold">{localizer?.format(date, 'dddd') || ''}</div>
        <div className="text-sm text-gray-600">{localizer?.format(date, 'MMM DD') || ''}</div>
      </div>
    );
  };

  // Custom day cell wrapper to prevent overlapping
  const DayCellWrapper = ({ children, value }: any) => {
    return (
      <div className="calendar-day-cell min-h-[120px] p-1 border-gray-200">
        {children}
      </div>
    );
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const { resource } = event;
    
    let backgroundColor = '#3174ad';
    let borderColor = '#2c5282';
    
    switch (resource.status) {
      case 'active':
        backgroundColor = '#48bb78';
        borderColor = '#38a169';
        break;
      case 'long':
        backgroundColor = '#ed8936';
        borderColor = '#dd6b20';
        break;
      case 'medium':
        backgroundColor = '#4299e1';
        borderColor = '#3182ce';
        break;
      case 'short':
        backgroundColor = '#a0aec0';
        borderColor = '#718096';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        fontSize: '12px',
        padding: '2px 4px',
        margin: '1px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    };
  };

  if (userDetails?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="calendar-page-container">
      <div className="container mx-auto p-6 space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold truncate">Time Tracking Calendar</h1>
            <p className="text-muted-foreground text-sm">Click on any time block to see details. Green = Active sessions, Orange = Long sessions (8+ hours)</p>
          </div>
          
          {/* View Controls */}
          <div className="calendar-controls flex-shrink-0">
            <Button
              variant={currentView === 'month' ? 'default' : 'outline'}
              onClick={() => setCurrentView('month')}
              size="sm"
            >
              Month
            </Button>
            <Button
              variant={currentView === 'week' ? 'default' : 'outline'}
              onClick={() => setCurrentView('week')}
              size="sm"
            >
              Week
            </Button>
            <Button
              variant={currentView === 'day' ? 'default' : 'outline'}
              onClick={() => setCurrentView('day')}
              size="sm"
            >
              Day
            </Button>
            <Button
              variant={currentView === 'agenda' ? 'default' : 'outline'}
              onClick={() => setCurrentView('agenda')}
              size="sm"
            >
              Agenda
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Employee</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
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

              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={() => setCurrentDate(new Date())} variant="outline" size="sm">
                  Today
                </Button>
                <Button onClick={() => fetchTimeLogs()} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="w-full">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded flex-shrink-0"></div>
                <span>Active Sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded flex-shrink-0"></div>
                <span>Long Sessions (8+ hours)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded flex-shrink-0"></div>
                <span>Medium Sessions (4-8 hours)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded flex-shrink-0"></div>
                <span>Short Sessions (&lt;4 hours)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="w-full">
          <CardContent className="pt-6 p-2 lg:p-6">
            <div className="calendar-container" style={{ height: 600, overflow: 'hidden' }}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <p>Loading calendar...</p>
                </div>
              ) : (
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%', minHeight: 500 }}
                  view={currentView}
                  onView={setCurrentView}
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable
                  eventPropGetter={eventStyleGetter}
                  components={{
                    event: EventComponent,
                    week: {
                      header: WeekHeader
                    },
                    dateCellWrapper: DayCellWrapper
                  }}
                  formats={{
                    timeGutterFormat: 'HH:mm',
                    dayHeaderFormat: 'ddd MMM DD',
                    dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                      `${localizer?.format(start, 'MMM DD', culture) || ''} - ${localizer?.format(end, 'MMM DD', culture) || ''}`,
                    agendaTimeFormat: 'HH:mm',
                    agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
                      `${localizer?.format(start, 'HH:mm', culture) || ''} - ${localizer?.format(end, 'HH:mm', culture) || ''}`
                  }}
                  min={new Date(2023, 0, 1, 6, 0)} // Start at 6 AM
                  max={new Date(2023, 0, 1, 22, 0)} // End at 10 PM
                  step={30}
                  timeslots={2}
                  scrollToTime={new Date(2023, 0, 1, 8, 0)} // Scroll to 8 AM
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Details Modal */}
        {selectedEvent && (
          <Card className="mt-4 w-full">
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-medium">Employee:</label>
                  <p>{selectedEvent.resource.user}</p>
                </div>
                <div>
                  <label className="font-medium">Project:</label>
                  <p>{selectedEvent.resource.project}</p>
                </div>
                <div>
                  <label className="font-medium">Start Time:</label>
                  <p>{moment(selectedEvent.start).format('YYYY-MM-DD HH:mm')}</p>
                </div>
                <div>
                  <label className="font-medium">End Time:</label>
                  <p>{moment(selectedEvent.end).format('YYYY-MM-DD HH:mm')}</p>
                </div>
                <div>
                  <label className="font-medium">Duration:</label>
                  <p>{selectedEvent.resource.duration}</p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <Badge variant={selectedEvent.resource.status === 'active' ? 'default' : 'secondary'}>
                    {selectedEvent.resource.status}
                  </Badge>
                </div>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
