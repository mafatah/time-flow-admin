
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Play, Square, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function TimeTracker() {
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
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
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('name');
      
      if (projectsError) {
        console.error('Projects query error:', projectsError);
        throw projectsError;
      }
      
      console.log('Loaded projects:', projectsData);
      console.log('User role:', userDetails?.role);
      console.log('User ID:', userDetails?.id);
      
      setProjects(projectsData || []);
      
      // If no projects found, show a helpful message
      if (!projectsData || projectsData.length === 0) {
        toast({
          title: "No projects available",
          description: "Contact your administrator to create projects for time tracking.",
          variant: "default",
        });
      }
      
    } catch (error: any) {
      console.error('Error loading projects:', error);
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
    if (!userDetails?.id) return;
    
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
        setSelectedProject(data.project_id);
        
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
    if (!selectedProject || !userDetails?.id) {
      toast({
        title: "Please select a project",
        description: "You need to select a project before starting time tracking.",
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
          project_id: selectedProject,
          start_time: startTime
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      setIsTracking(true);
      setElapsedTime(0);

      // Notify Electron process if available
      if (window.electron) {
        window.electron.setUserId(userDetails.id);
        window.electron.setTaskId(selectedProject);
        window.electron.startTracking();
      }

      toast({
        title: "Time tracking started",
        description: "Successfully started tracking time for the selected project.",
      });
    } catch (error: any) {
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

      // Notify Electron process if available
      if (window.electron) {
        window.electron.stopTracking();
      }

      // Recalculate today's time
      await calculateTodayTime();

      toast({
        title: "Time tracking stopped",
        description: "Successfully stopped time tracking and saved the session.",
      });
    } catch (error: any) {
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

  const getSelectedProjectName = () => {
    const project = projects.find(p => p.id === selectedProject);
    return project ? project.name : 'No project selected';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading time tracking...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Session Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Project</label>
            <Select
              value={selectedProject}
              onValueChange={setSelectedProject}
              disabled={isTracking}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project to track" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timer Display */}
          <div className="text-center py-8">
            <div className="text-6xl font-mono font-bold text-primary mb-4">
              {formatTime(elapsedTime)}
            </div>
            {isTracking && (
              <div className="text-sm text-muted-foreground mb-4">
                Tracking: {getSelectedProjectName()}
              </div>
            )}
            <div className="flex justify-center gap-3">
              {!isTracking ? (
                <Button
                  onClick={startTracking}
                  disabled={!selectedProject}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  Start Tracking
                </Button>
              ) : (
                <Button
                  onClick={stopTracking}
                  variant="destructive"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Square className="h-5 w-5" />
                  Stop Tracking
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {formatTime(todayTime)}
              </div>
              <div className="text-sm text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isTracking ? (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    Tracking
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Idle
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {format(new Date(), 'MMM d')}
              </div>
              <div className="text-sm text-muted-foreground">Date</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
