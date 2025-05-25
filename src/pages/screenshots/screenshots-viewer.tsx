
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Calendar, Clock, Eye, Filter } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Screenshot {
  id: string;
  user_id: string;
  project_id: string;
  image_url: string;
  captured_at: string;
  activity_percent?: number;
  focus_percent?: number;
  projects?: {
    name: string;
  };
}

export default function ScreenshotsViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [projects, setProjects] = useState<any[]>([]);
  
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, [userDetails]);

  useEffect(() => {
    loadScreenshots();
  }, [selectedProject, dateFilter, userDetails]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  const loadScreenshots = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let startDate: Date;
      const endDate = endOfDay(new Date());
      
      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(new Date());
          break;
        case 'week':
          startDate = startOfDay(subDays(new Date(), 7));
          break;
        case 'month':
          startDate = startOfDay(subDays(new Date(), 30));
          break;
        default:
          startDate = startOfDay(new Date());
      }

      let query = supabase
        .from('screenshots')
        .select(`
          id,
          user_id,
          project_id,
          image_url,
          captured_at,
          activity_percent,
          focus_percent,
          projects:project_id (name)
        `)
        .gte('captured_at', startDate.toISOString())
        .lte('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false });

      // Filter by user for employees
      if (userDetails?.role === 'employee') {
        query = query.eq('user_id', userDetails.id);
      }

      // Filter by project if selected
      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      setScreenshots(data || []);
    } catch (error: any) {
      console.error('Error loading screenshots:', error);
      toast({
        title: "Error loading screenshots",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openScreenshot = (screenshot: Screenshot) => {
    setSelectedScreenshot(screenshot);
  };

  const closeScreenshot = () => {
    setSelectedScreenshot(null);
  };

  const getActivityColor = (percent?: number) => {
    if (!percent) return 'bg-gray-200';
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 60) return 'bg-yellow-500';
    if (percent >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Screenshots" subtitle="View your captured screenshots" />
        <div className="text-center py-8">Loading screenshots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Screenshots" subtitle="View your captured screenshots" />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Screenshots ({screenshots.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {screenshots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screenshots.map(screenshot => (
                <div key={screenshot.id} className="border rounded-lg p-4 space-y-3">
                  <img 
                    src={screenshot.image_url} 
                    alt="Screenshot"
                    className="w-full h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openScreenshot(screenshot)}
                  />
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{screenshot.projects?.name || 'Unknown Project'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(screenshot.captured_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>

                    {screenshot.activity_percent && (
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getActivityColor(screenshot.activity_percent)}`} />
                        <span className="text-sm">Activity: {screenshot.activity_percent}%</span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openScreenshot(screenshot)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No screenshots found</p>
              <p className="text-sm">Try adjusting your filters or check back later</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedScreenshot.projects?.name || 'Unknown Project'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(selectedScreenshot.captured_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                  {selectedScreenshot.activity_percent && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        Activity: {selectedScreenshot.activity_percent}%
                      </Badge>
                      {selectedScreenshot.focus_percent && (
                        <Badge variant="outline">
                          Focus: {selectedScreenshot.focus_percent}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={closeScreenshot}>
                  Close
                </Button>
              </div>
              
              <img 
                src={selectedScreenshot.image_url} 
                alt="Screenshot"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
