
import { useState, useEffect } from "react";
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
import { Tables } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { CalendarIcon, Search, Image, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Screenshot extends Tables<"screenshots"> {
  user: {
    full_name: string;
    email: string;
  };
  task: {
    name: string;
  };
}

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // In a real app, we would fetch real data from Supabase
        // For this demo, we're using mock data
        const mockUsers = [
          { id: "1", full_name: "Admin User" },
          { id: "2", full_name: "Manager User" },
          { id: "3", full_name: "Employee One" },
          { id: "4", full_name: "Employee Two" },
          { id: "5", full_name: "Second Manager" },
        ];
        
        const mockScreenshots: Screenshot[] = [
          {
            id: "1",
            user_id: "3",
            task_id: "1",
            image_url: "https://placehold.co/600x400?text=Work+Screenshot+1",
            captured_at: "2023-07-15T09:30:00Z",
            user: {
              full_name: "Employee One",
              email: "employee1@example.com"
            },
            task: {
              name: "Frontend Development"
            }
          },
          {
            id: "2",
            user_id: "3",
            task_id: "1",
            image_url: "https://placehold.co/600x400?text=Work+Screenshot+2",
            captured_at: "2023-07-15T10:15:00Z",
            user: {
              full_name: "Employee One",
              email: "employee1@example.com"
            },
            task: {
              name: "Frontend Development"
            }
          },
          {
            id: "3",
            user_id: "4",
            task_id: "2",
            image_url: "https://placehold.co/600x400?text=Work+Screenshot+3",
            captured_at: "2023-07-15T09:45:00Z",
            user: {
              full_name: "Employee Two",
              email: "employee2@example.com"
            },
            task: {
              name: "API Integration"
            }
          },
          {
            id: "4",
            user_id: "4",
            task_id: "2",
            image_url: "https://placehold.co/600x400?text=Work+Screenshot+4",
            captured_at: "2023-07-15T11:00:00Z",
            user: {
              full_name: "Employee Two",
              email: "employee2@example.com"
            },
            task: {
              name: "API Integration"
            }
          }
        ];

        setUsers(mockUsers);
        setScreenshots(mockScreenshots);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load screenshots. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredScreenshots = screenshots.filter((screenshot) => {
    const matchesUser = selectedUserId ? screenshot.user_id === selectedUserId : true;
    const matchesDate = selectedDate
      ? new Date(screenshot.captured_at).toDateString() === selectedDate.toDateString()
      : true;
    const matchesSearch = searchQuery
      ? screenshot.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screenshot.task.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    return matchesUser && matchesDate && matchesSearch;
  });

  if (loading) return <Loading message="Loading screenshots..." />;
  if (error) return <ErrorMessage message={error} />;

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
