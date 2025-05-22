"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProjectManagement;
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const card_1 = require("@/components/ui/card");
const dialog_1 = require("@/components/ui/dialog");
const form_1 = require("@/components/ui/form");
const supabase_1 = require("@/lib/supabase");
const zod_1 = require("@hookform/resolvers/zod");
const react_hook_form_1 = require("react-hook-form");
const lucide_react_1 = require("lucide-react");
const zod_2 = require("zod");
const page_header_1 = require("@/components/layout/page-header");
const table_1 = require("@/components/ui/table");
const alert_dialog_1 = require("@/components/ui/alert-dialog");
// Form schema
const projectFormSchema = zod_2.z.object({
    name: zod_2.z.string().min(2, { message: "Project name must be at least 2 characters" }),
    description: zod_2.z.string().optional(),
});
function ProjectManagement() {
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isDialogOpen, setIsDialogOpen] = (0, react_1.useState)(false);
    const [editingProject, setEditingProject] = (0, react_1.useState)(null);
    const { toast } = (0, use_toast_1.useToast)();
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(projectFormSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });
    // Fetch projects
    (0, react_1.useEffect)(() => {
        async function fetchProjects() {
            try {
                const { data, error } = await supabase_1.supabase
                    .from("projects")
                    .select("*")
                    .order("created_at", { ascending: false });
                if (error)
                    throw error;
                setProjects(data || []);
            }
            catch (error) {
                toast({
                    title: "Error fetching projects",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, [toast]);
    // Handle form submission
    async function onSubmit(values) {
        try {
            if (editingProject) {
                // Update existing project
                const { error } = await supabase_1.supabase
                    .from("projects")
                    .update({
                    name: values.name,
                    description: values.description,
                })
                    .eq("id", editingProject.id);
                if (error)
                    throw error;
                toast({
                    title: "Project updated",
                    description: "The project has been updated successfully",
                });
                // Update local state
                setProjects(projects.map((p) => p.id === editingProject.id
                    ? { ...p, name: values.name, description: values.description }
                    : p));
            }
            else {
                // Create new project
                const { data, error } = await supabase_1.supabase.from("projects").insert({
                    name: values.name,
                    description: values.description,
                }).select();
                if (error)
                    throw error;
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
        }
        catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    // Handle delete project
    async function handleDeleteProject(id) {
        try {
            const { error } = await supabase_1.supabase.from("projects").delete().eq("id", id);
            if (error)
                throw error;
            toast({
                title: "Project deleted",
                description: "The project has been deleted successfully",
            });
            // Remove from local state
            setProjects(projects.filter((p) => p.id !== id));
        }
        catch (error) {
            toast({
                title: "Error deleting project",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    // Open dialog for editing
    function handleEditProject(project) {
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
    return (<div className="container py-6">
      <page_header_1.PageHeader title="Project Management" subtitle="Create and manage projects for your team">
        <button_1.Button onClick={handleNewProject}>
          <lucide_react_1.Plus className="mr-2 h-4 w-4"/> Add Project
        </button_1.Button>
      </page_header_1.PageHeader>

      <card_1.Card className="mt-6">
        <card_1.CardHeader>
          <card_1.CardTitle>Projects</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {loading ? (<div className="flex justify-center p-8">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : projects.length === 0 ? (<div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-muted-foreground">No projects found</p>
              <button_1.Button variant="outline" onClick={handleNewProject} className="mt-4">
                <lucide_react_1.Plus className="mr-2 h-4 w-4"/> Create your first project
              </button_1.Button>
            </div>) : (<table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Name</table_1.TableHead>
                  <table_1.TableHead>Description</table_1.TableHead>
                  <table_1.TableHead>Created</table_1.TableHead>
                  <table_1.TableHead className="w-[100px]">Actions</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {projects.map((project) => (<table_1.TableRow key={project.id}>
                    <table_1.TableCell className="font-medium">{project.name}</table_1.TableCell>
                    <table_1.TableCell className="max-w-md truncate">
                      {project.description || "No description"}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      {new Date(project.created_at).toLocaleDateString()}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex space-x-2">
                        <button_1.Button variant="ghost" size="icon" onClick={() => handleEditProject(project)}>
                          <lucide_react_1.Pencil className="h-4 w-4"/>
                        </button_1.Button>
                        <alert_dialog_1.AlertDialog>
                          <alert_dialog_1.AlertDialogTrigger asChild>
                            <button_1.Button variant="ghost" size="icon">
                              <lucide_react_1.Trash2 className="h-4 w-4 text-destructive"/>
                            </button_1.Button>
                          </alert_dialog_1.AlertDialogTrigger>
                          <alert_dialog_1.AlertDialogContent>
                            <alert_dialog_1.AlertDialogHeader>
                              <alert_dialog_1.AlertDialogTitle>Delete project</alert_dialog_1.AlertDialogTitle>
                              <alert_dialog_1.AlertDialogDescription>
                                Are you sure you want to delete "{project.name}"? This action cannot be undone.
                              </alert_dialog_1.AlertDialogDescription>
                            </alert_dialog_1.AlertDialogHeader>
                            <alert_dialog_1.AlertDialogFooter>
                              <alert_dialog_1.AlertDialogCancel>Cancel</alert_dialog_1.AlertDialogCancel>
                              <alert_dialog_1.AlertDialogAction onClick={() => handleDeleteProject(project.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </alert_dialog_1.AlertDialogAction>
                            </alert_dialog_1.AlertDialogFooter>
                          </alert_dialog_1.AlertDialogContent>
                        </alert_dialog_1.AlertDialog>
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
              {editingProject ? "Edit Project" : "Create Project"}
            </dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <form_1.Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <form_1.FormField control={form.control} name="name" render={({ field }) => (<form_1.FormItem>
                    <form_1.FormLabel>Project Name</form_1.FormLabel>
                    <form_1.FormControl>
                      <input_1.Input placeholder="Enter project name" {...field}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>)}/>
              <form_1.FormField control={form.control} name="description" render={({ field }) => (<form_1.FormItem>
                    <form_1.FormLabel>Description</form_1.FormLabel>
                    <form_1.FormControl>
                      <textarea_1.Textarea placeholder="Enter project description (optional)" {...field}/>
                    </form_1.FormControl>
                    <form_1.FormMessage />
                  </form_1.FormItem>)}/>
              <dialog_1.DialogFooter>
                <button_1.Button type="submit">
                  {editingProject ? "Update Project" : "Create Project"}
                </button_1.Button>
              </dialog_1.DialogFooter>
            </form>
          </form_1.Form>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
