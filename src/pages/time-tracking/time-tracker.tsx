import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInMinutes } from 'date-fns';
import { Play, Square, Clock, Calendar } from 'lucide-react';

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
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<
    { id: string; start_time: string; end_time: string | null; project_id: string | null; duration: number }[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

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
        description: 'Failed to load projects.',
        variant: 'destructive',
      });
    }
  };

  const fetchActiveLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time, project_id')
        .eq('user_id', userDetails?.id)
        .is('end_time', null);

      if (error) {
        console.error('Error fetching active time logs:', error);
        toast({
          title: 'Error fetching active time logs',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      setActiveLogs(data || []);
      setIsTracking(data && data.length > 0);
      if (data && data.length > 0) {
        setSelectedProjectId(data[0].project_id);
      }
    } catch (error) {
      console.error('Error fetching active time logs:', error);
      toast({
        title: 'Error fetching active time logs',
        description: 'Failed to load active time logs.',
        variant: 'destructive',
      });
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, start_time, end_time, project_id')
        .eq('user_id', userDetails?.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent time logs:', error);
        toast({
          title: 'Error fetching recent time logs',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      const recentLogs = data?.map((log: any) => ({
        id: log.id,
        start_time: log.start_time,
        end_time: log.end_time,
        project_id: log.project_id,
        duration: log.end_time 
          ? differenceInMinutes(new Date(log.end_time), new Date(log.start_time))
          : differenceInMinutes(new Date(), new Date(log.start_time))
      })) || [];

      setRecentLogs(recentLogs);
    } catch (error) {
      console.error('Error fetching recent time logs:', error);
      toast({
        title: 'Error fetching recent time logs',
        description: 'Failed to load recent time logs.',
        variant: 'destructive',
      });
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

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .insert([{ user_id: userDetails?.id, project_id: selectedProjectId }])
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
      setIsTracking(true);
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
    try {
      const { data: activeLog } = await supabase
        .from('time_logs')
        .select('id')
        .eq('user_id', userDetails?.id)
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
      setIsTracking(false);
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
            {isTracking ? (
              <Button variant="destructive" className="w-full" onClick={stopTracking}>
                <Square className="mr-2 h-4 w-4" /> Stop Tracking
              </Button>
            ) : (
              <Button className="w-full" onClick={startTracking} disabled={!selectedProjectId}>
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
          {activeLogs.length > 0 ? (
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
            <p className="text-sm text-muted-foreground">No active session.</p>
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
            <p className="text-sm text-muted-foreground">No recent sessions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
