
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";
import { Calendar, Clock, Eye, User } from "lucide-react";
import { format } from "date-fns";

interface Screenshot {
  id: string;
  user_id: string;
  project_id: string;
  image_url: string;
  captured_at: string;
  users?: {
    full_name: string;
    email: string;
  };
  projects?: {
    name: string;
  };
}

export default function AdminScreenshots() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  
  const { userDetails } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadScreenshots();
  }, [userDetails]);

  const loadScreenshots = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('screenshots')
        .select(`
          id,
          user_id,
          project_id,
          image_url,
          captured_at,
          users:user_id (
            full_name,
            email
          ),
          projects:project_id (
            name
          )
        `)
        .order('captured_at', { ascending: false })
        .limit(50);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Screenshots" subtitle="View captured screenshots from all users" />
        <div className="text-center py-8">Loading screenshots...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Screenshots" subtitle="View captured screenshots from all users" />

      <Card>
        <CardHeader>
          <CardTitle>Recent Screenshots</CardTitle>
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
                      <User className="h-4 w-4" />
                      <span>{screenshot.users?.full_name || 'Unknown User'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>{screenshot.projects?.name || 'Unknown Project'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(screenshot.captured_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
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
                    {selectedScreenshot.users?.full_name || 'Unknown User'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedScreenshot.projects?.name || 'Unknown Project'} • {' '}
                    {format(new Date(selectedScreenshot.captured_at), 'MMM dd, yyyy HH:mm')}
                  </p>
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
