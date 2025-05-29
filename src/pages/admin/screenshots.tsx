
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Calendar, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Screenshot {
  id: string;
  user_id: string | null;
  project_id: string | null;
  image_url: string;
  captured_at: string;
  activity_percent?: number | null;
  focus_percent?: number | null;
  classification?: string | null;
  task_id?: string | null;
  user_name?: string;
  user_email?: string;
  project_name?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
}

export default function AdminScreenshots() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchScreenshots();
  }, [selectedDate]);

  const fetchScreenshots = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 1);

      // First get screenshots
      const { data: screenshotData, error: screenshotError } = await supabase
        .from('screenshots')
        .select('*')
        .gte('captured_at', startDate.toISOString())
        .lt('captured_at', endDate.toISOString())
        .order('captured_at', { ascending: false });

      if (screenshotError) throw screenshotError;

      if (!screenshotData || screenshotData.length === 0) {
        setScreenshots([]);
        return;
      }

      // Get unique user IDs and project IDs, filtering out nulls
      const userIds = [...new Set(screenshotData.map((s: any) => s.user_id).filter(Boolean))] as string[];
      const projectIds = [...new Set(screenshotData.map((s: any) => s.project_id).filter(Boolean))] as string[];

      // Fetch user data
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      // Fetch project data
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      // Combine data
      const enrichedScreenshots = screenshotData.map((screenshot: any) => ({
        ...screenshot,
        user_name: userData?.find((u: User) => u.id === screenshot.user_id)?.full_name || 'Unknown',
        user_email: userData?.find((u: User) => u.id === screenshot.user_id)?.email || 'Unknown',
        project_name: projectData?.find((p: Project) => p.id === screenshot.project_id)?.name || 'Unknown Project'
      }));

      setScreenshots(enrichedScreenshots);
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      toast.error('Failed to fetch screenshots');
    } finally {
      setLoading(false);
    }
  };

  const handleViewScreenshot = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  const handleDownloadScreenshot = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Screenshot downloaded');
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      toast.error('Failed to download screenshot');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Screenshots Management</h1>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Screenshots for {format(new Date(selectedDate), 'MMMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading screenshots...</div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No screenshots found for the selected date.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Activity %</TableHead>
                  <TableHead>Focus %</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screenshots.map((screenshot: Screenshot) => (
                  <TableRow key={screenshot.id}>
                    <TableCell>
                      {format(new Date(screenshot.captured_at), 'HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{screenshot.user_name}</div>
                        <div className="text-sm text-gray-500">{screenshot.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{screenshot.project_name}</TableCell>
                    <TableCell>
                      {screenshot.activity_percent ? `${screenshot.activity_percent}%` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {screenshot.focus_percent ? `${screenshot.focus_percent}%` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewScreenshot(screenshot.image_url)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadScreenshot(
                            screenshot.image_url,
                            `screenshot-${screenshot.id}.png`
                          )}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
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
  );
}
