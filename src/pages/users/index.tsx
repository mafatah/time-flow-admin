
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Pencil, Trash2, Eye, BarChart3 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/providers/auth-provider";
import { differenceInMinutes, format, startOfWeek, endOfWeek } from "date-fns";

// Form schema for creating/editing users
const userFormSchema = z.object({
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  role: z.enum(["admin", "manager", "employee"], { message: "Please select a role" }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url?: string;
}

interface UserStats {
  totalHours: number;
  weeklyHours: number;
  activeTasks: number;
  screenshots: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "employee",
    },
  });

  // Check if current user can manage users
  const canManageUsers = userDetails?.role === 'admin' || userDetails?.role === 'manager';

  // Fetch users
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order('full_name');

        if (error) throw error;
        setUsers(data || []);
      } catch (error: any) {
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

  // Fetch user statistics
  async function fetchUserStats(userId: string) {
    if (!userId) return;
    
    try {
      setStatsLoading(true);
      const startOfThisWeek = startOfWeek(new Date());
      const endOfThisWeek = endOfWeek(new Date());

      // Get time logs for total hours
      const { data: timeLogs, error: timeLogsError } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId);

      if (timeLogsError) throw timeLogsError;

      // Get weekly time logs
      const { data: weeklyLogs, error: weeklyError } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", startOfThisWeek.toISOString())
        .lte("start_time", endOfThisWeek.toISOString());

      if (weeklyError) throw weeklyError;

      // Get active tasks count
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("id")
        .eq("user_id", userId);

      if (tasksError) throw tasksError;

      // Get screenshots count
      const { data: screenshots, error: screenshotsError } = await supabase
        .from("screenshots")
        .select("id")
        .eq("user_id", userId);

      if (screenshotsError) throw screenshotsError;

      // Calculate total hours
      let totalHours = 0;
      timeLogs?.forEach((log) => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const durationMinutes = differenceInMinutes(endTime, startTime);
        totalHours += durationMinutes / 60;
      });

      // Calculate weekly hours
      let weeklyHours = 0;
      weeklyLogs?.forEach((log) => {
        const startTime = new Date(log.start_time);
        const endTime = log.end_time ? new Date(log.end_time) : new Date();
        const durationMinutes = differenceInMinutes(endTime, startTime);
        weeklyHours += durationMinutes / 60;
      });

      setUserStats({
        totalHours,
        weeklyHours,
        activeTasks: tasks?.length || 0,
        screenshots: screenshots?.length || 0,
      });
    } catch (error: any) {
      toast({
        title: "Error fetching user statistics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStatsLoading(false);
    }
  }

  // Handle form submission
  async function onSubmit(values: UserFormValues) {
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from("users")
          .update({
            full_name: values.full_name,
            email: values.email,
            role: values.role,
          })
          .eq("id", editingUser.id);

        if (error) throw error;

        toast({
          title: "User updated",
          description: "The user has been updated successfully",
        });

        // Update local state
        setUsers(
          users.map((u) =>
            u.id === editingUser.id ? { ...u, ...values } : u
          )
        );
      } else {
        toast({
          title: "User creation not supported",
          description: "Please use Supabase Auth to create new users",
          variant: "destructive",
        });
      }

      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Handle delete user
  async function handleDeleteUser(id: string) {
    if (!id) return;
    
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });

      // Remove from local state
      setUsers(users.filter((u) => u.id !== id));
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Open dialog for editing
  function handleEditUser(user: User) {
    setEditingUser(user);
    form.reset({
      full_name: user.full_name,
      email: user.email,
      role: user.role as "admin" | "manager" | "employee",
    });
    setIsDialogOpen(true);
  }

  // View user stats
  function handleViewUserStats(userId: string) {
    setSelectedUserId(userId);
    fetchUserStats(userId);
  }

  return (
    <div className="container py-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users and view their activity"
      />

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewUserStats(user.id)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            {canManageUsers && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete user</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{user.full_name}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedUserId ? (
                <p className="text-muted-foreground text-sm">
                  Select a user to view their statistics
                </p>
              ) : statsLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : userStats ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Total Hours</p>
                    <p className="text-2xl font-bold">{userStats.totalHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">This Week</p>
                    <p className="text-2xl font-bold">{userStats.weeklyHours.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Tasks</p>
                    <p className="text-2xl font-bold">{userStats.activeTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Screenshots</p>
                    <p className="text-2xl font-bold">{userStats.screenshots}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No statistics available for this user
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
