import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TimeLog } from '@/types/timeLog';

interface Project {
  id: string;
  name: string;
}

export default function EmployeeTimeTracker() {
  const { userDetails } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimeLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<TimeLog[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchProjects();
    fetchRecentLogs();
    checkActiveSession();
  }, [userDetails?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && currentSession) {
      interval = setInterval(() => {
        const start = new Date(currentSession.start_time).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, currentSession]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to fetch projects');
    }
  };

  const fetchRecentLogs = async () => {
    if (!userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          *,
          projects(name)
        `)
        .eq('user_id', userDetails.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const logsWithProjectNames: TimeLog[] = data?.map(log => ({
        ...log,
        project_name: log.projects?.name || 'No Project'
      })) || [];
      
      setRecentLogs(logsWithProjectNames);
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    }
  };

  const checkActiveSession = async () => {
    if (!userDetails?.id) return;

    try {
      // Use a more specific query to avoid RLS issues
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking active session:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const session = data[0] as TimeLog;
        setCurrentSession(session);
        setIsTracking(true);
        setSelectedProjectId(session.project_id || '');
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedProjectId || !userDetails?.id) {
      toast.error('Please select a project first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userDetails.id,
          project_id: selectedProjectId,
          start_time: new Date().toISOString(),
          is_idle: false
        })
        .select()
        .single();

      if (error) throw error;
      
      const session = data as TimeLog;
      setCurrentSession(session);
      setIsTracking(true);
      setElapsedTime(0);
      toast.success('Time tracking started');
      fetchRecentLogs();
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Failed to start tracking');
    }
  };

  const stopTracking = async () => {
    if (!currentSession) return;

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('id', currentSession.id);

      if (error) throw error;
      
      setCurrentSession(null);
      setIsTracking(false);
      setElapsedTime(0);
      toast.success('Time tracking stopped');
      fetchRecentLogs();
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast.error('Failed to stop tracking');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (startTime: string, endTime?: string | null) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : new Date().getTime();
    const durationSeconds = Math.floor((end - start) / 1000);
    return formatTime(durationSeconds);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Time Tracker</h1>

      <Card>
        <CardHeader>
          <CardTitle>Current Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Select 
              value={selectedProjectId} 
              onValueChange={setSelectedProjectId}
              disabled={isTracking}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!isTracking ? (
              <Button onClick={startTracking} className="flex items-center space-x-2">
                <Play className="h-4 w-4" />
                <span>Start</span>
              </Button>
            ) : (
              <Button onClick={stopTracking} variant="destructive" className="flex items-center space-x-2">
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </Button>
            )}
          </div>

          {isTracking && (
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-mono font-bold text-green-600">
                {formatTime(elapsedTime)}
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Tracking active</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentLogs.length === 0 ? (
              <p className="text-gray-500">No time logs found</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{log.project_name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(log.start_time).toLocaleDateString()} at{' '}
                      {new Date(log.start_time).toLocaleTimeString()}
                      {log.end_time && (
                        <span> - {new Date(log.end_time).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">
                      {formatDuration(log.start_time, log.end_time)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {log.end_time ? 'Completed' : 'Active'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
