
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface TimeLog {
  id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  is_idle: boolean;
}

export default function TimeTracker() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<TimeLog | null>(null);
  const [recentSessions, setRecentSessions] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

  useEffect(() => {
    fetchProjects();
    fetchRecentSessions();
    checkActiveSession();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentSession) {
      interval = setInterval(() => {
        const start = new Date(currentSession.start_time);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentSession]);

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

  const fetchRecentSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSessions(data || []);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
    }
  };

  const checkActiveSession = async () => {
    try {
      const { data: session, error } = await supabase
        .from('time_logs')
        .select('*')
        .is('end_time', null)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (session) {
        setCurrentSession(session);
        setSelectedProject(session.project_id);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    setLoading(true);
    try {
      // Check if there's already an active session
      const { data: existingSession } = await supabase
        .from('time_logs')
        .select('*')
        .is('end_time', null)
        .single();

      if (existingSession) {
        toast.error('There is already an active tracking session');
        return;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please log in to start tracking');
        return;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: user.id,
          project_id: selectedProject,
          start_time: new Date().toISOString(),
          is_idle: false
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      toast.success('Time tracking started');
      fetchRecentSessions();
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Failed to start tracking');
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    if (!currentSession) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(null);
      setElapsedTime('00:00:00');
      toast.success('Time tracking stopped');
      fetchRecentSessions();
    } catch (error) {
      console.error('Error stopping tracking:', error);
      toast.error('Failed to stop tracking');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (start: string, end: string | null): string => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getProjectName = (projectId: string): string => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Time Tracker</h1>
      </div>

      {/* Current Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Current Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Select 
              value={selectedProject} 
              onValueChange={setSelectedProject}
              disabled={!!currentSession}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {currentSession ? (
              <Button 
                onClick={stopTracking} 
                disabled={loading}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <Square className="h-4 w-4" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button 
                onClick={startTracking} 
                disabled={loading || !selectedProject}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Start</span>
              </Button>
            )}
          </div>

          {currentSession && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-green-800">
                    Tracking: {getProjectName(currentSession.project_id)}
                  </div>
                  <div className="text-sm text-green-600">
                    Started at {format(new Date(currentSession.start_time), 'HH:mm:ss')}
                  </div>
                </div>
                <div className="text-2xl font-mono font-bold text-green-800">
                  {elapsedTime}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Recent Sessions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No time tracking sessions found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{getProjectName(session.project_id)}</div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(session.start_time), 'MMM d, yyyy HH:mm')}
                      {session.end_time && ` - ${format(new Date(session.end_time), 'HH:mm')}`}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {formatDuration(session.start_time, session.end_time)}
                    </span>
                    <Badge variant={session.end_time ? 'default' : 'secondary'}>
                      {session.end_time ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
