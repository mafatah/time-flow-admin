import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/providers/auth-provider";

// Form schema
const taskFormSchema = z.object({
  name: z.string().min(2, { message: "Task name must be at least 2 characters" }),
  project_id: z.string().uuid({ message: "Please select a project" }),
  user_id: z.string().uuid({ message: "Please select a user" }),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Task extends Tables<"tasks"> {
  projects?: {
    name: string;
  };
  users?: {
    full_name: string;
  };
}

export default function TasksManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      project_id: "",
      user_id: "",
    },
  });

  // Fetch tasks, projects, and users
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch tasks
        let query = supabase
          .from("tasks")
          .select(`
            *,
            projects(id, name),
            users(id, full_name)
          `);
          
        if (userDetails?.role === 'employee') {
          // Employees can only see their tasks
          query = query.eq('user_id', userDetails.id);
        }
        
        const { data: tasksData, error: tasksError } = await query
          .order('created_at', { ascending: false });
        
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
        
        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name")
          .order('name');
        
        if (projectsError) throw projectsError;
        setProjects(projectsData || []);
        
        // Fetch users (only for admin/manager)
        if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .order('full_name');
          
          if (usersError) throw usersError;
          setUsers(usersData || []);
        } else {
          // For employees, only add themselves
          setUsers(userDetails ? [{ 
            id: userDetails.id, 
            full_name: userDetails.full_name,
            email: userDetails.email
          }] : []);
        }
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast, userDetails]);

  // Handle form submission
  async function onSubmit(values: TaskFormValues) {
    try {
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update({
            name: values.name,
            project_id: values.project_id,
            user_id: values.user_id
          })
          .eq("id", editingTask.id);

        if (error) throw error;

        toast({
          title: "Task updated",
          description: "The task has been updated successfully",
        });

        // Update local state
        const updatedTask = {
          ...editingTask,
          name: values.name,
          project_id: values.project_id,
          user_id: values.user_id,
          projects: { name: projects.find(p => p.id === values.project_id)?.name || '' },
          users: { full_name: users.find(u => u.id === values.user_id)?.full_name || '' }
        };
        
        setTasks(
          tasks.map((t) => t.id === editingTask.id ? updatedTask : t)
        );
      } else {
        // Create new task
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            name: values.name,
            project_id: values.project_id,
            user_id: values.user_id
          })
          .select(`
            *,
            projects(id, name),
            users(id, full_name)
          `);

        if (error) throw error;

        toast({
          title: "Task created",
          description: "The task has been created successfully",
        });

        // Add new task to state
        if (data && data.length > 0) {
          setTasks([data[0], ...tasks]);
        }
      }

      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Handle delete task
  async function handleDeleteTask(id: string) {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Task deleted",
        description: "The task has been deleted successfully",
      });

      // Remove from local state
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error: any) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Open dialog for editing
  function handleEditTask(task: Task) {
    setEditingTask(task);
    form.reset({
      name: task.name,
      project_id: task.project_id,
      user_id: task.user_id,
    });
    setIsDialogOpen(true);
  }

  // Open dialog for creating
  function handleNewTask() {
    setEditingTask(null);
    form.reset({
      name: "",
      project_id: "",
      user_id: userDetails?.role === 'employee' ? userDetails.id : "",
    });
    setIsDialogOpen(true);
  }

  // Check if user can manage tasks
  const canManageTasks = userDetails?.role !== 'employee';

  return (
    <div className="container py-6">
      <PageHeader
        title="Task Management"
        subtitle="Create and manage tasks for projects"
      >
        <Button onClick={handleNewTask}>
          <Plus className="mr-2 h-4 w-4" /> Add Task
        </Button>
      </PageHeader>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">No tasks found</p>
              <Button variant="outline" onClick={handleNewTask} className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> Create your first task
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>{task.projects?.name}</TableCell>
                    <TableCell>{task.users?.full_name}</TableCell>
                    <TableCell>
                      {new Date(task.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTask(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canManageTasks && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{task.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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
              {editingTask ? "Edit Task" : "Create Task"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={userDetails?.role === 'employee'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
