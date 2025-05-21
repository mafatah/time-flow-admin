
import { useState, useEffect } from "react";
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

interface ProjectWithStats extends Tables<"projects"> {
  taskCount: number;
  userCount: number;
  totalHours: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true);
        
        // In a real app, we would fetch real data from Supabase
        // For this demo, we're using mock data
        const mockProjects: ProjectWithStats[] = [
          {
            id: "1",
            name: "Website Redesign",
            description: "Complete overhaul of the company website with new branding",
            created_at: "2023-05-10T08:00:00Z",
            taskCount: 12,
            userCount: 3,
            totalHours: 86
          },
          {
            id: "2",
            name: "Mobile App Development",
            description: "Building a new mobile application for both iOS and Android",
            created_at: "2023-06-15T10:30:00Z",
            taskCount: 25,
            userCount: 4,
            totalHours: 120
          },
          {
            id: "3",
            name: "Marketing Campaign",
            description: "Q2 marketing campaign for new product launch",
            created_at: "2023-07-01T09:15:00Z",
            taskCount: 8,
            userCount: 2,
            totalHours: 45
          },
          {
            id: "4",
            name: "CRM Integration",
            description: "Integrate our tools with the new CRM system",
            created_at: "2023-07-20T14:00:00Z",
            taskCount: 15,
            userCount: 5,
            totalHours: 67
          }
        ];

        setProjects(mockProjects);
        setError(null);
      } catch (err) {
        console.error("Error fetching projects:", err);
        setError("Failed to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading message="Loading projects..." />;
  if (error) return <ErrorMessage message={error} />;

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
