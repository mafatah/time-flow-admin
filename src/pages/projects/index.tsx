
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/layout/loading";
import { ErrorMessage } from "@/components/layout/error-message";
import { Tables } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Layout, Plus, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ProjectWithStats extends Tables<"projects"> {
  taskCount: number;
  userCount: number;
  totalHours: number;
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Fetch projects using React Query
  const {
    data: projects = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        // Fetch all projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*");
          
        if (projectsError) throw projectsError;

        // For each project, get stats
        const projectsWithStats = await Promise.all(
          projectsData.map(async (project) => {
            // Get tasks for this project
            const { data: tasks, error: tasksError } = await supabase
              .from("tasks")
              .select("id, user_id")
              .eq("project_id", project.id);
              
            if (tasksError) throw tasksError;
            
            // Get unique users count
            const uniqueUserIds = tasks ? [...new Set(tasks.map(task => task.user_id))] : [];
            
            // Get time logs for all tasks in this project
            const taskIds = tasks ? tasks.map(task => task.id) : [];
            let totalHours = 0;
            
            if (taskIds.length > 0) {
              const { data: timeLogs, error: timeLogsError } = await supabase
                .from("time_logs")
                .select("start_time, end_time")
                .in("task_id", taskIds);
                
              if (timeLogsError) throw timeLogsError;
              
              // Calculate total hours
              if (timeLogs) {
                totalHours = timeLogs.reduce((acc, log) => {
                  if (log.end_time) {
                    const startTime = new Date(log.start_time).getTime();
                    const endTime = new Date(log.end_time).getTime();
                    return acc + (endTime - startTime) / (1000 * 60 * 60); // Convert ms to hours
                  }
                  return acc;
                }, 0);
              }
            }
            
            return {
              ...project,
              taskCount: tasks ? tasks.length : 0,
              userCount: uniqueUserIds.length,
              totalHours: Math.round(totalHours * 10) / 10 // Round to 1 decimal place
            } as ProjectWithStats;
          })
        );
        
        return projectsWithStats;
      } catch (err: any) {
        console.error("Error fetching projects:", err);
        toast({
          title: "Error loading projects",
          description: err.message || "Failed to load projects",
          variant: "destructive"
        });
        return [];
      }
    }
  });

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <Loading message="Loading projects..." />;
  if (error) return <ErrorMessage message={(error as Error).message} />;

  return (
    <>
      <PageHeader 
        title="Projects" 
        subtitle="Manage and track your team's projects"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </PageHeader>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/40 rounded-lg">
          <Layout className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Projects Found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or create a new project.
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>
                  {project.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium">
                      {formatDate(project.created_at, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tasks</span>
                    <Badge variant="outline">
                      {project.taskCount} tasks
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Team Size</span>
                    <Badge variant="outline">
                      {project.userCount} members
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Hours</span>
                    <span className="text-sm font-medium">{project.totalHours} hours</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">
                  Tasks
                </Button>
                <Button size="sm">
                  View Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
