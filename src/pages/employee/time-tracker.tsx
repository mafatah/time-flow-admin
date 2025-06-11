
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { ProjectSelector } from '@/components/tracking/project-selector';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { Clock, Play, Square, Calendar, RefreshCw } from 'lucide-react';

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  project_id: string | null;
  duration: number;
}

interface Project {
  id: string;
  name: string;
}

export default function EmployeeTimeTracker() {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [activeSessions, setActiveSessions] = useState<TimeLog[]>([]);
  const [recentSessions, setRecentSessions] = useState<TimeLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userDetails?.id) {
      fetchActiveSessions();
      fetchRecentSessions();
      fetchProjects();
    }
  }, [userDetails?.id]);

  const fetchActiveSessions = async () => {
    if (!userDetails?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .is('end_time', null);

      if (error) {
        console.error('Error fetching active sessions:', error);
        toast({
          title: 'Error fetching active sessions',
          description: error.message,
          variant: 'destructive',
        });
      }

      // Map to TimeLog interface
      const mappedSessions: TimeLog[] = (data || []).map((log: any) => ({
        id: log.id,
        start_time: log.start_time,
        end_time: log.end_time,
        project_id: log.project_id,
        duration: differenceInMinutes(new Date(), new Date(log.start_time))
      }));

      setActiveSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast({
        title: 'Error fetching active sessions',
        description: 'Failed to fetch active sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    if (!userDetails?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userDetails.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent sessions:', error);
        toast({
          title: 'Error fetching recent sessions',
          description: error.message,
          variant: 'destructive',
        });
      }

      const recentLogs: TimeLog[] = (data || []).map((log: any) => ({
        id: log.id,
        start_time: log.start_time,
        end_time: log.end_time,
        project_id: log.project_id,
        duration: log.end_time 
          ? differenceInMinutes(new Date(log.end_time), new Date(log.start_time))
          : differenceInMinutes(new Date(), new Date(log.start_time))
      }));

      setRecentSessions(recentLogs);
    } catch (error) {
      console.error('Error fetching recent sessions:', error);
      toast({
        title: 'Error fetching recent sessions',
        description: 'Failed to fetch recent sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!userDetails?.id) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employee_project_assignments')
        .select(`
          project_id,
          projects (
            id,
            name
          )
        `)
        .eq('user_id', userDetails.id);

      if (error) {
        console.error('Error fetching assigned projects:', error);
        toast({
          title: 'Error fetching projects',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Extract projects from the assignment data
      const assignedProjects = (data || [])
        .map((assignment: any) => assignment.projects)
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setProjects(assignedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error fetching projects',
        description: 'Failed to fetch assigned projects',
        variant: 'destructive',
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchActiveSessions(),
      fetchRecentSessions(),
      fetchProjects()
    ]);
    setLoading(false);
    toast({
      title: 'Data refreshed',
      description: 'Projects and sessions have been updated',
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Time Tracking</CardTitle>
              <CardDescription>
                Track your work sessions and manage your time effectively.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProjectSelector />

          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Currently running time tracking sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading active sessions...</p>
              ) : activeSessions.length === 0 ? (
                <p>No active sessions.</p>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Started at {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {log.project_id && (
                          <p className="text-sm">
                            Project ID: {log.project_id}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {differenceInHours(new Date(), new Date(log.start_time))} hours
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 shadow-md">
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>
                Your most recent time tracking sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading recent sessions...</p>
              ) : recentSessions.length === 0 ? (
                <p>No recent sessions.</p>
              ) : (
                <div className="space-y-4">
                  {recentSessions.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.start_time), 'MMM dd, yyyy HH:mm')} -{' '}
                          {log.end_time ? format(new Date(log.end_time), 'MMM dd, yyyy HH:mm') : 'Active'}
                        </p>
                        {log.project_id && (
                          <p className="text-sm">
                            Project ID: {log.project_id}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {log.duration} minutes
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
