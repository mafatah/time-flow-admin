import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Timer, 
  Activity,
  Coffee,
  Target
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface Task {
  id: string;
  name: string;
  project_id: string;
}

interface ActiveSession {
  id: string;
  task_id: string;
  start_time: string;
  is_idle: boolean;
  task: Task;
}

const EmployeeTimeTracker = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (userDetails?.id) {
      fetchTasks();
      checkActiveSession();
      
      // Update current time every second
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userDetails?.id]);

  const fetchTasks = async () => {
    if (!userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, project_id')
        .eq('user_id', userDetails.id)
        .order('name');

      if (error) throw error;
      setTasks(data || []);
      
      if (data && data.length > 0 && !selectedTask) {
        setSelectedTask(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    if (!userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          task_id,
          start_time,
          is_idle,
          tasks!fk_time_logs_tasks(
            id,
            name,
            projects!fk_tasks_projects(id, name)
          )
        `)
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setActiveSession(data as any);
        setSelectedTask(data.task_id);
      }
    } catch (error) {
      // No active session found, which is fine
      setActiveSession(null);
    }
  };

  const startTracking = async () => {
    if (!selectedTask || !userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userDetails.id,
          task_id: selectedTask,
          start_time: new Date().toISOString(),
          is_idle: false
        })
        .select(`
          id,
          task_id,
          start_time,
          is_idle,
          tasks!fk_time_logs_tasks(
            id,
            name,
            projects!fk_tasks_projects(id, name)
          )
        `)
        .single();

      if (error) throw error;

      setActiveSession(data as any);
      toast({
        title: 'Time tracking started',
        description: 'Time tracking has been started successfully',
      });
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      toast({
        title: 'Error starting tracking',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const stopTracking = async () => {
    if (!activeSession) return;

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      const duration = differenceInMinutes(new Date(), new Date(activeSession.start_time));
      
      setActiveSession(null);
      toast({
        title: 'Time tracking stopped',
        description: `Tracked ${Math.floor(duration / 60)}h ${duration % 60}m for ${activeSession.task.name}`,
      });
    } catch (error: any) {
      console.error('Error stopping tracking:', error);
      toast({
        title: 'Error stopping tracking',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = currentTime;
    const totalMinutes = differenceInMinutes(now, start);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Tracker</h1>
          <p className="text-gray-600">Track your work time efficiently</p>
        </div>
        <div className="flex items-center space-x-2">
          {activeSession ? (
            <Badge className="bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              Tracking
            </Badge>
          ) : (
            <Badge variant="outline">
              <Timer className="h-3 w-3 mr-1" />
              Not Tracking
            </Badge>
          )}
        </div>
      </div>

      {/* Main Timer Card */}
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-2xl">
            {activeSession ? 'Currently Tracking' : 'Ready to Track'}
          </CardTitle>
          {activeSession && (
            <CardDescription>
              {activeSession.task.name}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {activeSession ? (
            <div className="space-y-4">
              <div className="text-6xl font-mono font-bold text-primary">
                {formatDuration(activeSession.start_time)}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">
                  Started at {format(new Date(activeSession.start_time), 'HH:mm')}
                </span>
              </div>
              {activeSession.is_idle && (
                <div className="flex items-center justify-center space-x-2 text-yellow-600">
                  <Coffee className="h-4 w-4" />
                  <span className="text-sm">Currently idle</span>
                </div>
              )}
              <Button 
                onClick={stopTracking}
                variant="destructive"
                size="lg"
                className="w-full max-w-xs"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl font-mono font-bold text-gray-400">
                00:00
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Task</label>
                  <Select value={selectedTask} onValueChange={setSelectedTask}>
                    <SelectTrigger className="max-w-md mx-auto">
                      <SelectValue placeholder="Choose a task to track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={startTracking}
                  disabled={!selectedTask}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Tasks assigned to you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSession ? 'Active' : 'Idle'}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSession ? 'Time tracking in progress' : 'Ready to start tracking'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSession ? formatDuration(activeSession.start_time) : '00:00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current session duration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      {!activeSession && tasks.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Tasks Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You don't have any tasks assigned yet. Please contact your manager to get tasks assigned to you.
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/projects'}
            >
              View Projects
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeTimeTracker; 