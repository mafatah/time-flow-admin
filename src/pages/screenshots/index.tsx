
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/layout/loading";
import { ErrorMessage } from "@/components/layout/error-message";
import { formatDate } from "@/lib/utils";
import { CalendarIcon, Search, Image, Download } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

interface Screenshot {
  id: string;
  user: {
    full_name: string;
    email: string;
  };
  task: {
    name: string;
  };
  image_url: string;
  captured_at: string;
}

export default function ScreenshotsPage() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const { toast } = useToast();
  
  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .order("full_name");
        
      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error loading users",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }
      
      return data;
    }
  });
  
  // Fetch screenshots with user and task details
  const { 
    data: screenshots = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ["screenshots", selectedDate, selectedUserId],
    queryFn: async () => {
      try {
        // Build the query based on filters
        let query = supabase
          .from("screenshots")
          .select(`
            id,
            image_url,
            captured_at,
            user_id,
            task_id
          `);
          
        // Apply user filter if selected
        if (selectedUserId) {
          query = query.eq("user_id", selectedUserId);
        }
        
        // Apply date filter if selected
        if (selectedDate) {
          const startDate = startOfDay(selectedDate).toISOString();
          const endDate = endOfDay(selectedDate).toISOString();
          query = query.gte("captured_at", startDate).lte("captured_at", endDate);
        }
        
        const { data: screenshotsData, error: screenshotsError } = await query.order("captured_at", { ascending: false });
        
        if (screenshotsError) throw screenshotsError;
        
        if (!screenshotsData || screenshotsData.length === 0) {
          return [];
        }
        
        // Get users info
        const userIds = [...new Set(screenshotsData.map(s => s.user_id))];
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email")
          .in("id", userIds);
          
        if (usersError) throw usersError;
        
        // Get tasks info
        const taskIds = [...new Set(screenshotsData.map(s => s.task_id))];
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("id, name")
          .in("id", taskIds);
          
        if (tasksError) throw tasksError;
        
        const usersMap = new Map(usersData.map(user => [user.id, user]));
        const tasksMap = new Map(tasksData.map(task => [task.id, task]));
        
        // Combine all data
        const screenshotsWithDetails: Screenshot[] = screenshotsData.map(screenshot => {
          const user = usersMap.get(screenshot.user_id);
          const task = tasksMap.get(screenshot.task_id);
          
          return {
            ...screenshot,
            user: {
              full_name: user?.full_name || "Unknown User",
              email: user?.email || "unknown@example.com"
            },
            task: {
              name: task?.name || "Unknown Task"
            }
          };
        });
        
        return screenshotsWithDetails;
      } catch (err: any) {
        console.error("Error fetching screenshots:", err);
        toast({
          title: "Error loading screenshots",
          description: err.message,
          variant: "destructive"
        });
        return [];
      }
    }
  });

  const filteredScreenshots = screenshots.filter((screenshot) => {
    const matchesSearch = searchQuery
      ? screenshot.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenshot.task.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesSearch;
  });

  if (isLoading) return <Loading message="Loading screenshots..." />;
  if (error) return <ErrorMessage message={(error as Error).message} />;

  return (
    <>
      <PageHeader 
        title="Screenshots" 
        subtitle="View employee screenshots captured during work hours"
      />

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search screenshots..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Showing {filteredScreenshots.length} screenshots
            </p>
          </div>
          <div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {filteredScreenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/40 rounded-lg">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Screenshots Found</h3>
          <p className="text-muted-foreground mt-1">
            No screenshots match your current filters.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setSelectedUserId("");
            setSelectedDate(new Date());
            setSearchQuery("");
          }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredScreenshots.map((screenshot) => (
            <Card 
              key={screenshot.id}
              className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(screenshot)}
            >
              <CardContent className="p-0">
                <div className="aspect-video relative">
                  <img
                    src={screenshot.image_url}
                    alt={`Screenshot by ${screenshot.user.full_name}`}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="p-3 bg-card">
                  <p className="font-medium truncate">{screenshot.user.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {screenshot.task.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(screenshot.captured_at, "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot Details</DialogTitle>
            <DialogDescription>
              Captured on {selectedImage && formatDate(selectedImage.captured_at, "PPP p")}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-md border">
                <img 
                  src={selectedImage.image_url} 
                  alt={`Screenshot by ${selectedImage.user.full_name}`}
                  className="w-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">User</p>
                  <p className="text-sm">{selectedImage.user.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Task</p>
                  <p className="text-sm">{selectedImage.task.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Capture Time</p>
                  <p className="text-sm">{formatDate(selectedImage.captured_at, "PPP p")}</p>
                </div>
                <div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
