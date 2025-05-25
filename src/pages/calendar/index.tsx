import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Eye,
  BarChart3,
  Target
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
  endOfDay
} from "date-fns";

interface DayActivity {
  date: string;
  totalHours: number;
  totalTasks: number;
  projects: string[];
  status: 'none' | 'low' | 'medium' | 'high';
}

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  project_id: string;
  projects?: {
    name: string;
  } | null;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [dayActivities, setDayActivities] = useState<{ [key: string]: DayActivity }>({});
  const [selectedDayLogs, setSelectedDayLogs] = useState<TimeLog[]>([]);
  
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadCalendarData();
  }, [currentDate, userDetails]);

  useEffect(() => {
    if (selectedDate) {
      loadDayDetails(selectedDate);
    }
  }, [selectedDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      // Fetch time logs for the current month with project information
      let query = supabase
        .from('time_logs')
        .select(`
          id, 
          start_time, 
          end_time, 
          user_id, 
          project_id,
          projects:project_id (
            name
          )
        `)
        .not('end_time', 'is', null)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      // Filter by user role
      if (userDetails?.role === 'employee') {
        query = query.eq('user_id', userDetails.id);
      }

      const { data: timeLogs, error } = await query;
      if (error) throw error;

      // Process data by day
      const activities: { [key: string]: DayActivity } = {};
      
      timeLogs?.forEach(log => {
        if (log.end_time) {
          const date = format(parseISO(log.start_time), 'yyyy-MM-dd');
          const start = parseISO(log.start_time).getTime();
          const end = parseISO(log.end_time).getTime();
          const hours = (end - start) / (1000 * 60 * 60);
          
          if (!activities[date]) {
            activities[date] = {
              date,
              totalHours: 0,
              totalTasks: 0,
              projects: [],
              status: 'none'
            };
          }
          
          activities[date].totalHours += hours;
          activities[date].totalTasks += 1;
          
          // Add project name if available
          const projectName = log.projects?.name || 'Unknown Project';
          if (!activities[date].projects.includes(projectName)) {
            activities[date].projects.push(projectName);
          }
        }
      });

      // Determine status based on hours worked
      Object.values(activities).forEach(activity => {
        if (activity.totalHours >= 8) {
          activity.status = 'high';
        } else if (activity.totalHours >= 4) {
          activity.status = 'medium';
        } else if (activity.totalHours > 0) {
          activity.status = 'low';
        }
      });

      setDayActivities(activities);

    } catch (error: any) {
      console.error('Error loading calendar data:', error);
      toast({
        title: "Error loading calendar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDayDetails = async (date: Date) => {
    try {
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      let query = supabase
        .from('time_logs')
        .select(`
          id, 
          start_time, 
          end_time, 
          project_id,
          projects:project_id (
            name
          )
        `)
        .not('end_time', 'is', null)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (userDetails?.role === 'employee') {
        query = query.eq('user_id', userDetails.id);
      }

      const { data: logs, error } = await query;
      if (error) throw error;

      setSelectedDayLogs(logs || []);

    } catch (error: any) {
      console.error('Error loading day details:', error);
      toast({
        title: "Error loading day details",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = parseISO(startTime).getTime();
    const end = parseISO(endTime).getTime();
    const duration = end - start;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-orange-500';
      default: return 'bg-gray-200';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDate(null);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Calendar" subtitle="Time tracking calendar view" />
        <div className="text-center py-8">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" subtitle="Time tracking calendar view" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(currentDate, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const activity = dayActivities[dateKey];
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);
                  
                  return (
                    <button
                      key={dateKey}
                      onClick={() => selectDate(day)}
                      className={`
                        relative p-2 h-16 border rounded-lg text-left transition-colors
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}
                        ${isCurrentDay ? 'ring-2 ring-primary' : ''}
                        ${!isSameMonth(day, currentDate) ? 'text-muted-foreground' : ''}
                      `}
                    >
                      <div className="text-sm font-medium">
                        {format(day, 'd')}
                      </div>
                      
                      {activity && (
                        <div className="absolute bottom-1 left-1 right-1">
                          <div className={`h-1 rounded-full ${getStatusColor(activity.status)}`} />
                          <div className="text-xs mt-1 truncate">
                            {activity.totalHours.toFixed(1)}h
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>8+ hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span>4-8 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>1-4 hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <span>No activity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Monthly Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {Object.values(dayActivities).reduce((sum, day) => sum + day.totalHours, 0).toFixed(1)}h
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">
                      {Object.keys(dayActivities).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Active Days</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {Object.values(dayActivities).reduce((sum, day) => sum + day.totalTasks, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Sessions</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Active Projects</div>
                  <div className="space-y-1">
                    {Array.from(new Set(
                      Object.values(dayActivities).flatMap(day => day.projects)
                    )).slice(0, 5).map(project => (
                      <Badge key={project} variant="outline" className="text-xs">
                        {project}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDayLogs.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayLogs.map(log => (
                      <div key={log.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">
                            {log.projects?.name || 'Unknown Project'}
                          </div>
                          <Badge variant={getStatusBadgeVariant(
                            dayActivities[format(selectedDate, 'yyyy-MM-dd')]?.status || 'none'
                          )}>
                            {log.end_time ? formatDuration(log.start_time, log.end_time) : 'Active'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(log.start_time), 'HH:mm')} - {' '}
                          {log.end_time ? format(parseISO(log.end_time), 'HH:mm') : 'Active'}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total for day:</span>
                        <span className="font-bold">
                          {dayActivities[format(selectedDate, 'yyyy-MM-dd')]?.totalHours.toFixed(1) || '0'}h
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity recorded for this day</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
