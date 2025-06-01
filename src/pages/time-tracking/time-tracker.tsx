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
}

export default function TimeTrackerPage() {
  const { userDetails } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate if tracking is active based on active logs (no separate state)
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

      setProjects(data || []);
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
        .select('*')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching active logs:', error);
        return;
      }

      setActiveLogs(data || []);
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
        .select('*')
        .eq('user_id', userDetails.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent logs:', error);
        return;
      }

      // Calculate duration for recent logs
      const logsWithDuration = (data || []).map((log) => ({
        ...log,
        duration: log.end_time
          ? differenceInMinutes(new Date(log.end_time), new Date(log.start_time))
          : 0,
      }));

      setRecentLogs(logsWithDuration);
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
          start_time: new Date().toISOString()
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

      fetchActiveLogs();
      fetchRecentLogs();
      toast({
        title: 'Time tracking started',
        description: `Tracking time for project ${selectedProjectId}.`,
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
    if (!userDetails?.id) return;
    
    try {
      const { data: activeLog } = await supabase
        .from('time_logs')
        .select('id')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .single();

      if (!activeLog) {
        toast({
          title: 'No active session',
          description: 'No active tracking session found.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('time_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('id', activeLog.id);

      if (error) {
        console.error('Error stopping time tracking:', error);
        toast({
          title: 'Error stopping time tracking',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      fetchActiveLogs();
      fetchRecentLogs();
      toast({
        title: 'Time tracking stopped',
        description: 'Time tracking has been stopped.',
      });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      toast({
        title: 'Error stopping time tracking',
        description: 'Failed to stop time tracking.',
        variant: 'destructive',
      });
    }
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
              <SelectTrigger className="w-[100%]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
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
            activeLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Project ID: {log.project_id}</p>
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
              <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="text-sm font-medium">Project ID: {log.project_id}</p>
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
