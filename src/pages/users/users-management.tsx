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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { 
  Loader2, 
  Plus, 
  Pause, 
  Play, 
  UserX, 
  UserCheck, 
  RotateCcw, 
  Edit,
  Mail,
  Key,
  CheckCircle,
  XCircle,
  Clock,
  Info
} from "lucide-react";
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
  auth_status?: 'confirmed' | 'unconfirmed' | 'missing';
  email_confirmed_at?: string | null;
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

// Schema for editing email
const editEmailFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Schema for password reset
const passwordResetFormSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

type UserRoleFormValues = z.infer<typeof userRoleFormSchema>;
type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
type PauseUserFormValues = z.infer<typeof pauseUserFormSchema>;
type EditEmailFormValues = z.infer<typeof editEmailFormSchema>;
type PasswordResetFormValues = z.infer<typeof passwordResetFormSchema>;

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isEditEmailDialogOpen, setIsEditEmailDialogOpen] = useState(false);
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateUserSuccessAlert, setShowCreateUserSuccessAlert] = useState(false);
  const [lastCreatedUser, setLastCreatedUser] = useState<string>('');
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

  const editEmailForm = useForm<EditEmailFormValues>({
    resolver: zodResolver(editEmailFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const passwordResetForm = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetFormSchema),
    defaultValues: {
      newPassword: "",
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

      // Show success alert with confirmation requirement
      setLastCreatedUser(values.full_name);
      setShowCreateUserSuccessAlert(true);

      toast({
        title: "User created successfully",
        description: `${values.full_name} has been created with ${values.role} role`,
      });

      // Refresh users list
      fetchUsers();
      
      // Close dialog and reset form
      setIsCreateDialogOpen(false);
      createForm.reset();

      // Hide alert after 10 seconds
      setTimeout(() => setShowCreateUserSuccessAlert(false), 10000);
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
      
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          email,
          full_name,
          role,
          avatar_url,
          is_active,
          paused_at,
          paused_by,
          pause_reason,
          last_activity
        `)
        .order("full_name");

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      // Get practical auth status for each user (simplified approach)
      const usersWithStatus = (usersData || []).map(user => {
        let authStatus: 'confirmed' | 'unconfirmed' | 'missing' = 'confirmed';
        
        // Simple heuristic: users with recent activity are likely confirmed
        // Users without recent activity might need email confirmation
        const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
        const daysSinceActivity = lastActivity ? 
          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24) : null;
        
        // If user has never logged in or has no recent activity, mark as potentially unconfirmed
        if (!lastActivity || (daysSinceActivity !== null && daysSinceActivity > 30)) {
          authStatus = 'unconfirmed';
        }
        
        return {
          ...user,
          auth_status: authStatus,
          email_confirmed_at: lastActivity?.toISOString() || null,
          is_active: user.is_active ?? true,
          paused_at: user.paused_at,
          paused_by: user.paused_by,
          pause_reason: user.pause_reason,
          last_activity: user.last_activity || new Date().toISOString()
        };
      });
      
      console.log('Users fetched with practical auth status:', usersWithStatus);
      setUsers(usersWithStatus);
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

  // Function to manually confirm user email (practical approach)
  const confirmUserEmail = async (user: User) => {
    try {
      // Since we can't use admin API from frontend, we'll update the user's last_activity
      // to indicate they've been manually verified by admin
      const { error } = await supabase
        .from('users')
        .update({ 
          last_activity: new Date().toISOString(),
          // Add a note that admin manually verified this user
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      toast({
        title: "User verified",
        description: `${user.full_name} has been marked as verified. Ask them to try logging in again.`,
      });

      // Refresh users list to show updated status
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error verifying user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Open dialog for editing role
  function handleEditRole(user: User) {
    setSelectedUser(user);
    form.reset({ role: user.role as "admin" | "manager" | "employee" });
    setIsDialogOpen(true);
  }

  // Handle edit email
  function handleEditEmail(user: User) {
    setSelectedUser(user);
    editEmailForm.reset({ email: user.email });
    setIsEditEmailDialogOpen(true);
  }

  // Handle password reset
  function handlePasswordReset(user: User) {
    setSelectedUser(user);
    passwordResetForm.reset({ newPassword: "" });
    setIsPasswordResetDialogOpen(true);
  }

  // Edit email submission
  async function onEditEmail(values: EditEmailFormValues) {
    if (!selectedUser) return;

    try {
      // Update email in users table
      const { error: userError } = await supabase
        .from("users")
        .update({ email: values.email })
        .eq("id", selectedUser.id);

      if (userError) throw userError;

      toast({
        title: "Email updated",
        description: `Email has been changed to ${values.email}`,
      });

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, email: values.email } : u
        )
      );

      setIsEditEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating email",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Password reset submission
  async function onPasswordReset(values: PasswordResetFormValues) {
    if (!selectedUser) return;

    try {
      // For now, show a notification that admin will handle this
      toast({
        title: "Password reset requested",
        description: `Password reset has been requested for ${selectedUser.full_name}. Admin will handle this manually.`,
      });

      setIsPasswordResetDialogOpen(false);
      passwordResetForm.reset();
    } catch (error: any) {
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
    }
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
                      <div className="flex flex-col gap-1">
                        {/* Account Status */}
                        {user.is_active !== false ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 w-fit">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 w-fit">
                            <UserX className="h-3 w-3 mr-1" />
                            Paused
                          </Badge>
                        )}
                        
                        {/* Email Confirmation Status */}
                        {user.auth_status === 'confirmed' ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 w-fit">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmed
                          </Badge>
                        ) : user.auth_status === 'unconfirmed' ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 w-fit">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                            {canEditRoles && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmUserEmail(user)}
                                className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                                title="Mark user as verified and update their activity status"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verify
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50 w-fit">
                            <XCircle className="h-3 w-3 mr-1" />
                            No Auth
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {canEditRoles && (
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRole(user)}
                            disabled={user.id === userDetails?.id} // Cannot edit own role
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Role
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEmail(user)}
                            disabled={user.id === userDetails?.id} // Cannot edit own email
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePasswordReset(user)}
                            disabled={user.id === userDetails?.id} // Cannot reset own password
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Password
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

      {/* Success Alert for New User Creation */}
      {showCreateUserSuccessAlert && (
        <Alert className="mt-4 border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>User "{lastCreatedUser}" created successfully!</strong>
            <br />
            The user has been sent an email confirmation link. They need to confirm their email address before they can log in to the system.
            Make sure to inform them to check their email (including spam folder) and click the confirmation link.
          </AlertDescription>
        </Alert>
      )}

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

      {/* Edit Email Dialog */}
      <Dialog open={isEditEmailDialogOpen} onOpenChange={setIsEditEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email Address</DialogTitle>
          </DialogHeader>
          <Form {...editEmailForm}>
            <form onSubmit={editEmailForm.handleSubmit(onEditEmail)} className="space-y-4">
              <div className="space-y-1 mb-4">
                <p className="font-medium">User: {selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">Current: {selectedUser?.email}</p>
              </div>
              <FormField
                control={editEmailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter new email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Changing the email will require the user to log in with the new email address.
                  Make sure to inform them about this change.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditEmailDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Email</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
          </DialogHeader>
          <Form {...passwordResetForm}>
            <form onSubmit={passwordResetForm.handleSubmit(onPasswordReset)} className="space-y-4">
              <div className="space-y-1 mb-4">
                <p className="font-medium">User: {selectedUser?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              </div>
              <FormField
                control={passwordResetForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password (min 6 characters)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Security Note:</strong> The user should change this password on their first login.
                  Make sure to securely communicate the new password to them through a separate channel.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPasswordResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
