import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { Pause, Play, Trash2, User, Users, Clock } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  paused_at: string | null;
  paused_by: string | null;
  pause_reason: string | null;
  last_activity: string | null;
  salary_amount: number | null;
}

const UsersPage: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const { toast } = useToast();
  const { user, userDetails } = useAuth();

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
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
          last_activity,
          salary_amount
        `)
        .order("full_name");

      if (error) {
        throw error;
      }

      // Convert the data to match our User interface, handling null is_active values
      const users = (data || []).map(user => ({
        ...user,
        is_active: user.is_active ?? true // Default to true if null
      }));
      
      setActiveUsers(users.filter(u => u.is_active));
      setInactiveUsers(users.filter(u => !u.is_active));
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Role color mapping
  const getRoleBadgeVariant = (role: string) => {
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
  const handleDeleteClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", selectedUserId);

      if (error) {
        throw error;
      }

      await fetchUsers(); // Refresh the list
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  // Pause user handling
  const handlePauseClick = (userId: string) => {
    setSelectedUserId(userId);
    setPauseReason("");
    setIsPauseDialogOpen(true);
  };

  const handlePauseUser = async () => {
    if (!selectedUserId || !userDetails?.id) return;

    try {
      const { error } = await supabase.rpc('pause_user', {
        target_user_id: selectedUserId,
        admin_user_id: userDetails.id,
        reason: pauseReason || 'Administrative action'
      });

      if (error) {
        throw error;
      }

      await fetchUsers(); // Refresh the list
      toast({
        title: "User paused",
        description: "The user has been successfully paused.",
      });
    } catch (error: any) {
      console.error("Error pausing user:", error);
      toast({
        title: "Error pausing user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPauseDialogOpen(false);
      setSelectedUserId(null);
      setPauseReason("");
    }
  };

  // Unpause user handling
  const handleUnpauseUser = async (userId: string) => {
    if (!userDetails?.id) return;

    try {
      const { error } = await supabase.rpc('unpause_user', {
        target_user_id: userId,
        admin_user_id: userDetails.id
      });

      if (error) {
        throw error;
      }

      await fetchUsers(); // Refresh the list
      toast({
        title: "User activated",
        description: "The user has been successfully activated.",
      });
    } catch (error: any) {
      console.error("Error activating user:", error);
      toast({
        title: "Error activating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Check if current user is admin
  const canManageUsers = userDetails?.role === "admin";

  const renderUserTable = (users: User[], isActive: boolean) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Salary</TableHead>
            {!isActive && <TableHead>Paused Info</TableHead>}
            <TableHead>Last Activity</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.full_name || 'No Name'}
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {user.salary_amount ? `$${user.salary_amount.toLocaleString()}/mo` : 'Not set'}
              </TableCell>
              {!isActive && (
                <TableCell>
                  <div className="text-sm">
                    <div className="text-red-600 font-medium">
                      Paused {user.paused_at ? format(new Date(user.paused_at), 'MMM dd, yyyy') : ''}
                    </div>
                    {user.pause_reason && (
                      <div className="text-gray-500 text-xs mt-1">
                        Reason: {user.pause_reason}
                      </div>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell>
                {user.last_activity ? (
                  <div className="text-sm text-gray-500">
                    {format(new Date(user.last_activity), 'MMM dd, HH:mm')}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">Never</div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  {canManageUsers && (
                    <>
                      {isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePauseClick(user.id)}
                          disabled={user.id === userDetails?.id}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnpauseUser(user.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(user.id)}
                        disabled={user.id === userDetails?.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <PageHeader 
        title="User Management" 
        subtitle="Manage employee accounts, pause inactive users, and control access." 
      />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Management
            </CardTitle>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{activeUsers.length} Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>{inactiveUsers.length} Paused</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Loading users...</p>
              </div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active" className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Active Users ({activeUsers.length})
                </TabsTrigger>
                <TabsTrigger value="inactive" className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Paused Users ({inactiveUsers.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-6">
                {activeUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No active users found
                  </div>
                ) : (
                  renderUserTable(activeUsers, true)
                )}
              </TabsContent>
              <TabsContent value="inactive" className="mt-6">
                {inactiveUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No paused users found
                  </div>
                ) : (
                  renderUserTable(inactiveUsers, false)
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause User Dialog */}
      <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pause User Account</DialogTitle>
            <DialogDescription>
              This will deactivate the user account and prevent them from accessing the system.
              You can reactivate them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pause-reason">Reason for pausing (optional)</Label>
              <Textarea
                id="pause-reason"
                placeholder="e.g., Employee on leave, Performance review, etc."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPauseDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handlePauseUser} className="text-orange-600">
              <Pause className="h-4 w-4 mr-1" />
              Pause User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersPage;
