"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersPage;
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
        return <loading_1.Loading message="Loading users..."/>;
    if (error)
        return <error_message_1.ErrorMessage message={error}/>;
    return (<>
      <page_header_1.PageHeader title="Users" subtitle="Manage and monitor your team members">
        <dialog_1.Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <dialog_1.DialogTrigger asChild>
            <button_1.Button onClick={() => {
            setIsEditing(false);
            setSelectedUserId(null);
            userForm.reset({
                email: "",
                full_name: "",
                role: "employee",
                password: ""
            });
        }}>
              <lucide_react_1.UserPlus className="mr-2 h-4 w-4"/> Add User
            </button_1.Button>
          </dialog_1.DialogTrigger>
          <dialog_1.DialogContent>
            <dialog_1.DialogHeader>
              <dialog_1.DialogTitle>{isEditing ? "Edit User" : "Add New User"}</dialog_1.DialogTitle>
              <dialog_1.DialogDescription>
                {isEditing
            ? "Update user details below."
            : "Fill in the details to create a new user account."}
              </dialog_1.DialogDescription>
            </dialog_1.DialogHeader>
            <form_1.Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(handleAddUser)} className="space-y-4">
                <form_1.FormField control={userForm.control} name="email" render={({ field }) => (<form_1.FormItem>
                      <form_1.FormLabel>Email</form_1.FormLabel>
                      <form_1.FormControl>
                        <input_1.Input placeholder="user@example.com" {...field} disabled={isEditing}/>
                      </form_1.FormControl>
                      <form_1.FormMessage />
                    </form_1.FormItem>)}/>
                <form_1.FormField control={userForm.control} name="full_name" render={({ field }) => (<form_1.FormItem>
                      <form_1.FormLabel>Full Name</form_1.FormLabel>
                      <form_1.FormControl>
                        <input_1.Input placeholder="John Smith" {...field}/>
                      </form_1.FormControl>
                      <form_1.FormMessage />
                    </form_1.FormItem>)}/>
                <form_1.FormField control={userForm.control} name="role" render={({ field }) => (<form_1.FormItem>
                      <form_1.FormLabel>Role</form_1.FormLabel>
                      <select_1.Select onValueChange={field.onChange} defaultValue={field.value}>
                        <form_1.FormControl>
                          <select_1.SelectTrigger>
                            <select_1.SelectValue placeholder="Select a role"/>
                          </select_1.SelectTrigger>
                        </form_1.FormControl>
                        <select_1.SelectContent>
                          <select_1.SelectItem value="admin">Admin</select_1.SelectItem>
                          <select_1.SelectItem value="manager">Manager</select_1.SelectItem>
                          <select_1.SelectItem value="employee">Employee</select_1.SelectItem>
                        </select_1.SelectContent>
                      </select_1.Select>
                      <form_1.FormMessage />
                    </form_1.FormItem>)}/>
                {!isEditing && (<form_1.FormField control={userForm.control} name="password" render={({ field }) => (<form_1.FormItem>
                        <form_1.FormLabel>Password</form_1.FormLabel>
                        <form_1.FormControl>
                          <input_1.Input type="password" placeholder="••••••••" {...field}/>
                        </form_1.FormControl>
                        <form_1.FormMessage />
                      </form_1.FormItem>)}/>)}
                <dialog_1.DialogFooter>
                  <button_1.Button type="submit">
                    {isEditing ? "Update User" : "Create User"}
                  </button_1.Button>
                </dialog_1.DialogFooter>
              </form>
            </form_1.Form>
          </dialog_1.DialogContent>
        </dialog_1.Dialog>
      </page_header_1.PageHeader>

      <div className="mb-4">
        <div className="relative">
          <lucide_react_1.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <input_1.Input placeholder="Search users..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
        </div>
      </div>

      <div className="rounded-md border">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>Name</table_1.TableHead>
              <table_1.TableHead>Email</table_1.TableHead>
              <table_1.TableHead>Role</table_1.TableHead>
              <table_1.TableHead className="text-right">Actions</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {filteredUsers.length === 0 ? (<table_1.TableRow>
                <table_1.TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </table_1.TableCell>
              </table_1.TableRow>) : (filteredUsers.map((user) => (<table_1.TableRow key={user.id}>
                  <table_1.TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <avatar_1.Avatar className="h-8 w-8">
                        <avatar_1.AvatarFallback>
                          {(0, utils_1.getInitials)(user.full_name)}
                        </avatar_1.AvatarFallback>
                      </avatar_1.Avatar>
                      {user.full_name}
                    </div>
                  </table_1.TableCell>
                  <table_1.TableCell>{user.email}</table_1.TableCell>
                  <table_1.TableCell>
                    <badge_1.Badge variant="outline" className={(0, utils_1.getUserRoleBadgeColor)(user.role)}>
                      {(0, utils_1.getUserRoleLabel)(user.role)}
                    </badge_1.Badge>
                  </table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    <dropdown_menu_1.DropdownMenu>
                      <dropdown_menu_1.DropdownMenuTrigger asChild>
                        <button_1.Button variant="ghost" size="sm">
                          <lucide_react_1.MoreHorizontal className="h-4 w-4"/>
                          <span className="sr-only">Open menu</span>
                        </button_1.Button>
                      </dropdown_menu_1.DropdownMenuTrigger>
                      <dropdown_menu_1.DropdownMenuContent align="end">
                        <dropdown_menu_1.DropdownMenuItem onClick={() => {
                setIsEditing(true);
                setSelectedUserId(user.id);
                setIsAddUserOpen(true);
            }}>
                          <lucide_react_1.Edit className="mr-2 h-4 w-4"/> Edit
                        </dropdown_menu_1.DropdownMenuItem>
                        <dropdown_menu_1.DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                          <lucide_react_1.Trash2 className="mr-2 h-4 w-4"/> Delete
                        </dropdown_menu_1.DropdownMenuItem>
                      </dropdown_menu_1.DropdownMenuContent>
                    </dropdown_menu_1.DropdownMenu>
                  </table_1.TableCell>
                </table_1.TableRow>)))}
          </table_1.TableBody>
        </table_1.Table>
      </div>
    </>);
}
