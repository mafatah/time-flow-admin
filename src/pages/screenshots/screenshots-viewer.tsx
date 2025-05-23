import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, User, Clock, Image as ImageIcon } from "lucide-react";
import { format, startOfDay, endOfDay, isToday, isYesterday, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/auth-provider";

interface ScreenshotWithRelations {
  id: string;
  user_id: string;
  task_id: string;
  image_url: string;
  captured_at: string;
  users?: {
    id: string;
    full_name: string;
    email: string;
  };
  tasks?: {
    id: string;
    name: string;
    projects?: {
      id: string;
      name: string;
    };
  };
}

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<ScreenshotWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showingCalendar, setShowingCalendar] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ScreenshotWithRelations | null>(null);
  const { toast } = useToast();
  const { userDetails } = useAuth();

  // Fetch screenshots
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Calculate date range for the selected day
        const startDate = startOfDay(selectedDate);
        const endDate = endOfDay(selectedDate);
        
        // Build query for screenshots - simplified first
        let query = supabase
          .from("screenshots")
          .select(`
            id,
            user_id,
            task_id,
            image_url,
            captured_at
          `)
          .gte('captured_at', startDate.toISOString())
          .lte('captured_at', endDate.toISOString());
          
        // Add filters if needed
        if (selectedUser) {
          query = query.eq('user_id', selectedUser);
        } else if (userDetails?.role === 'employee') {
          // Employees can only see their own screenshots
          query = query.eq('user_id', userDetails.id);
        }
        
        if (selectedTask) {
          query = query.eq('task_id', selectedTask);
        }
        
        const { data, error } = await query.order('captured_at', { ascending: false });

        if (error) {
          console.error('Screenshot query error:', error);
          throw error;
        }
        
        console.log('Screenshots data:', data);
        setScreenshots((data as any) || []);
        
        // Fetch users if admin or manager
        if (userDetails?.role === 'admin' || userDetails?.role === 'manager') {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .order('full_name');
            
          if (usersError) throw usersError;
          setUsers(usersData || []);
        }
        
        // Fetch tasks
        let tasksQuery = supabase
          .from("tasks")
          .select(`
            id, 
            name,
            projects(id, name)
          `);
          
        if (userDetails?.role === 'employee') {
          tasksQuery = tasksQuery.eq('user_id', userDetails.id);
        } else if (selectedUser) {
          tasksQuery = tasksQuery.eq('user_id', selectedUser);
        }
        
        const { data: tasksData, error: tasksError } = await tasksQuery.order('name');
        
        if (tasksError) throw tasksError;
        setTasks(tasksData || []);
        
      } catch (error: any) {
        toast({
          title: "Error fetching screenshots",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast, selectedDate, selectedUser, selectedTask, userDetails]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowingCalendar(false);
    }
  };

  return (
    <div className="container py-6">
      <PageHeader
        title="Screenshots Viewer"
        subtitle="View screenshots taken by the desktop app"
      />

      <div className="flex flex-col md:flex-row gap-4 mt-6 mb-4">
        {/* Date Selector */}
        <Popover open={showingCalendar} onOpenChange={setShowingCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full md:w-auto justify-start">
              <Calendar className="mr-2 h-4 w-4" />
              {isToday(selectedDate) ? "Today" : isYesterday(selectedDate) ? "Yesterday" : format(selectedDate, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarUI
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* User Filter - only for admin/manager */}
        {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (
          <Select
            value={selectedUser || ''}
            onValueChange={value => setSelectedUser(value || null)}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Users" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Task Filter */}
        <Select
          value={selectedTask || ''}
          onValueChange={value => setSelectedTask(value || null)}
        >
          <SelectTrigger className="w-full md:w-[220px]">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Tasks" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tasks</SelectItem>
            {tasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.projects?.name} - {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No screenshots found for the selected date</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="relative border rounded-md overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedImage(screenshot)}
                >
                  <img
                    src={screenshot.image_url}
                    alt="Screenshot"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                    <div className="font-medium truncate">
                      {screenshot.tasks?.projects?.name} - {screenshot.tasks?.name}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>{formatDate(screenshot.captured_at)}</span>
                      {(userDetails?.role === 'admin' || userDetails?.role === 'manager') && (
                        <span className="truncate max-w-[120px]">{screenshot.users?.full_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Screenshot - {selectedImage?.tasks?.projects?.name} - {selectedImage?.tasks?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span>{selectedImage && formatDate(selectedImage.captured_at)}</span>
              {selectedImage?.users && <span>User: {selectedImage.users.full_name}</span>}
            </div>
            <div className="border rounded-md overflow-hidden">
              {selectedImage && (
                <img
                  src={selectedImage.image_url}
                  alt="Screenshot"
                  className="w-full h-auto"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
