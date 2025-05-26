
import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  project_id: string;
  user_id: string;
  is_idle: boolean;
  project_name?: string;
  user_name?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: TimeLog;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [timeLog, setTimeLog] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTimeData();
  }, []);

  const fetchTimeData = async () => {
    setLoading(true);
    try {
      // Get time logs for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const { data: timeLogData, error: timeLogError } = await supabase
        .from('time_logs')
        .select('*')
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time', { ascending: false });

      if (timeLogError) throw timeLogError;

      if (!timeLogData || timeLogData.length === 0) {
        setTimeLog([]);
        setEvents([]);
        return;
      }

      // Get unique user IDs and project IDs
      const userIds = [...new Set(timeLogData.map(log => log.user_id))];
      const projectIds = [...new Set(timeLogData.map(log => log.project_id))];

      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      // Fetch project data
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      // Enrich time logs with user and project names
      const enrichedLogs = timeLogData.map(log => ({
        ...log,
        user_name: userData?.find(u => u.id === log.user_id)?.full_name || 'Unknown User',
        project_name: projectData?.find(p => p.id === log.project_id)?.name || 'Unknown Project'
      }));

      setTimeLog(enrichedLogs);

      // Convert to calendar events
      const calendarEvents: CalendarEvent[] = enrichedLogs
        .filter(log => log.end_time) // Only show completed sessions
        .map(log => ({
          id: log.id,
          title: `${log.user_name} - ${log.project_name}`,
          start: new Date(log.start_time),
          end: new Date(log.end_time!),
          resource: log
        }));

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching time data:', error);
      toast.error('Failed to fetch time tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const isIdle = event.resource.is_idle;
    return {
      style: {
        backgroundColor: isIdle ? '#f59e0b' : '#10b981',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Time Tracking Calendar</h1>
        <Button onClick={fetchTimeData} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: '600px' }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  onSelectEvent={handleSelectEvent}
                  eventPropGetter={eventStyleGetter}
                  views={['month', 'week', 'day']}
                  defaultView="month"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                <span className="text-sm">Active Time</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-sm">Idle Time</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Total Sessions:</span> {events.length}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Active Sessions:</span>{' '}
                  {events.filter(e => !e.resource.is_idle).length}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Idle Sessions:</span>{' '}
                  {events.filter(e => e.resource.is_idle).length}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time Log Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <strong>User:</strong> {selectedEvent.resource.user_name}
              </div>
              <div>
                <strong>Project:</strong> {selectedEvent.resource.project_name}
              </div>
              <div>
                <strong>Start Time:</strong>{' '}
                {format(new Date(selectedEvent.resource.start_time), 'PPpp')}
              </div>
              <div>
                <strong>End Time:</strong>{' '}
                {selectedEvent.resource.end_time
                  ? format(new Date(selectedEvent.resource.end_time), 'PPpp')
                  : 'Ongoing'}
              </div>
              <div>
                <strong>Duration:</strong>{' '}
                {selectedEvent.resource.end_time
                  ? formatDuration(selectedEvent.resource.start_time, selectedEvent.resource.end_time)
                  : 'Ongoing'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <Badge variant={selectedEvent.resource.is_idle ? 'secondary' : 'default'}>
                  {selectedEvent.resource.is_idle ? 'Idle' : 'Active'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
