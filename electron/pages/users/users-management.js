"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsersManagement;
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
    return (<div className="container py-6">
      <page_header_1.PageHeader title="User Management" subtitle="Manage users and their roles"/>

      <card_1.Card className="mt-6">
        <card_1.CardHeader>
          <card_1.CardTitle>Users</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          {loading ? (<div className="flex justify-center p-8">
              <lucide_react_1.Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
            </div>) : users.length === 0 ? (<div className="flex justify-center p-8 text-muted-foreground">
              No users found
            </div>) : (<table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Name</table_1.TableHead>
                  <table_1.TableHead>Email</table_1.TableHead>
                  <table_1.TableHead>Role</table_1.TableHead>
                  {canEditRoles && <table_1.TableHead className="w-[100px]">Actions</table_1.TableHead>}
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {users.map((user) => (<table_1.TableRow key={user.id}>
                    <table_1.TableCell className="font-medium">{user.full_name}</table_1.TableCell>
                    <table_1.TableCell>{user.email}</table_1.TableCell>
                    <table_1.TableCell>
                      <span className={`capitalize ${user.role === "admin"
                    ? "text-destructive font-semibold"
                    : user.role === "manager"
                        ? "text-orange-500 font-semibold"
                        : ""}`}>
                        {user.role}
                      </span>
                    </table_1.TableCell>
                    {canEditRoles && (<table_1.TableCell>
                        <button_1.Button variant="outline" size="sm" onClick={() => handleEditRole(user)} disabled={user.id === userDetails?.id} // Cannot edit own role
                >
                          Change Role
                        </button_1.Button>
                      </table_1.TableCell>)}
                  </table_1.TableRow>))}
              </table_1.TableBody>
            </table_1.Table>)}
        </card_1.CardContent>
      </card_1.Card>

      <dialog_1.Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>Change User Role</dialog_1.DialogTitle>
          </dialog_1.DialogHeader>
          <form_1.Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1 mb-4">
                <p className="font-medium">User: {selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              </div>
              <form_1.FormField control={form.control} name="role" render={({ field }) => (<form_1.FormItem>
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
              <dialog_1.DialogFooter>
                <button_1.Button type="submit">Update Role</button_1.Button>
              </dialog_1.DialogFooter>
            </form>
          </form_1.Form>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
