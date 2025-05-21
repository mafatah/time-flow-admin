
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/layout/loading";
import { ErrorMessage } from "@/components/layout/error-message";
import { getInitials, getUserRoleLabel, getUserRoleBadgeColor } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { UserPlus, MoreHorizontal, Search, UserX, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const userFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  full_name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.string().refine(val => ['admin', 'manager', 'employee'].includes(val), {
    message: "Please select a valid role"
  }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional()
});

export default function UsersPage() {
  const { userDetails } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<Tables<"users">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const userForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      full_name: "",
      role: "employee",
      password: ""
    }
  });

  useEffect(() => {
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

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        
        // Only fetch users if current user is admin or manager
        if (userDetails?.role !== 'admin' && userDetails?.role !== 'manager') {
          setError("You don't have permission to view users");
          return;
        }
        
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("full_name");
        
        if (error) throw error;
        
        setUsers(data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again later.");
        toast({
          title: "Error",
          description: err.message || "Failed to load users",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [userDetails, toast]);

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleAddUser(values: z.infer<typeof userFormSchema>) {
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
        const { error } = await supabase
          .from("users")
          .update({
            full_name: values.full_name,
            role: values.role
          })
          .eq("id", selectedUserId);
        
        if (error) throw error;
        
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === selectedUserId 
            ? { ...user, full_name: values.full_name, role: values.role }
            : user
        ));
        
        toast({
          title: "Success",
          description: "User updated successfully"
        });
      } else {
        // Create new user
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password!,
          options: {
            data: {
              full_name: values.full_name,
              role: values.role
            }
          }
        });
        
        if (error) throw error;
        
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
      
    } catch (err: any) {
      console.error("Error managing user:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to manage user",
        variant: "destructive"
      });
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      if (!confirm("Are you sure you want to delete this user?")) {
        return;
      }
      
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);
      
      if (error) throw error;
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  }

  if (loading) return <Loading message="Loading users..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <>
      <PageHeader 
        title="Users" 
        subtitle="Manage and monitor your team members"
      >
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setIsEditing(false);
              setSelectedUserId(null);
              userForm.reset({
                email: "",
                full_name: "",
                role: "employee",
                password: ""
              });
            }}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
              <DialogDescription>
                {isEditing 
                  ? "Update user details below." 
                  : "Fill in the details to create a new user account."}
              </DialogDescription>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(handleAddUser)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="user@example.com" 
                          {...field} 
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
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
                {!isEditing && (
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <DialogFooter>
                  <Button type="submit">
                    {isEditing ? "Update User" : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {user.full_name}
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getUserRoleBadgeColor(user.role)}
                    >
                      {getUserRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setIsEditing(true);
                          setSelectedUserId(user.id);
                          setIsAddUserOpen(true);
                        }}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
