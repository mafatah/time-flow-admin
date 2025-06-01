import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInMinutes } from 'date-fns';
import { Play, Square, Clock } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  project_id: string | null;
  projects?: {
    name: string;
  } | null;
}

export default function TimeTrackerPage() {
  const { userDetails } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate if tracking is active based on active logs
  const hasActiveSession = activeLogs.length > 0;

  useEffect(() => {
    if (userDetails?.id) {
      fetchProjects();
      fetchActiveLogs();
      fetchRecentLogs();
    }
  }, [userDetails]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error fetching projects',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data && Array.isArray(data)) {
        setProjects(data);
        
        // Auto-select default project if none selected
        if (!selectedProjectId && data.length > 0) {
          const defaultProject = data.find(p => p.name === 'Default Project') || data[0];
          setSelectedProjectId(defaultProject.id);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error fetching projects',
        description: 'Failed to fetch projects.',
        variant: 'destructive',
      });
    }
  };

  const fetchActiveLogs = async () => {
    if (!userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          *,
          projects(name)
        `)
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching active logs:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        setActiveLogs(data);
      }
    } catch (error) {
      console.error('Error fetching active logs:', error);
    } finally {
      setLoading(false);
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
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent logs:', error);
        return;
      }

      if (data && Array.isArray(data)) {
        // Calculate duration for recent logs
        const logsWithDuration = data.map((log) => ({
          ...log,
          duration: log.end_time
            ? differenceInMinutes(new Date(log.end_time), new Date(log.start_time))
            : 0,
        }));

        setRecentLogs(logsWithDuration);
      }
    } catch (error) {
      console.error('Error fetching recent logs:', error);
    }
  };

  const startTracking = async () => {
    if (!selectedProjectId) {
      toast({
        title: 'Select a project',
        description: 'Please select a project to start tracking.',
        variant: 'destructive',
      });
      return;
    }

    if (!userDetails?.id) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to start tracking.',
        variant: 'destructive',
      });
      return;
    }

    // Check if there's already an active session
    if (hasActiveSession) {
      toast({
        title: 'Session already active',
        description: 'Please stop the current session before starting a new one.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert({ 
          user_id: userDetails.id, 
          project_id: selectedProjectId,
          start_time: new Date().toISOString(),
          status: 'active',
          is_idle: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error starting time tracking:', error);
        toast({
          title: 'Error starting time tracking',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      await Promise.all([fetchActiveLogs(), fetchRecentLogs()]);
      
      const projectName = projects.find(p => p.id === selectedProjectId)?.name || 'selected project';
      toast({
        title: 'Time tracking started',
        description: `Started tracking time for ${projectName}.`,
      });
    } catch (error) {
      console.error('Error starting time tracking:', error);
      toast({
        title: 'Error starting time tracking',
        description: 'Failed to start time tracking.',
        variant: 'destructive',
      });
    }
  };

  const stopTracking = async () => {
    if (!userDetails?.id) {
      toast({
        title: 'User not found',
        description: 'Please ensure you are logged in properly.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Get the most recent active session for this user
      const { data: activeLogs, error: fetchError } = await supabase
        .from('time_logs')
        .select('id, start_time, project_id, projects(name)')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching active sessions:', fetchError);
        toast({
          title: 'Error fetching active sessions',
          description: fetchError.message,
          variant: 'destructive',
        });
        return;
      }

      if (!activeLogs || activeLogs.length === 0) {
        toast({
          title: 'No active session',
          description: 'No active tracking session found for your account.',
          variant: 'destructive',
        });
        return;
      }

      const activeLog = activeLogs[0];

      // Update the session with end time
      const { error: updateError } = await supabase
        .from('time_logs')
        .update({ 
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', activeLog.id)
        .eq('user_id', userDetails.id);

      if (updateError) {
        console.error('Error stopping time tracking:', updateError);
        toast({
          title: 'Error stopping time tracking',
          description: updateError.message,
          variant: 'destructive',
        });
        return;
      }

      // Refresh the data
      await Promise.all([fetchActiveLogs(), fetchRecentLogs()]);
      
      const projectName = activeLog.projects?.name || 'project';
      toast({
        title: 'Time tracking stopped',
        description: `Successfully stopped tracking session for ${projectName}.`,
      });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      toast({
        title: 'Error stopping time tracking',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getProjectDisplay = (log: TimeLog) => {
    if (log.projects) {
      return log.projects.name;
    }
    const project = projects.find(p => p.id === log.project_id);
    return project?.name || 'Unknown Project';
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Time Tracker</CardTitle>
          <CardDescription>Track your work time efficiently.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select onValueChange={(value) => setSelectedProjectId(value)} value={selectedProjectId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            {hasActiveSession ? (
              <Button variant="destructive" className="w-full" onClick={stopTracking}>
                <Square className="mr-2 h-4 w-4" /> Stop Tracking
              </Button>
            ) : (
              <Button className="w-full" onClick={startTracking} disabled={!selectedProjectId || loading}>
                <Play className="mr-2 h-4 w-4" /> Start Tracking
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Session</CardTitle>
          <CardDescription>Current time tracking session.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading active sessions...</p>
          ) : activeLogs.length > 0 ? (
            activeLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{getProjectDisplay(log)}</p>
                  <p className="text-xs text-muted-foreground">
                    Started at: {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <Badge variant="secondary">
                    <Clock className="mr-2 h-4 w-4" />
                    {differenceInMinutes(new Date(), new Date(log.start_time))} minutes
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No active tracking session found.</p>
              <p className="text-xs text-muted-foreground mt-1">Start tracking to see your active session here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Your recent time tracking sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded mb-2 last:mb-0">
                <div>
                  <p className="text-sm font-medium">{getProjectDisplay(log)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')} -{' '}
                    {log.end_time ? format(new Date(log.end_time), 'HH:mm') : 'Active'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">
                    <Clock className="mr-2 h-4 w-4" />
                    {log.duration} minutes
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No recent sessions found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
