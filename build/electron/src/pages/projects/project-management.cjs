"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProjectManagement;
const jsx_runtime_1 = require("react/jsx-runtime");
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
                    description: values.description || null, // Convert undefined to null
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
                    ? { ...p, name: values.name, description: values.description || null }
                    : p));
            }
            else {
                // Create new project
                const { data, error } = await supabase_1.supabase.from("projects").insert({
                    name: values.name,
                    description: values.description || null, // Convert undefined to null
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
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Project Management", subtitle: "Create and manage projects for your team", children: (0, jsx_runtime_1.jsxs)(button_1.Button, { onClick: handleNewProject, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "mr-2 h-4 w-4" }), " Add Project"] }) }), (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "mt-6", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Projects" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center p-8", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }) })) : projects.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center p-8 text-center", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-muted-foreground", children: "No projects found" }), (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "outline", onClick: handleNewProject, className: "mt-4", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "mr-2 h-4 w-4" }), " Create your first project"] })] })) : ((0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Name" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Description" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Created" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { className: "w-[100px]", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { children: projects.map((project) => ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "font-medium", children: project.name }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "max-w-md truncate", children: project.description || "No description" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: new Date(project.created_at).toLocaleDateString() }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-2", children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: () => handleEditProject(project), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-4 w-4" }) }), (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialog, { children: [(0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4 text-destructive" }) }) }), (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogContent, { children: [(0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogHeader, { children: [(0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogTitle, { children: "Delete project" }), (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogDescription, { children: ["Are you sure you want to delete \"", project.name, "\"? This action cannot be undone."] })] }), (0, jsx_runtime_1.jsxs)(alert_dialog_1.AlertDialogFooter, { children: [(0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogCancel, { children: "Cancel" }), (0, jsx_runtime_1.jsx)(alert_dialog_1.AlertDialogAction, { onClick: () => handleDeleteProject(project.id), className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", children: "Delete" })] })] })] })] }) })] }, project.id))) })] })) })] }), (0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogHeader, { children: (0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: editingProject ? "Edit Project" : "Create Project" }) }), (0, jsx_runtime_1.jsx)(form_1.Form, { ...form, children: (0, jsx_runtime_1.jsxs)("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(form_1.FormField, { control: form.control, name: "name", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Project Name" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "Enter project name", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(form_1.FormField, { control: form.control, name: "description", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Description" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(textarea_1.Textarea, { placeholder: "Enter project description (optional)", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(dialog_1.DialogFooter, { children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", children: editingProject ? "Update Project" : "Create Project" }) })] }) })] }) })] }));
}
