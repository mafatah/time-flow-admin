
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";

// Define the User type based on actual database columns
type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  idle_timeout_minutes: number | null;
  offline_tracking_enabled: boolean | null;
  pause_allowed: boolean | null;
  custom_screenshot_interval_seconds: number | null;
};

// Form schema
const userRoleFormSchema = z.object({
  role: z.enum(["admin", "manager", "employee"], {
    required_error: "Please select a role",
  }),
});

type UserRoleFormValues = z.infer<typeof userRoleFormSchema>;

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  const form = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleFormSchema),
    defaultValues: {
      role: "employee",
    },
  });

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            email,
            full_name,
            role,
            avatar_url,
            idle_timeout_minutes,
            offline_tracking_enabled,
            pause_allowed,
            custom_screenshot_interval_seconds
          `)
          .order("full_name");

        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error fetching users",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [toast]);

  // Handle form submission
  async function onSubmit(values: UserRoleFormValues) {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ role: values.role })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `User role has been changed to ${values.role}`,
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, role: values.role } : u
        )
      );

      // Close dialog
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Open dialog for editing role
  function handleEditRole(user: User) {
    setSelectedUser(user);
    form.reset({ role: user.role as "admin" | "manager" | "employee" });
    setIsDialogOpen(true);
  }

  // Check if current user can edit roles (must be admin)
  const canEditRoles = userDetails?.role === "admin";

  return (
    <div className="container py-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users and their roles"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {canEditRoles && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`capitalize ${
                        user.role === "admin" 
                          ? "text-destructive font-semibold" 
                          : user.role === "manager" 
                            ? "text-orange-500 font-semibold" 
                            : ""
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    {canEditRoles && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(user)}
                          disabled={user.id === userDetails?.id} // Cannot edit own role
                        >
                          Change Role
                        </Button>
                      </TableCell>
                    )}
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
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1 mb-4">
                <p className="font-medium">User: {selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              </div>
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Update Role</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
