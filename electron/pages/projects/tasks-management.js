"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TasksManagement;
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const card_1 = require("@/components/ui/card");
const dialog_1 = require("@/components/ui/dialog");
const form_1 = require("@/components/ui/form");
const select_1 = require("@/components/ui/select");
const supabase_1 = require("@/lib/supabase");
const zod_1 = require("@hookform/resolvers/zod");
const react_hook_form_1 = require("react-hook-form");
const lucide_react_1 = require("lucide-react");
const zod_2 = require("zod");
const page_header_1 = require("@/components/layout/page-header");
const table_1 = require("@/components/ui/table");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
const auth_provider_1 = require("@/providers/auth-provider");
// Form schema
const taskFormSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, { message: "Task name must be at least 2 characters" }),
    project_id: zod_2.z.string().uuid({ message: "Please select a project" }),
    user_id: zod_2.z.string().uuid({ message: "Please select a user" }),
});
function TasksManagement() {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [users, setUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isDialogOpen, setIsDialogOpen] = (0, react_1.useState)(false);
    const [editingTask, setEditingTask] = (0, react_1.useState)(null);
    const { toast } = (0, use_toast_1.useToast)();
    const { userDetails } = (0, auth_provider_1.useAuth)();
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(taskFormSchema),
        defaultValues: {
            name: "",
            project_id: "",
            user_id: "",
        },
    });
    // Fetch tasks, projects, and users
    (0, react_1.useEffect)(() => {
        async function fetchData() {
            try {
                setLoading(true);
                // Fetch tasks
                let query = supabase_1.supabase
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
                if (tasksError)
                    throw tasksError;
                setTasks(tasksData || []);
                // Fetch projects
                const { data: projectsData, error: projectsError } = await supabase_1.supabase
                    .from("projects")
                    .select("id, name")
                    .order('name');
                if (projectsError)
                    throw projectsError;
                setProjects(projectsData || []);
                // Fetch users (only for admin/manager)
                if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
                    const { data: usersData, error: usersError } = await supabase_1.supabase
                        .from("users")
                        .select("id, full_name, email")
                        .order('full_name');
                    if (usersError)
                        throw usersError;
                    setUsers(usersData || []);
                }
                else {
                    // For employees, only add themselves
                    setUsers(userDetails ? [{
                            id: userDetails.id,
                            full_name: userDetails.full_name,
                            email: userDetails.email
                        }] : []);
                }
            }
            catch (error) {
                toast({
                    title: "Error fetching data",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [toast, userDetails]);
    // Handle form submission
    async function onSubmit(values) {
        try {
            if (editingTask) {
                // Update existing task
                const { error } = await supabase_1.supabase
                    .from("tasks")
                    .update({
                    name: values.name,
                    project_id: values.project_id,
                    user_id: values.user_id
                })
                    .eq("id", editingTask.id);
                if (error)
                    throw error;
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
                setTasks(tasks.map((t) => t.id === editingTask.id ? updatedTask : t));
            }
            else {
                // Create new task
                const { data, error } = await supabase_1.supabase
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
                if (error)
                    throw error;
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
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    // Handle delete task
    async function handleDeleteTask(id) {
        try {
            const { error } = await supabase_1.supabase.from("tasks").delete().eq("id", id);
            if (error)
                throw error;
            toast({
                title: "Task deleted",
                description: "The task has been deleted successfully",
            });
            // Remove from local state
            setTasks(tasks.filter((t) => t.id !== id));
        }
        catch (error) {
            toast({
                title: "Error deleting task",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    // Open dialog for editing
    function handleEditTask(task) {
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
    return (<div className="container py-6">
      <page_header_1.PageHeader title="Task Management" subtitle="Create and manage tasks for projects">
        <button_1.Button onClick={handleNewTask}>
          <lucide_react_1.Plus className="mr-2 h-4 w-4"/> Add Task
        </button_1.Button>
      </page_header_1.PageHeader>

      <card_1.Card className="mt-6">
        <card_1.CardHeader>
          <card_1.CardTitle>Tasks</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {loading ? (<div className="flex justify-center p-8">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : tasks.length === 0 ? (<div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">No tasks found</p>
              <button_1.Button variant="outline" onClick={handleNewTask} className="mt-4">
                <lucide_react_1.Plus className="mr-2 h-4 w-4"/> Create your first task
              </button_1.Button>
            </div>) : (<table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Task Name</table_1.TableHead>
                  <table_1.TableHead>Project</table_1.TableHead>
                  <table_1.TableHead>Assigned To</table_1.TableHead>
                  <table_1.TableHead>Created</table_1.TableHead>
                  <table_1.TableHead className="w-[100px]">Actions</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {tasks.map((task) => (<table_1.TableRow key={task.id}>
                    <table_1.TableCell className="font-medium">{task.name}</table_1.TableCell>
                    <table_1.TableCell>{task.projects?.name}</table_1.TableCell>
                    <table_1.TableCell>{task.users?.full_name}</table_1.TableCell>
                    <table_1.TableCell>
                      {new Date(task.created_at).toLocaleDateString()}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex space-x-2">
                        <button_1.Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                          <lucide_react_1.Pencil className="h-4 w-4"/>
                        </button_1.Button>
                        {canManageTasks && (<alert_dialog_1.AlertDialog>
                            <alert_dialog_1.AlertDialogTrigger asChild>
                              <button_1.Button variant="ghost" size="icon">
                                <lucide_react_1.Trash2 className="h-4 w-4 text-destructive"/>
                              </button_1.Button>
                            </alert_dialog_1.AlertDialogTrigger>
                            <alert_dialog_1.AlertDialogContent>
                              <alert_dialog_1.AlertDialogHeader>
                                <alert_dialog_1.AlertDialogTitle>Delete task</alert_dialog_1.AlertDialogTitle>
                                <alert_dialog_1.AlertDialogDescription>
                                  Are you sure you want to delete "{task.name}"? This action cannot be undone.
                                </alert_dialog_1.AlertDialogDescription>
                              </alert_dialog_1.AlertDialogHeader>
                              <alert_dialog_1.AlertDialogFooter>
                                <alert_dialog_1.AlertDialogCancel>Cancel</alert_dialog_1.AlertDialogCancel>
                                <alert_dialog_1.AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </alert_dialog_1.AlertDialogAction>
                              </alert_dialog_1.AlertDialogFooter>
                            </alert_dialog_1.AlertDialogContent>
                          </alert_dialog_1.AlertDialog>)}
                      </div>
                    </table_1.TableCell>
                  </table_1.TableRow>))}
              </table_1.TableBody>
            </table_1.Table>)}
        </card_1.CardContent>
      </card_1.Card>

      <dialog_1.Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>
              {editingTask ? "Edit Task" : "Create Task"}
            </dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <form_1.Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <form_1.FormField control={form.control} name="name" render={({ field }) => (<form_1.FormItem>
                    <form_1.FormLabel>Task Name</form_1.FormLabel>
                    <form_1.FormControl>
                      <input_1.Input placeholder="Enter task name" {...field}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>)}/>
              <form_1.FormField control={form.control} name="project_id" render={({ field }) => (<form_1.FormItem>
                    <form_1.FormLabel>Project</form_1.FormLabel>
                    <select_1.Select onValueChange={field.onChange} defaultValue={field.value}>
                      <form_1.FormControl>
                        <select_1.SelectTrigger>
                          <select_1.SelectValue placeholder="Select a project"/>
                        </select_1.SelectTrigger>
                      </form_1.FormControl>
                      <select_1.SelectContent>
                        {projects.map(project => (<select_1.SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </select_1.SelectItem>))}
                      </select_1.SelectContent>
                    </select_1.Select>
                    <form_1.FormMessage />
                  </form_1.FormItem>)}/>
              <form_1.FormField control={form.control} name="user_id" render={({ field }) => (<form_1.FormItem>
                    <form_1.FormLabel>Assign To</form_1.FormLabel>
                    <select_1.Select onValueChange={field.onChange} defaultValue={field.value} disabled={userDetails?.role === 'employee'}>
                      <form_1.FormControl>
                        <select_1.SelectTrigger>
                          <select_1.SelectValue placeholder="Select a user"/>
                        </select_1.SelectTrigger>
                      </form_1.FormControl>
                      <select_1.SelectContent>
                        {users.map(user => (<select_1.SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </select_1.SelectItem>))}
                      </select_1.SelectContent>
                    </select_1.Select>
                    <form_1.FormMessage />
                  </form_1.FormItem>)}/>
              <dialog_1.DialogFooter>
                <button_1.Button type="submit">
                  {editingTask ? "Update Task" : "Create Task"}
                </button_1.Button>
              </dialog_1.DialogFooter>
            </form>
          </form_1.Form>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
