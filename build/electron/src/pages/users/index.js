"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const supabase_1 = require("@/lib/supabase");
const page_header_1 = require("@/components/layout/page-header");
const button_1 = require("@/components/ui/button");
const table_1 = require("@/components/ui/table");
const dialog_1 = require("@/components/ui/dialog");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const badge_1 = require("@/components/ui/badge");
const avatar_1 = require("@/components/ui/avatar");
const input_1 = require("@/components/ui/input");
const form_1 = require("@/components/ui/form");
const select_1 = require("@/components/ui/select");
const loading_1 = require("@/components/layout/loading");
const error_message_1 = require("@/components/layout/error-message");
const utils_1 = require("@/lib/utils");
const lucide_react_1 = require("lucide-react");
const auth_provider_1 = require("@/providers/auth-provider");
const use_toast_1 = require("@/components/ui/use-toast");
const zod_1 = require("zod");
const react_hook_form_1 = require("react-hook-form");
const zod_2 = require("@hookform/resolvers/zod");
const userFormSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Please enter a valid email address" }),
    full_name: zod_1.z.string().min(2, { message: "Name must be at least 2 characters" }),
    role: zod_1.z.string().refine(val => ['admin', 'manager', 'employee'].includes(val), {
        message: "Please select a valid role"
    }),
    password: zod_1.z.string().min(6, { message: "Password must be at least 6 characters" }).optional()
});
function UsersPage() {
    const { userDetails } = (0, auth_provider_1.useAuth)();
    const { toast } = (0, use_toast_1.useToast)();
    const [users, setUsers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    const [isAddUserOpen, setIsAddUserOpen] = (0, react_1.useState)(false);
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [selectedUserId, setSelectedUserId] = (0, react_1.useState)(null);
    const userForm = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_2.zodResolver)(userFormSchema),
        defaultValues: {
            email: "",
            full_name: "",
            role: "employee",
            password: ""
        }
    });
    (0, react_1.useEffect)(() => {
        if (selectedUserId) {
            const user = users.find(u => u.id === selectedUserId);
            if (user) {
                userForm.setValue("email", user.email);
                userForm.setValue("full_name", user.full_name);
                userForm.setValue("role", user.role);
                // Don't set password when editing
            }
        }
    }, [selectedUserId, users, userForm]);
    (0, react_1.useEffect)(() => {
        async function fetchUsers() {
            try {
                setLoading(true);
                // Only fetch users if current user is admin or manager
                if (userDetails?.role !== 'admin' && userDetails?.role !== 'manager') {
                    setError("You don't have permission to view users");
                    return;
                }
                const { data, error } = await supabase_1.supabase
                    .from("users")
                    .select("*")
                    .order("full_name");
                if (error)
                    throw error;
                setUsers(data || []);
                setError(null);
            }
            catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again later.");
                toast({
                    title: "Error",
                    description: err.message || "Failed to load users",
                    variant: "destructive"
                });
            }
            finally {
                setLoading(false);
            }
        }
        fetchUsers();
    }, [userDetails, toast]);
    const filteredUsers = users.filter((user) => user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()));
    async function handleAddUser(values) {
        try {
            if (!values.password && !isEditing) {
                toast({
                    title: "Error",
                    description: "Password is required for new users",
                    variant: "destructive"
                });
                return;
            }
            if (isEditing) {
                // Update existing user
                const { error } = await supabase_1.supabase
                    .from("users")
                    .update({
                    full_name: values.full_name,
                    role: values.role
                })
                    .eq("id", selectedUserId);
                if (error)
                    throw error;
                // Update local state
                setUsers(prev => prev.map(user => user.id === selectedUserId
                    ? { ...user, full_name: values.full_name, role: values.role }
                    : user));
                toast({
                    title: "Success",
                    description: "User updated successfully"
                });
            }
            else {
                // Create new user
                const { data, error } = await supabase_1.supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: {
                        data: {
                            full_name: values.full_name,
                            role: values.role
                        }
                    }
                });
                if (error)
                    throw error;
                toast({
                    title: "Success",
                    description: "User created successfully"
                });
            }
            // Reset form and close dialog
            userForm.reset();
            setIsAddUserOpen(false);
            setIsEditing(false);
            setSelectedUserId(null);
        }
        catch (err) {
            console.error("Error managing user:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to manage user",
                variant: "destructive"
            });
        }
    }
    async function handleDeleteUser(userId) {
        try {
            if (!confirm("Are you sure you want to delete this user?")) {
                return;
            }
            const { error } = await supabase_1.supabase
                .from("users")
                .delete()
                .eq("id", userId);
            if (error)
                throw error;
            // Update local state
            setUsers(prev => prev.filter(user => user.id !== userId));
            toast({
                title: "Success",
                description: "User deleted successfully"
            });
        }
        catch (err) {
            console.error("Error deleting user:", err);
            toast({
                title: "Error",
                description: err.message || "Failed to delete user",
                variant: "destructive"
            });
        }
    }
    if (loading)
        return (0, jsx_runtime_1.jsx)(loading_1.Loading, { message: "Loading users..." });
    if (error)
        return (0, jsx_runtime_1.jsx)(error_message_1.ErrorMessage, { message: error });
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Users", subtitle: "Manage and monitor your team members", children: (0, jsx_runtime_1.jsxs)(dialog_1.Dialog, { open: isAddUserOpen, onOpenChange: setIsAddUserOpen, children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { onClick: () => {
                                    setIsEditing(false);
                                    setSelectedUserId(null);
                                    userForm.reset({
                                        email: "",
                                        full_name: "",
                                        role: "employee",
                                        password: ""
                                    });
                                }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.UserPlus, { className: "mr-2 h-4 w-4" }), " Add User"] }) }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: isEditing ? "Edit User" : "Add New User" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: isEditing
                                                ? "Update user details below."
                                                : "Fill in the details to create a new user account." })] }), (0, jsx_runtime_1.jsx)(form_1.Form, { ...userForm, children: (0, jsx_runtime_1.jsxs)("form", { onSubmit: userForm.handleSubmit(handleAddUser), className: "space-y-4", children: [(0, jsx_runtime_1.jsx)(form_1.FormField, { control: userForm.control, name: "email", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Email" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "user@example.com", ...field, disabled: isEditing }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(form_1.FormField, { control: userForm.control, name: "full_name", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Full Name" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "John Smith", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), (0, jsx_runtime_1.jsx)(form_1.FormField, { control: userForm.control, name: "role", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Role" }), (0, jsx_runtime_1.jsxs)(select_1.Select, { onValueChange: field.onChange, defaultValue: field.value, children: [(0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(select_1.SelectTrigger, { children: (0, jsx_runtime_1.jsx)(select_1.SelectValue, { placeholder: "Select a role" }) }) }), (0, jsx_runtime_1.jsxs)(select_1.SelectContent, { children: [(0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "admin", children: "Admin" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "manager", children: "Manager" }), (0, jsx_runtime_1.jsx)(select_1.SelectItem, { value: "employee", children: "Employee" })] })] }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) }), !isEditing && ((0, jsx_runtime_1.jsx)(form_1.FormField, { control: userForm.control, name: "password", render: ({ field }) => ((0, jsx_runtime_1.jsxs)(form_1.FormItem, { children: [(0, jsx_runtime_1.jsx)(form_1.FormLabel, { children: "Password" }), (0, jsx_runtime_1.jsx)(form_1.FormControl, { children: (0, jsx_runtime_1.jsx)(input_1.Input, { type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", ...field }) }), (0, jsx_runtime_1.jsx)(form_1.FormMessage, {})] })) })), (0, jsx_runtime_1.jsx)(dialog_1.DialogFooter, { children: (0, jsx_runtime_1.jsx)(button_1.Button, { type: "submit", children: isEditing ? "Update User" : "Create User" }) })] }) })] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "mb-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }), (0, jsx_runtime_1.jsx)(input_1.Input, { placeholder: "Search users...", className: "pl-8", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "rounded-md border", children: (0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Name" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Email" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Role" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { className: "text-right", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { children: filteredUsers.length === 0 ? ((0, jsx_runtime_1.jsx)(table_1.TableRow, { children: (0, jsx_runtime_1.jsx)(table_1.TableCell, { colSpan: 4, className: "text-center py-8 text-muted-foreground", children: "No users found" }) })) : (filteredUsers.map((user) => ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "font-medium", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(avatar_1.Avatar, { className: "h-8 w-8", children: (0, jsx_runtime_1.jsx)(avatar_1.AvatarFallback, { children: (0, utils_1.getInitials)(user.full_name) }) }), user.full_name] }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: user.email }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "outline", className: (0, utils_1.getUserRoleBadgeColor)(user.role), children: (0, utils_1.getUserRoleLabel)(user.role) }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "text-right", children: (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenu, { children: [(0, jsx_runtime_1.jsx)(dropdown_menu_1.DropdownMenuTrigger, { asChild: true, children: (0, jsx_runtime_1.jsxs)(button_1.Button, { variant: "ghost", size: "sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MoreHorizontal, { className: "h-4 w-4" }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Open menu" })] }) }), (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuContent, { align: "end", children: [(0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuItem, { onClick: () => {
                                                                setIsEditing(true);
                                                                setSelectedUserId(user.id);
                                                                setIsAddUserOpen(true);
                                                            }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Edit, { className: "mr-2 h-4 w-4" }), " Edit"] }), (0, jsx_runtime_1.jsxs)(dropdown_menu_1.DropdownMenuItem, { onClick: () => handleDeleteUser(user.id), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "mr-2 h-4 w-4" }), " Delete"] })] })] }) })] }, user.id)))) })] }) })] }));
}
