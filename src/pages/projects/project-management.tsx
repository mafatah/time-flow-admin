
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Form schema
const projectFormSchema = z.object({
  name: z.string().min(2, { message: "Project name must be at least 2 characters" }),
  description: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Tables<"projects"> | null>(null);
  const { toast } = useToast();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error: any) {
        toast({
          title: "Error fetching projects",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [toast]);

  // Handle form submission
  async function onSubmit(values: ProjectFormValues) {
    try {
      if (editingProject) {
        // Update existing project
        const { error } = await supabase
          .from("projects")
          .update({
            name: values.name,
            description: values.description,
          })
          .eq("id", editingProject.id);

        if (error) throw error;

        toast({
          title: "Project updated",
          description: "The project has been updated successfully",
        });

        // Update local state
        setProjects(
          projects.map((p) =>
            p.id === editingProject.id
              ? { ...p, name: values.name, description: values.description }
              : p
          )
        );
      } else {
        // Create new project
        const { data, error } = await supabase.from("projects").insert({
          name: values.name,
          description: values.description,
        }).select();

        if (error) throw error;

        toast({
          title: "Project created",
          description: "The project has been created successfully",
        });

        // Add new project to state
        if (data && data.length > 0) {
          setProjects([data[0], ...projects]);
        }
      }

      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      setEditingProject(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Handle delete project
  async function handleDeleteProject(id: string) {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully",
      });

      // Remove from local state
      setProjects(projects.filter((p) => p.id !== id));
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Open dialog for editing
  function handleEditProject(project: Tables<"projects">) {
    setEditingProject(project);
    form.reset({
      name: project.name,
      description: project.description || "",
    });
    setIsDialogOpen(true);
  }

  // Open dialog for creating
  function handleNewProject() {
    setEditingProject(null);
    form.reset({
      name: "",
      description: "",
    });
    setIsDialogOpen(true);
  }

  return (
    <div className="container py-6">
      <PageHeader
        heading="Project Management"
        description="Create and manage projects for your team"
        actions={
          <Button onClick={handleNewProject}>
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
        }
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">No projects found</p>
              <Button variant="outline" onClick={handleNewProject} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Create your first project
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {project.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {new Date(project.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditProject(project)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete project</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProject(project.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "Create Project"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter project description (optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">
                  {editingProject ? "Update Project" : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
