import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Pause, Play, UserX, UserCheck } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/providers/auth-provider";

// Define the User type based on actual database columns
type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  is_active?: boolean;
  paused_at?: string | null;
  paused_by?: string | null;
  pause_reason?: string | null;
  last_activity?: string | null;
};

// Form schema
const userRoleFormSchema = z.object({
  role: z.enum(["admin", "manager", "employee"], {
    required_error: "Please select a role",
  }),
});

// Schema for creating new user
const createUserFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "manager", "employee"], {
    required_error: "Please select a role",
  }),
});

// Schema for pausing user
const pauseUserFormSchema = z.object({
  reason: z.string().min(1, "Please provide a reason for pausing the user"),
});

type UserRoleFormValues = z.infer<typeof userRoleFormSchema>;
type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type PauseUserFormValues = z.infer<typeof pauseUserFormSchema>;

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  const form = useForm<UserRoleFormValues>({
    resolver: zodResolver(userRoleFormSchema),
    defaultValues: {
      role: "employee",
    },
  });

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      role: "employee",
    },
  });

  const pauseForm = useForm<PauseUserFormValues>({
    resolver: zodResolver(pauseUserFormSchema),
    defaultValues: {
      reason: "",
    },
  });

  // Fetch users
  useEffect(() => {
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

  // Handle creating new user
  async function onCreateUser(values: CreateUserFormValues) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            role: values.role
          }
        }
      });

      if (authError) throw authError;

      toast({
        title: "User created successfully",
        description: `${values.full_name} has been created with ${values.role} role`,
      });

      // Refresh users list
      fetchUsers();
      
      // Close dialog and reset form
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Fetch users function (extracted from useEffect)
  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url
        `)
        .order("full_name");

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      console.log('Users fetched:', data);
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
  };

  // Open dialog for editing role
  function handleEditRole(user: User) {
    setSelectedUser(user);
    form.reset({ role: user.role as "admin" | "manager" | "employee" });
    setIsDialogOpen(true);
  }

  // Handle pausing user
  async function handlePauseUser(user: User) {
    setSelectedUser(user);
    pauseForm.reset({ reason: "" });
    setIsPauseDialogOpen(true);
  }

  // Handle pausing/unpausing user
  async function onPauseUser(values: PauseUserFormValues) {
    if (!selectedUser) return;

    try {
      // Use a direct SQL update to pause the user
      const { error } = await supabase
        .from("users")
        .update({
          // Cast the object to any to bypass TypeScript checking
          ...(({
            is_active: false,
            paused_at: new Date().toISOString(),
            paused_by: userDetails?.id,
            pause_reason: values.reason,
          } as any))
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "User paused",
        description: `${selectedUser.full_name} has been paused successfully`,
      });

      // Refresh users list
      fetchUsers();
      setIsPauseDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error pausing user",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Handle unpausing user
  async function handleUnpauseUser(user: User) {
    try {
      // Use a direct SQL update to unpause the user
      const { error } = await supabase
        .from("users")
        .update({
          // Cast the object to any to bypass TypeScript checking
          ...(({
            is_active: true,
            paused_at: null,
            paused_by: null,
            pause_reason: null,
            last_activity: new Date().toISOString(),
          } as any))
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "User unpaused",
        description: `${user.full_name} has been reactivated successfully`,
      });

      // Refresh users list
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error unpausing user",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <div className="flex justify-between items-center">
            <CardTitle>Users</CardTitle>
            {canEditRoles && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            )}
          </div>
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
                  <TableHead>Status</TableHead>
                  {canEditRoles && <TableHead className="w-[200px]">Actions</TableHead>}
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
                    <TableCell>
                      {user.is_active !== false ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4 text-red-600" />
                          <span className="text-red-600 font-medium">Paused</span>
                          {user.pause_reason && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({user.pause_reason})
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {canEditRoles && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                            disabled={user.id === userDetails?.id} // Cannot edit own role
                          >
                            Change Role
                          </Button>
                          {user.is_active !== false ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePauseUser(user)}
                              disabled={user.id === userDetails?.id} // Cannot pause own account
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnpauseUser(user)}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Unpause
                            </Button>
                          )}
                        </div>
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

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
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
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Pause User Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause User Account</DialogTitle>
          </DialogHeader>
          <Form {...pauseForm}>
            <form onSubmit={pauseForm.handleSubmit(onPauseUser)} className="space-y-4">
              <div className="space-y-1 mb-4">
                <p className="font-medium">User: {selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ This will prevent the user from logging in and stop all time tracking activities.
                </p>
              </div>
              <FormField
                control={pauseForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for pausing</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Employee left the company, On leave, etc." 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsPauseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="destructive"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
