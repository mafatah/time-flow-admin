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
  Target,
  RefreshCw
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface ActiveSession {
  id: string;
  task_id: string;
  start_time: string;
  is_idle: boolean;
  project: Project;
}

const EmployeeTimeTracker = () => {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    console.log('🔄 useEffect triggered');
    console.log('📋 userDetails:', JSON.stringify(userDetails, null, 2));
    console.log('🆔 userDetails?.id:', userDetails?.id);
    console.log('📧 userDetails?.email:', userDetails?.email);
    console.log('👤 userDetails?.role:', userDetails?.role);
    
    // Also check auth state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔐 Current session:', session);
      console.log('🔐 Session error:', error);
      console.log('🔐 Session user:', session?.user);
    });
    
    if (userDetails?.id) {
      console.log('✅ User ID found, loading projects and checking session');
      loadProjects();
      checkActiveSession();
      
      // Update current time every second
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      console.log('❌ No user ID found, skipping project load');
      console.log('❌ This means user is not authenticated or userDetails not loaded');
    }
  }, [userDetails?.id]);

  const loadProjects = async () => {
    try {
      console.log('🔄 Loading projects...');
      console.log('🔗 Supabase client:', supabase);
      console.log('🌐 Making request to projects table...');
      
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('name');

      console.log('📡 Raw response from Supabase:');
      console.log('  - data:', projectsData);
      console.log('  - error:', projectsError);

      if (projectsError) {
        console.error('❌ Error fetching projects:', projectsError);
        console.error('❌ Error details:', JSON.stringify(projectsError, null, 2));
        throw projectsError;
      }
      
      console.log('✅ Fetched projects successfully');
      console.log('📊 Raw projects data:', JSON.stringify(projectsData, null, 2));
      console.log(`📊 Number of projects: ${projectsData?.length || 0}`);
      
      if (!projectsData || projectsData.length === 0) {
        console.log('⚠️ No projects found in database');
        console.log('⚠️ Setting projects state to empty array');
        setProjects([]);
        toast({
          title: 'No projects available',
          description: 'Contact your administrator to create projects for time tracking.',
          variant: 'default'
        });
      } else {
        console.log('📋 Available projects:', projectsData.map(p => `${p.name} (${p.id})`));
        console.log('📋 Setting projects state...');
        setProjects(projectsData);
        console.log('📋 Projects state set successfully');
        
        // Auto-select first project if none selected
        if (!selectedProjectId && projectsData.length > 0) {
          console.log(`🎯 Auto-selecting first project: ${projectsData[0].name} (${projectsData[0].id})`);
          setSelectedProjectId(projectsData[0].id);
          console.log(`🎯 Selected project ID set to: ${projectsData[0].id}`);
        } else {
          console.log(`🎯 Project already selected: ${selectedProjectId}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading projects:', error);
      console.error('❌ Error stack:', error.stack);
      toast({
        title: 'Error loading projects',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshProjects = async () => {
    setRefreshing(true);
    await loadProjects();
  };

  const checkActiveSession = async () => {
    if (!userDetails?.id) return;

    try {
      console.log('🔍 Checking for active session...');
      
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, task_id, start_time, is_idle')
        .eq('user_id', userDetails.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        console.log('✅ Found active session:', data);
        
        // Get task and project details separately
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
              id: data.id,
              task_id: data.task_id,
              start_time: data.start_time,
              is_idle: data.is_idle,
              project: projectData
            });
            setSelectedProjectId(taskData.project_id);
          }
        }
      } else {
        console.log('ℹ️ No active session found');
        setActiveSession(null);
      }
    } catch (error) {
      console.log('ℹ️ No active session found (expected)');
      setActiveSession(null);
    }
  };

  const findOrCreateTask = async (projectId: string): Promise<string | null> => {
    if (!userDetails?.id) return null;

    try {
      // First, try to find existing task for this project and user
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', userDetails.id)
        .single();

      if (existingTask) {
        console.log('✅ Found existing task:', existingTask.id);
        return existingTask.id;
      }

      // Create new task if none exists
      const project = projects.find(p => p.id === projectId);
      if (!project) return null;

      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          name: `Work on ${project.name}`,
          project_id: projectId,
          user_id: userDetails.id
        })
        .select('id')
        .single();

      if (createError) {
        console.error('❌ Error creating task:', createError);
        throw createError;
      }

      console.log('✅ Created new task:', newTask.id);
      return newTask.id;
    } catch (error: any) {
      console.error('❌ Error finding/creating task:', error);
      throw error;
    }
  };

  const startTracking = async () => {
    if (!selectedProjectId || !userDetails?.id) {
      toast({
        title: 'Error',
        description: 'Please select a project first',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('🚀 Starting time tracking...');
      
      // Find or create task for this project
      const taskId = await findOrCreateTask(selectedProjectId);
      if (!taskId) {
        throw new Error('Failed to create task for project');
      }

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: userDetails.id,
          task_id: taskId,
          start_time: new Date().toISOString(),
          is_idle: false
        })
        .select('id, task_id, start_time, is_idle')
        .single();

      if (error) throw error;

      const selectedProject = projects.find(p => p.id === selectedProjectId);
      if (selectedProject) {
        setActiveSession({
          ...data,
          project: selectedProject
        });
        
        console.log('✅ Time tracking started for:', selectedProject.name);
        toast({
          title: 'Time tracking started',
          description: `Started tracking time for ${selectedProject.name}`,
        });
      }
    } catch (error: any) {
      console.error('❌ Error starting tracking:', error);
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
      console.log('⏹️ Stopping time tracking...');
      
      const { error } = await supabase
        .from('time_logs')
        .update({
          end_time: new Date().toISOString()
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      const duration = differenceInMinutes(new Date(), new Date(activeSession.start_time));
      
      console.log('✅ Time tracking stopped');
      setActiveSession(null);
      toast({
        title: 'Time tracking stopped',
        description: `Tracked ${Math.floor(duration / 60)}h ${duration % 60}m for ${activeSession.project.name}`,
      });
    } catch (error: any) {
      console.error('❌ Error stopping tracking:', error);
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

  console.log('🎨 Rendering EmployeeTimeTracker');
  console.log('🎨 Current state:');
  console.log('  - loading:', loading);
  console.log('  - refreshing:', refreshing);
  console.log('  - projects.length:', projects.length);
  console.log('  - selectedProjectId:', selectedProjectId);
  console.log('  - activeSession:', activeSession);
  console.log('  - userDetails:', userDetails);

  if (loading) {
    console.log('🎨 Showing loading state');
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
          <Button
            variant="outline"
            size="sm"
            onClick={refreshProjects}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
              {activeSession.project.name}
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
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    console.log('🎨 Rendering Select options');
                    console.log('🎨 projects for Select:', projects);
                    return null;
                  })()}
                  {projects.map((project) => {
                    console.log('🎨 Rendering SelectItem for:', project);
                    return (
                    <SelectItem key={project.id} value={project.id}>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-gray-500">{project.description}</div>
                        )}
                      </div>
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={startTracking}
              disabled={!selectedProjectId}
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Available Projects</CardTitle>
              <CardDescription>
                Projects created by administrators ({projects.length} total)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshProjects}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            console.log('🎨 Rendering projects section');
            console.log('🎨 projects.length:', projects.length);
            console.log('🎨 projects array:', projects);
            return null;
          })()}
          {projects.length === 0 ? (
            <div className="text-center py-8">
              {(() => {
                console.log('🎨 Rendering "No projects" message');
                return null;
              })()}
              <Timer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No projects available</p>
              <p className="text-sm text-gray-400 mb-4">Contact your administrator to create projects</p>
              <Button
                variant="outline"
                onClick={refreshProjects}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(() => {
                console.log('🎨 Rendering projects grid');
                console.log('🎨 About to map over projects:', projects);
                return null;
              })()}
              {projects.map((project) => {
                console.log('🎨 Rendering project card:', project);
                return (
                <Card key={project.id} className={`border-gray-200 cursor-pointer transition-all ${
                  selectedProjectId === project.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                }`}>
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
                      variant={selectedProjectId === project.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedProjectId(project.id)}
                      className="w-full"
                    >
                      {selectedProjectId === project.id ? (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeTimeTracker; 