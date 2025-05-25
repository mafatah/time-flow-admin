import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  Timer, 
  Activity,
  Coffee,
  Target
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface ProjectTask {
  id: string;
  name: string;
  project_id: string;
  project: Project;
}

interface ActiveSession {
  id: string;
  task_id: string;
  start_time: string;
  is_idle: boolean;
  task: ProjectTask;
}

const EmployeeTimeTracker = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (userDetails?.id) {
      fetchProjectsAndTasks();
      checkActiveSession();
      
      // Update current time every second
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [userDetails?.id]);

  const fetchProjectsAndTasks = async () => {
    try {
      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('name');

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }
      
      console.log('Fetched projects:', projectsData);
      setProjects(projectsData || []);
      
      if (!projectsData || projectsData.length === 0) {
        toast({
          title: 'No projects available',
          description: 'Contact your administrator to create projects for time tracking.',
          variant: 'default'
        });
        setLoading(false);
        return;
      }

      // For each project, ensure there's a task for the current user
      if (projectsData && userDetails?.id) {
        const tasksToCreate = [];
        const existingTasks = [];

        for (const project of projectsData) {
          // Check if task exists for this project and user
          const { data: existingTask } = await supabase
            .from('tasks')
            .select('id, name, project_id')
            .eq('project_id', project.id)
            .eq('user_id', userDetails.id)
            .single();

          if (existingTask) {
            existingTasks.push({
              ...existingTask,
              project: project
            });
          } else {
            // Create task for this project
            tasksToCreate.push({
              name: `Work on ${project.name}`,
              project_id: project.id,
              user_id: userDetails.id
            });
          }
        }

        // Create missing tasks
        if (tasksToCreate.length > 0) {
          const { data: newTasks, error: createError } = await supabase
            .from('tasks')
            .insert(tasksToCreate)
            .select('id, name, project_id');

          if (createError) {
            console.error('Error creating tasks:', createError);
          } else if (newTasks) {
            // Add project info to new tasks
            for (const task of newTasks) {
              const project = projectsData.find(p => p.id === task.project_id);
              if (project) {
                existingTasks.push({
                  ...task,
                  project: project
                });
              }
            }
          }
        }

        setProjectTasks(existingTasks);
        
        if (existingTasks.length > 0 && !selectedProject) {
          setSelectedProject(existingTasks[0].project_id);
        }
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error loading projects',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    if (!userDetails?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, task_id, start_time, is_idle')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        // Get task and project details
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, name, project_id')
          .eq('id', data.task_id)
          .single();

        if (taskData) {
          const { data: projectData } = await supabase
            .from('projects')
            .select('id, name, description')
            .eq('id', taskData.project_id)
            .single();

          if (projectData) {
            setActiveSession({
              ...data,
              task: {
                ...taskData,
                project: projectData
              }
            });
            setSelectedProject(taskData.project_id);
          }
        }
      }
    } catch (error) {
      // No active session found, which is fine
      setActiveSession(null);
    }
  };

  const startTracking = async () => {
    if (!selectedProject || !userDetails?.id) return;

    try {
      // Find the task for this project
      const projectTask = projectTasks.find(pt => pt.project_id === selectedProject);
      if (!projectTask) {
        toast({
          title: 'Error',
          description: 'No task found for selected project',
          variant: 'destructive'
        });
        return;
      }

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userDetails.id,
          task_id: projectTask.id,
          start_time: new Date().toISOString(),
          is_idle: false
        })
        .select('id, task_id, start_time, is_idle')
        .single();

      if (error) throw error;

      setActiveSession({
        ...data,
        task: projectTask
      });
      
      toast({
        title: 'Time tracking started',
        description: `Started tracking time for ${projectTask.project.name}`,
      });
    } catch (error: any) {
      console.error('Error starting tracking:', error);
      toast({
        title: 'Error starting tracking',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const stopTracking = async () => {
    if (!activeSession) return;

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      const duration = differenceInMinutes(new Date(), new Date(activeSession.start_time));
      
      setActiveSession(null);
      toast({
        title: 'Time tracking stopped',
        description: `Tracked ${Math.floor(duration / 60)}h ${duration % 60}m for ${activeSession.task.project.name}`,
      });
    } catch (error: any) {
      console.error('Error stopping tracking:', error);
      toast({
        title: 'Error stopping tracking',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = currentTime;
    const totalMinutes = differenceInMinutes(now, start);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Tracker</h1>
          <p className="text-gray-600">Track your work time efficiently</p>
        </div>
        <div className="flex items-center space-x-2">
          {activeSession ? (
            <Badge variant="default" className="bg-green-500">
              <Clock className="w-4 h-4 mr-1" />
              Tracking Active
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Timer className="w-4 h-4 mr-1" />
              Not Tracking
            </Badge>
          )}
        </div>
      </div>

      {/* Active Session Card */}
      {activeSession && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Play className="w-5 h-5 mr-2" />
              Currently Tracking
            </CardTitle>
            <CardDescription>
              {activeSession.task.project.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Started at</p>
                <p className="font-medium">{format(new Date(activeSession.start_time), 'HH:mm')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatDuration(activeSession.start_time)}
                </p>
              </div>
              <Button 
                onClick={stopTracking}
                variant="destructive"
                className="flex items-center"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Tracking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Tracking Card */}
      {!activeSession && (
        <Card>
          <CardHeader>
            <CardTitle>Start Time Tracking</CardTitle>
            <CardDescription>
              Select a project and start tracking your time
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Project
              </label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-gray-500">{project.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={startTracking}
              disabled={!selectedProject}
              className="w-full flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Tracking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Available Projects</CardTitle>
          <CardDescription>
            Projects created by administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <Timer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No projects available</p>
              <p className="text-sm text-gray-400">Contact your administrator to create projects</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="text-sm">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={selectedProject === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProject(project.id)}
                      className="w-full"
                    >
                      {selectedProject === project.id ? "Selected" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeTimeTracker; 