import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User, Briefcase } from "lucide-react";

interface Screenshot {
  id: string;
  user_id: string;
  task_id: string;
  captured_at: string;
  image_url: string;
  users?: {
    full_name: string;
    email: string;
  };
  tasks?: {
    name: string;
    project_id: string;
    projects?: {
      name: string;
    };
  };
}

export default function AdminScreenshots() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [selectedUser, selectedProject, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users, projects and tasks
      const [usersResponse, projectsResponse, tasksResponse] = await Promise.all([
        supabase.from("users").select("id, full_name, email"),
        supabase.from("projects").select("id, name"),
        supabase.from("tasks").select("id, name, project_id")
      ]);

      if (usersResponse.data) setUsers(usersResponse.data);
      if (projectsResponse.data) setProjects(projectsResponse.data);
      if (tasksResponse.data) setTasks(tasksResponse.data);

      // Build query for screenshots with manual joins
      let query = supabase
        .from("screenshots")
        .select("*")
        .gte('captured_at', format(selectedDate, 'yyyy-MM-dd'))
        .lt('captured_at', format(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
        .order('captured_at', { ascending: false });

      if (selectedUser) {
        query = query.eq('user_id', selectedUser);
      }

      if (selectedProject) {
        // Filter by project through tasks
        const projectTasks = tasksResponse.data?.filter(t => t.project_id === selectedProject) || [];
        const taskIds = projectTasks.map(t => t.id);
        if (taskIds.length > 0) {
          query = query.in('task_id', taskIds);
        } else {
          // If no tasks found for this project, return empty results
          setScreenshots([]);
          return;
        }
      }

      const { data: screenshotsData, error } = await query;

      if (error) throw error;

      // Manually join user, task and project data
      const enrichedScreenshots = (screenshotsData || []).map(screenshot => {
        const user = usersResponse.data?.find(u => u.id === screenshot.user_id);
        const task = tasksResponse.data?.find(t => t.id === screenshot.task_id);
        const project = task ? projectsResponse.data?.find(p => p.id === task.project_id) : undefined;
        
        return {
          ...screenshot,
          users: user ? { full_name: user.full_name, email: user.email } : undefined,
          tasks: task ? { 
            name: task.name, 
            project_id: task.project_id,
            projects: project ? { name: project.name } : undefined
          } : undefined
        };
      });

      setScreenshots(enrichedScreenshots);
    } catch (error: any) {
      console.error("Error fetching screenshots:", error);
      toast({
        title: "Error fetching screenshots",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Screenshot Monitoring"
        subtitle="View user screenshots and activity"
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'MMM dd, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={selectedUser || 'all'} onValueChange={value => setSelectedUser(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <User className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProject || 'all'} onValueChange={value => setSelectedProject(value === 'all' ? null : value)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Briefcase className="mr-2 h-4 w-4" />
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No screenshots found for the selected filters
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="relative border rounded-md overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedImage(screenshot)}
                >
                  <img
                    src={screenshot.image_url}
                    alt="Screenshot"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                    <div className="font-medium truncate">
                      {screenshot.tasks?.projects?.name || 'Unknown Project'}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>{format(new Date(screenshot.captured_at), 'HH:mm')}</span>
                      <span className="truncate max-w-[120px]">
                        {screenshot.users?.full_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Screenshot - {selectedImage?.tasks?.projects?.name || 'Unknown Project'} by {selectedImage?.users?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">
              {selectedImage && format(new Date(selectedImage.captured_at), 'MMM dd, yyyy HH:mm:ss')}
            </div>
            {selectedImage && (
              <img
                src={selectedImage.image_url}
                alt="Screenshot"
                className="w-full h-auto border rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
