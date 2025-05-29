import React, { useState, useEffect } from 'react';
import { useTracker } from '@/providers/tracker-provider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Project {
  id: string;
  name: string;
  description?: string;
}

export function ProjectSelector() {
  const { isTracking, currentProjectId, startTracking, stopTracking, canTrack } = useTracker();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(currentProjectId);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('name');
        
      if (error) {
        toast({
          title: 'Error fetching projects',
          description: error.message,
          variant: 'destructive',
        });
        return [];
      }
      
      return data as Project[];
    },
    enabled: !!user,
  });
  
  // Update selected project when currentProjectId changes
  useEffect(() => {
    setSelectedProjectId(currentProjectId);
  }, [currentProjectId]);
  
  const handleStartTracking = () => {
    if (!selectedProjectId) {
      toast({
        title: 'Please select a project',
        description: 'You must select a project before starting tracking',
        variant: 'destructive',
      });
      return;
    }
    
    startTracking(selectedProjectId);
  };
  
  const handleStopTracking = () => {
    stopTracking();
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-4">Activity Tracking</h3>
      
      <div className="space-y-4">
        {!canTrack && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 mb-4">
            <p className="font-medium">Desktop Application Required</p>
            <p className="text-sm mt-1">Time tracking is only available in the desktop application.</p>
            <Button variant="outline" className="mt-2" size="sm">
              <Download className="mr-1 h-4 w-4" /> Download Desktop App
            </Button>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-2/3">
            <Select
              value={selectedProjectId || ""}
              onValueChange={(value) => setSelectedProjectId(value)}
              disabled={isTracking || !canTrack}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading ? (
                  <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                ) : projects && projects.length > 0 ? (
                  projects.map((project: Project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-projects" disabled>No projects available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-1/3">
            {isTracking ? (
              <Button
                onClick={handleStopTracking}
                variant="destructive"
                className="w-full"
                disabled={!canTrack}
              >
                Stop Tracking
              </Button>
            ) : (
              <Button
                onClick={handleStartTracking}
                className="w-full"
                disabled={!selectedProjectId || !canTrack}
              >
                Start Tracking
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
