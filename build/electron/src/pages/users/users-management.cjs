"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersManagement;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const use_toast_1 = require("@/components/ui/use-toast");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const table_1 = require("@/components/ui/table");
const dialog_1 = require("@/components/ui/dialog");
const form_1 = require("@/components/ui/form");
const select_1 = require("@/components/ui/select");
const page_header_1 = require("@/components/layout/page-header");
const supabase_1 = require("@/lib/supabase");
const zod_1 = require("@hookform/resolvers/zod");
const react_hook_form_1 = require("react-hook-form");
const lucide_react_1 = require("lucide-react");
const zod_2 = require("zod");
const auth_provider_1 = require("@/providers/auth-provider");
// Form schema
const userRoleFormSchema = zod_2.z.object({
    role: zod_2.z.enum(["admin", "manager", "employee"], {
        required_error: "Please select a role",
    }),
});
function UsersManagement() {
    const [users, setUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isDialogOpen, setIsDialogOpen] = (0, react_1.useState)(false);
    const [selectedUser, setSelectedUser] = (0, react_1.useState)(null);
    const { toast } = (0, use_toast_1.useToast)();
    const { userDetails } = (0, auth_provider_1.useAuth)();
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(userRoleFormSchema),
        defaultValues: {
            role: "employee",
        },
    });
    // Fetch users
    (0, react_1.useEffect)(() => {
        async function fetchUsers() {
            try {
                const { data, error } = await supabase_1.supabase
                    .from("users")
                    .select("*")
                    .order("full_name");
                if (error)
                    throw error;
                setUsers(data || []);
            }
            catch (error) {
                toast({
                    title: "Error fetching users",
                    description: error.message,
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [toast]);
    // Handle form submission
    async function onSubmit(values) {
        if (!selectedUser)
            return;
        try {
            const { error } = await supabase_1.supabase
                .from("users")
                .update({ role: values.role })
                .eq("id", selectedUser.id);
            if (error)
                throw error;
            toast({
                title: "Role updated",
                description: `User role has been changed to ${values.role}`,
            });
            // Update local state
            setUsers(users.map((u) => u.id === selectedUser.id ? { ...u, role: values.role } : u));
            // Close dialog
            setIsDialogOpen(false);
        }
        catch (error) {
            toast({
                title: "Error updating role",
                description: error.message,
                variant: "destructive",
            });
        }
    }
    // Open dialog for editing role
    function handleEditRole(user) {
        setSelectedUser(user);
        form.reset({ role: user.role });
        setIsDialogOpen(true);
    }
    // Check if current user can edit roles (must be admin)
    const canEditRoles = userDetails?.role === "admin";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container py-6", children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "User Management", subtitle: "Manage users and their roles" }), (0, jsx_runtime_1.jsxs)(card_1.Card, { className: "mt-6", children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Users" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center p-8", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Loader2, { className: "h-8 w-8 animate-spin text-muted-foreground" }) })) : users.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center p-8 text-muted-foreground", children: "No users found" })) : ((0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Name" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Email" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Role" }), canEditRoles && (0, jsx_runtime_1.jsx)(table_1.TableHead, { className: "w-[100px]", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { children: users.map((user) => ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "font-medium", children: user.full_name }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: user.email }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, jsx_runtime_1.jsx)("span", { className: `capitalize ${user.role === "admin"
                                                        ? "text-destructive font-semibold"
                                                        : user.role === "manager"
                                                            ? "text-orange-500 font-semibold"
                                                            : ""}`, children: user.role }) }), canEditRoles && ((0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: () => handleEditRole(user), disabled: user.id === userDetails?.id, children: "Change Role" }) }))] }, user.id))) })] })) })] }), (0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogHeader, { children: (0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Change User Role" }) }), (0, jsx_runtime_1.jsx)(form_1.Form, { ...form, children: (0, jsx_runtime_1.jsxs)("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-1 mb-4", children: [(0, jsx_runtime_1.jsxs)("p", { className: "font-medium", children: ["User: ", selectedUser?.full_name] }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-muted-foreground", children: selectedUser?.email })] }), (0, jsx_runtime_1.jsx)(form_1.FormField, { control: form.control, name: "role", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Role" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { onValueChange: field.onChange, defaultValue: field.value, children: [(0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a role" }) }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "admin", children: "Admin" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "manager", children: "Manager" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "employee", children: "Employee" })] })] }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(dialog_1.DialogFooter, { children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", children: "Update Role" }) })] }) })] }) })] }));
}
