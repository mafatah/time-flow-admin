
import React, { useState, useEffect } from 'react';
import { useTracker } from '@/providers/tracker-provider';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';

export function TaskSelector() {
  const { isTracking, currentTaskId, startTracking, stopTracking } = useTracker();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(currentTaskId);

  // Fetch user's tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['userTasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('id, name, project_id, projects(name)')
        .eq('user_id', user.id);
        
      if (error) {
        toast({
          title: 'Error fetching tasks',
          description: error.message,
          variant: 'destructive',
        });
        return [];
      }
      
      return data;
    },
    enabled: !!user,
  });
  
  // Update selected task when currentTaskId changes (from the tracker)
  useEffect(() => {
    setSelectedTaskId(currentTaskId);
  }, [currentTaskId]);
  
  const handleStartTracking = () => {
    if (!selectedTaskId) {
      toast({
        title: 'Please select a task',
        description: 'You must select a task before starting tracking',
        variant: 'destructive',
      });
      return;
    }
    
    startTracking(selectedTaskId);
    toast({
      title: 'Tracking started',
      description: 'Your activity is now being tracked',
    });
  };
  
  const handleStopTracking = () => {
    stopTracking();
    toast({
      title: 'Tracking stopped',
      description: 'Your activity is no longer being tracked',
    });
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Activity Tracking</h3>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-2/3">
            <Select
              value={selectedTaskId || ""}
              onValueChange={(value) => setSelectedTaskId(value)}
              disabled={isTracking}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasksLoading ? (
                  <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                ) : tasks && tasks.length > 0 ? (
                  tasks.map((task: any) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name} ({task.projects?.name})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-tasks" disabled>No tasks available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-1/3">
            {isTracking ? (
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleStopTracking}
              >
                Stop Tracking
              </Button>
            ) : (
              <Button 
                variant="default" 
                className="w-full" 
                onClick={handleStartTracking}
                disabled={!selectedTaskId}
              >
                Start Tracking
              </Button>
            )}
          </div>
        </div>
        
        {isTracking && (
          <div className="text-sm text-green-600 flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-600 mr-2 animate-pulse"></div>
            Currently tracking activity
          </div>
        )}
      </div>
    </div>
  );
}
