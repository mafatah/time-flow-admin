import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './calendar-styles.css'; // Import our custom styles

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
}

export default function CalendarPage() {
  const { userDetails } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');

  useEffect(() => {
    if (userDetails?.role === 'admin') {
      fetchTimeTrackingData();
    }
  }, [userDetails, currentDate, currentView]);

  const fetchTimeTrackingData = async () => {
    try {
      setLoading(true);
      
      // Get data for the appropriate range based on current view
      let startDate: string;
      let endDate: string;
      
      switch (currentView) {
        case 'month':
          startDate = moment(currentDate).startOf('month').toISOString();
          endDate = moment(currentDate).endOf('month').toISOString();
          break;
        case 'week':
          startDate = moment(currentDate).startOf('week').toISOString();
          endDate = moment(currentDate).endOf('week').toISOString();
          break;
        case 'day':
          startDate = moment(currentDate).startOf('day').toISOString();
          endDate = moment(currentDate).endOf('day').toISOString();
          break;
        case 'agenda':
          startDate = moment(currentDate).startOf('month').toISOString();
          endDate = moment(currentDate).endOf('month').toISOString();
          break;
        default:
          startDate = moment(currentDate).startOf('week').toISOString();
          endDate = moment(currentDate).endOf('week').toISOString();
      }
      
      console.log(`Fetching data for ${currentView} view:`, startDate, 'to', endDate);

      const { data: timeLogs, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          end_time,
          user_id,
          users!inner(full_name, email)
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Fetched time logs:', timeLogs);

      // Convert to calendar events
      const calendarEvents: CalendarEvent[] = timeLogs?.map(log => {
        const start = new Date(log.start_time);
        const end = log.end_time ? new Date(log.end_time) : new Date(); // If ongoing, use current time
        const userName = log.users?.full_name || log.users?.email || 'Unknown';
        
        return {
          id: log.id,
          title: `${userName} - Work Session`,
          start,
          end,
          resource: {
            userId: log.user_id,
            userName,
            isOngoing: !log.end_time
          }
        };
      }) || [];

      console.log('Calendar events:', calendarEvents);
      setEvents(calendarEvents);

    } catch (error) {
      console.error('Error fetching time tracking data:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (newDate: Date) => {
    console.log('Navigating to:', newDate);
    setCurrentDate(newDate);
  };

  const handleViewChange = (view: View) => {
    console.log('Changing view to:', view);
    setCurrentView(view);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    console.log('Selected event:', event);
    toast.info(`Selected: ${event.title}`);
  };

  // Custom event style
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad'; // Default blue
    
    if (event.resource?.isOngoing) {
      backgroundColor = '#ed8936'; // Orange for ongoing sessions
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Time Tracking Calendar</h1>
            <p className="text-muted-foreground">View employee work sessions</p>
          </div>
          <Button onClick={fetchTimeTrackingData} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)} View
            </CardTitle>
          </CardHeader>
          <CardContent>


            {loading ? (
              <div className="flex items-center justify-center h-96">
                <p>Loading calendar...</p>
              </div>
            ) : (
              <div className="calendar-container" style={{ height: 600 }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  view={currentView}
                  views={['month', 'week', 'day', 'agenda']}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  onView={handleViewChange}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventStyleGetter}
                  step={60}
                  showMultiDayTimes
                  popup
                  formats={{
                    timeGutterFormat: 'h:mm A',
                    eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                      localizer ? `${localizer.format(start, 'h:mm A', culture)} - ${localizer.format(end, 'h:mm A', culture)}` : ''
                  }}
                  components={{
                    toolbar: (props) => {
                      const { label, onNavigate, onView, views } = props;
                      
                      // Convert views to an array of view names
                      const viewNames: View[] = ['month', 'week', 'day', 'agenda'];
                      
                      return (
                        <div className="rbc-toolbar">
                          <span className="rbc-btn-group">
                            <button
                              type="button"
                              onClick={() => onNavigate('PREV')}
                              className="rbc-btn"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('TODAY')}
                              className="rbc-btn"
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => onNavigate('NEXT')}
                              className="rbc-btn"
                            >
                              Next
                            </button>
                          </span>
                          
                          <span className="rbc-toolbar-label">{label}</span>
                          
                          <span className="rbc-btn-group">
                            {viewNames.map((view: View) => (
                              <button
                                key={view}
                                type="button"
                                className={`rbc-btn ${currentView === view ? 'rbc-active' : ''}`}
                                onClick={() => onView(view)}
                              >
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                              </button>
                            ))}
                          </span>
                        </div>
                      );
                    }
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event List */}
        <Card>
          <CardHeader>
            <CardTitle>Events This {currentView === 'day' ? 'Day' : currentView === 'week' ? 'Week' : 'Month'}</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events found for this period</p>
            ) : (
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <strong>{event.title}</strong>
                      <br />
                      <span className="text-sm text-muted-foreground">
                        {moment(event.start).format('MMM DD, h:mm A')} - {moment(event.end).format('MMM DD, h:mm A')}
                      </span>
                    </div>
                    {event.resource?.isOngoing && (
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        ONGOING
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
