import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Play, Square, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function TimeTrackerPage() {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [todayTime, setTodayTime] = useState(0);
  const { userDetails } = useAuth();
  const { toast } = useToast();

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTracking && currentSession) {
      interval = setInterval(() => {
        const startTime = new Date(currentSession.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(now - startTime);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, currentSession]);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    loadActiveSession();
    calculateTodayTime();
  }, [userDetails]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load tasks with projects
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          id,
          name,
          user_id,
          projects(id, name)
        `);
      
      // For admins and managers, show all tasks
      // For employees, show only their tasks
      if (userDetails?.role === 'employee') {
        tasksQuery = tasksQuery.eq('user_id', userDetails.id);
      }
      
      const { data: tasksData, error: tasksError } = await tasksQuery.order('name');
      
      if (tasksError) {
        console.error('Tasks query error:', tasksError);
        throw tasksError;
      }
      
      console.log('Loaded tasks:', tasksData);
      console.log('User role:', userDetails?.role);
      console.log('User ID:', userDetails?.id);
      
      setTasks(tasksData || []);
      
      // If no tasks found, show a helpful message
      if (!tasksData || tasksData.length === 0) {
        toast({
          title: "No tasks available",
          description: userDetails?.role === 'admin' 
            ? "No tasks exist in the system. Create some tasks first in Projects > Tasks Management." 
            : "No tasks assigned to you. Contact your admin to assign tasks.",
          variant: "default",
        });
      }
      
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSession = async () => {
    if (!userDetails) return;
    
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setCurrentSession(data);
        setIsTracking(true);
        setSelectedTask(data.task_id);
        
        // Calculate elapsed time
        const startTime = new Date(data.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(now - startTime);
      }
    } catch (error: any) {
      console.error('Error loading active session:', error);
    }
  };

  const calculateTodayTime = async () => {
    if (!userDetails) return;
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('time_logs')
        .select('start_time, end_time')
        .eq('user_id', userDetails.id)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString());
      
      if (error) throw error;
      
      let totalMs = 0;
      data?.forEach(log => {
        const start = new Date(log.start_time).getTime();
        const end = log.end_time ? new Date(log.end_time).getTime() : new Date().getTime();
        totalMs += (end - start);
      });
      
      setTodayTime(totalMs);
    } catch (error: any) {
      console.error('Error calculating today time:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedTask || !userDetails) {
      toast({
        title: "Please select a task",
        description: "You need to select a task before starting time tracking.",
        variant: "destructive",
      });
      return;
    }

    try {
      const startTime = new Date().toISOString();

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userDetails.id,
          task_id: selectedTask,
          start_time: startTime
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setIsTracking(true);
      setElapsedTime(0);

      // Notify Electron process
      if (window.electron) {
        window.electron.setUserId(userDetails.id);
        window.electron.setTaskId(selectedTask);
        window.electron.startTracking();
      }

      toast({
        title: "Time tracking started",
        description: `Started tracking time for ${getSelectedTaskName()}`,
      });
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      toast({
        title: "Error starting tracking",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const stopTracking = async () => {
    if (!currentSession || !userDetails) return;

    try {
      const endTime = new Date().toISOString();

      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: endTime })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      setIsTracking(false);
      setElapsedTime(0);
      setSelectedTask('');

      // Notify Electron process
      if (window.electron) {
        window.electron.stopTracking();
      }

      await calculateTodayTime(); // Refresh today's total

      toast({
        title: "Time tracking stopped",
        description: "Time has been logged successfully",
      });
    } catch (error: any) {
      console.error('Error stopping tracking:', error);
      toast({
        title: "Error stopping tracking",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSelectedTaskName = () => {
    const task = tasks.find(t => t.id === selectedTask);
    return task ? `${task.projects?.name || 'No Project'} - ${task.name}` : '';
  };

  // Test functions for development
  const startTestMode = () => {
    if (window.electron) {
      console.log('🧪 Starting test mode...');
      window.electron.send('start-test-mode');
      toast({
        title: "Test Mode Started",
        description: "Activity monitoring started in test mode. Check console logs for screenshot capture.",
        variant: "default",
      });
    } else {
      console.log('❌ electron not available');
      toast({
        title: "Error",
        description: "Electron API not available. This only works in the desktop app.",
        variant: "destructive",
      });
    }
  };

  const triggerTestCapture = () => {
    if (window.electron) {
      console.log('🧪 Triggering test capture...');
      window.electron.send('trigger-activity-capture');
      toast({
        title: "Test Capture Triggered",
        description: "Manual screenshot capture triggered. Check console logs.",
        variant: "default",
      });
    } else {
      console.log('❌ electron not available');
      toast({
        title: "Error",
        description: "Electron API not available. This only works in the desktop app.",
        variant: "destructive",
      });
    }
  };

  const triggerDirectTest = async () => {
    if (window.electron && window.electron.invoke) {
      console.log('🧪 Triggering direct screenshot test...');
      try {
        const result = await window.electron.invoke('trigger-direct-screenshot');
        toast({
          title: result ? "Direct Screenshot Success" : "Direct Screenshot Failed",
          description: result 
            ? "Screenshot captured successfully! Check console for details." 
            : "Screenshot capture failed. Check console for error details.",
          variant: result ? "default" : "destructive",
        });
      } catch (error) {
        console.error('Direct screenshot test error:', error);
        toast({
          title: "Test Error",
          description: "Failed to run direct screenshot test. Check console.",
          variant: "destructive",
        });
      }
    } else {
      console.log('❌ electron.invoke not available');
      toast({
        title: "Error",
        description: "Electron API not available. This only works in the desktop app.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-6">
        <PageHeader
          title="Time Tracker"
          subtitle="Track time spent on tasks and projects"
        />
        <div className="mt-6 text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="Time Tracker"
        subtitle="Track time spent on tasks and projects"
      />

      <div className="mt-6 space-y-6">
        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Summary - {format(new Date(), 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatTime(todayTime)}</div>
                <div className="text-sm text-muted-foreground">Total Time Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  <Badge variant={isTracking ? "default" : "secondary"}>
                    {isTracking ? "Tracking" : "Not Tracking"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Current Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {format(new Date(), 'EEEE')}
                </div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isTracking ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Task</label>
                  <Select value={selectedTask} onValueChange={setSelectedTask}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a task to track time for..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.projects?.name || 'No Project'} - {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={startTracking} 
                  disabled={!selectedTask}
                  className="w-full"
                  size="lg"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Tracking
                </Button>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-mono font-bold text-primary">
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tracking: {getSelectedTaskName()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Started: {currentSession ? format(new Date(currentSession.start_time), 'h:mm a') : ''}
                  </div>
                </div>
                <Button 
                  onClick={stopTracking} 
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Tracking
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Test Mode (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">🧪 Test Mode (Development Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  onClick={startTestMode} 
                  variant="outline"
                  className="w-full"
                >
                  Start Activity Monitoring Test
                </Button>
                <Button 
                  onClick={triggerTestCapture} 
                  variant="outline"
                  className="w-full"
                >
                  Trigger Test Screenshot
                </Button>
                <Button 
                  onClick={triggerDirectTest} 
                  variant="outline"
                  className="w-full"
                >
                  Direct Screenshot Test
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                ⚠️ These buttons test the activity monitoring and screenshot functionality. 
                Check the console logs and dev tools for debug information.
              </div>
            </CardContent>
          </Card>
        )}

        {tasks.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <div className="text-muted-foreground">
                {userDetails?.role === 'admin' ? (
                  <>
                    <p>No tasks available in the system.</p>
                    <p className="mt-2">Create some projects and tasks first to start tracking time.</p>
                  </>
                ) : (
                  <>
                    <p>No tasks assigned to you.</p>
                    <p className="mt-2">Contact your admin to assign tasks for time tracking.</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 