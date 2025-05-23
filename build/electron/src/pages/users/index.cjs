"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const card_1 = require("@/components/ui/card");
const table_1 = require("@/components/ui/table");
const dialog_1 = require("@/components/ui/dialog");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const page_header_1 = require("@/components/layout/page-header");
const use_toast_1 = require("@/components/ui/use-toast");
const auth_provider_1 = require("@/providers/auth-provider");
const supabase_1 = require("@/lib/supabase");
const UsersPage = () => {
    const [users, setUsers] = (0, react_1.useState)([]);
    const [selectedUserId, setSelectedUserId] = (0, react_1.useState)(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const { toast } = (0, use_toast_1.useToast)();
    const { user, userDetails } = (0, auth_provider_1.useAuth)();
    // Fetch users
    (0, react_1.useEffect)(() => {
        fetchUsers();
    }, []);
    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase_1.supabase
                .from("users")
                .select("*")
                .order("full_name");
            if (error) {
                throw error;
            }
            setUsers(data || []);
        }
        catch (error) {
            console.error("Error fetching users:", error);
            toast({
                title: "Error fetching users",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    // Role color mapping
    const getRoleBadgeVariant = (role) => {
        switch (role.toLowerCase()) {
            case "admin":
                return "destructive";
            case "manager":
                return "default";
            default:
                return "secondary";
        }
    };
    // Delete user handling
    const handleDeleteClick = (userId) => {
        setSelectedUserId(userId);
        setIsDeleteDialogOpen(true);
    };
    const handleDeleteUser = async () => {
        if (!selectedUserId)
            return;
        try {
            const { error } = await supabase_1.supabase
                .from("users")
                .delete()
                .eq("id", selectedUserId);
            if (error) {
                throw error;
            }
            setUsers(users.filter((user) => user.id !== selectedUserId));
            toast({
                title: "User deleted",
                description: "The user has been successfully deleted.",
            });
        }
        catch (error) {
            console.error("Error deleting user:", error);
            toast({
                title: "Error deleting user",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setIsDeleteDialogOpen(false);
            setSelectedUserId(null);
        }
    };
    // Check if current user is admin
    const canDeleteUsers = userDetails?.role === "admin";
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(page_header_1.PageHeader, { title: "Users", subtitle: "Manage users and access roles." }), (0, jsx_runtime_1.jsxs)(card_1.Card, { children: [(0, jsx_runtime_1.jsx)(card_1.CardHeader, { children: (0, jsx_runtime_1.jsx)(card_1.CardTitle, { children: "Users List" }) }), (0, jsx_runtime_1.jsx)(card_1.CardContent, { children: isLoading ? ((0, jsx_runtime_1.jsx)("div", { children: "Loading users..." })) : ((0, jsx_runtime_1.jsx)("div", { className: "rounded-md border", children: (0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHead, { className: "w-[100px]", children: "ID" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Full Name" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Email" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { children: "Role" }), (0, jsx_runtime_1.jsx)(table_1.TableHead, { className: "text-right", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { children: users.map((user) => ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "font-medium", children: user.id }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: user.full_name }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: user.email }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { children: (0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: getRoleBadgeVariant(user.role), children: user.role }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "text-right", children: canDeleteUsers ? ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: () => handleDeleteClick(user.id), disabled: user.id === userDetails?.id, children: "Delete" })) : ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "sm", disabled: true, children: "Delete" })) })] }, user.id))) })] }) })) })] }), (0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: isDeleteDialogOpen, onOpenChange: setIsDeleteDialogOpen, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "sm:max-w-[425px]", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Delete User" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "Are you sure you want to delete this user? This action cannot be undone." })] }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "secondary", onClick: () => setIsDeleteDialogOpen(false), children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "destructive", onClick: handleDeleteUser, children: "Delete" })] })] }) })] }));
};
exports.default = UsersPage;
