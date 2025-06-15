import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  Plus, 
  Settings, 
  Send, 
  TestTube, 
  Calendar, 
  Users, 
  History, 
  Trash2,
  Edit,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface ReportType {
  id: string;
  name: string;
  description: string;
  template_type: string;
}

interface ReportConfiguration {
  id: string;
  name: string;
  description?: string;
  schedule_cron?: string;
  schedule_description?: string;
  subject_template: string;
  include_summary: boolean;
  include_employee_details: boolean;
  include_alerts: boolean;
  include_projects: boolean;
  is_active: boolean;
  alert_settings: any;
  filters: any;
  report_types: { name: string; template_type: string };
  report_recipients: Array<{
    id: string;
    email: string;
    user_id: string;
    users: { full_name: string };
  }>;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
}

interface ReportHistory {
  id: string;
  sent_at: string;
  recipient_count: number;
  status: string;
  error_message?: string;
  report_configurations: { name: string };
}

const EmailReportsPage: React.FC = () => {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [configurations, setConfigurations] = useState<ReportConfiguration[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ReportConfiguration | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type_id: '',
    schedule_cron: '',
    schedule_description: '',
    subject_template: '',
    include_summary: true,
    include_employee_details: true,
    include_alerts: true,
    include_projects: true,
    recipients: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReportTypes(),
        loadConfigurations(),
        loadAdminUsers(),
        loadReportHistory(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load email reports data');
    } finally {
      setLoading(false);
    }
  };

  const loadReportTypes = async () => {
    const response = await fetch('/api/email-reports/types');
    const result = await response.json();
    if (result.success) {
      setReportTypes(result.data);
    }
  };

  const loadConfigurations = async () => {
    const response = await fetch('/api/email-reports/configurations');
    const result = await response.json();
    if (result.success) {
      setConfigurations(result.data);
    }
  };

  const loadAdminUsers = async () => {
    const response = await fetch('/api/email-reports/admin-users');
    const result = await response.json();
    if (result.success) {
      setAdminUsers(result.data);
    }
  };

  const loadReportHistory = async () => {
    const response = await fetch('/api/email-reports/history?limit=20');
    const result = await response.json();
    if (result.success) {
      setReportHistory(result.data);
    }
  };

  const handleTestEmailConfiguration = async () => {
    try {
      const response = await fetch('/api/email-reports/test-email', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to test email configuration');
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      const method = editingConfig ? 'PUT' : 'POST';
      const url = editingConfig 
        ? `/api/email-reports/configurations/${editingConfig.id}`
        : '/api/email-reports/configurations';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Report configuration ${editingConfig ? 'updated' : 'created'} successfully`);
        setDialogOpen(false);
        resetForm();
        loadConfigurations();
      } else {
        toast.error(result.message || 'Failed to save configuration');
      }
    } catch (error) {
      toast.error('Failed to save configuration');
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/email-reports/configurations/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Configuration deleted successfully');
        loadConfigurations();
      } else {
        toast.error('Failed to delete configuration');
      }
    } catch (error) {
      toast.error('Failed to delete configuration');
    }
  };

  const handleSendTestReport = async (configId: string) => {
    try {
      const response = await fetch(`/api/email-reports/configurations/${configId}/send-test`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Test report sent to ${result.recipients} recipients`);
        loadReportHistory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send test report');
    }
  };

  const handleSendReport = async (configId: string) => {
    try {
      const response = await fetch(`/api/email-reports/configurations/${configId}/send`, {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Report sent to ${result.recipients} recipients`);
        loadReportHistory();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send report');
    }
  };

  const openEditDialog = (config: ReportConfiguration) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      description: config.description || '',
      report_type_id: config.report_types ? config.report_types.name : '',
      schedule_cron: config.schedule_cron || '',
      schedule_description: config.schedule_description || '',
      subject_template: config.subject_template,
      include_summary: config.include_summary,
      include_employee_details: config.include_employee_details,
      include_alerts: config.include_alerts,
      include_projects: config.include_projects,
      recipients: config.report_recipients?.map(r => r.user_id) || [],
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      description: '',
      report_type_id: '',
      schedule_cron: '',
      schedule_description: '',
      subject_template: '',
      include_summary: true,
      include_employee_details: true,
      include_alerts: true,
      include_projects: true,
      recipients: [],
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'test':
        return <Badge variant="secondary"><TestTube className="w-3 h-3 mr-1" />Test</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Reports</h1>
          <p className="text-muted-foreground">
            Configure and manage automated email reports for your team
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestEmailConfiguration} variant="outline">
            <TestTube className="w-4 h-4 mr-2" />
            Test Email Setup
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? 'Edit Report Configuration' : 'Create New Report Configuration'}
                </DialogTitle>
                <DialogDescription>
                  Configure when and what email reports to send to administrators.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Report Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Daily Performance Report"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report_type">Report Type</Label>
                    <Select 
                      value={formData.report_type_id} 
                      onValueChange={(value) => setFormData({ ...formData, report_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.template_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe when and why this report is sent..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="schedule_cron">Cron Schedule</Label>
                    <Input
                      id="schedule_cron"
                      value={formData.schedule_cron}
                      onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                      placeholder="0 19 * * *"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Examples: "0 19 * * *" (daily 7pm), "0 9 * * 1" (Monday 9am)
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="schedule_description">Schedule Description</Label>
                    <Input
                      id="schedule_description"
                      value={formData.schedule_description}
                      onChange={(e) => setFormData({ ...formData, schedule_description: e.target.value })}
                      placeholder="Every day at 7:00 PM"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject_template">Email Subject Template</Label>
                  <Input
                    id="subject_template"
                    value={formData.subject_template}
                    onChange={(e) => setFormData({ ...formData, subject_template: e.target.value })}
                    placeholder="📅 Daily Team Performance Summary – {date}"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {`{date}`}, {`{start_date}`}, {`{end_date}`} placeholders
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Report Content</Label>
                  <div className="space-y-2">
                    {[
                      { key: 'include_summary', label: 'Include Summary Statistics' },
                      { key: 'include_employee_details', label: 'Include Employee Details' },
                      { key: 'include_alerts', label: 'Include Performance Alerts' },
                      { key: 'include_projects', label: 'Include Project Information' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={formData[key as keyof typeof formData] as boolean}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, [key]: checked })
                          }
                        />
                        <Label htmlFor={key}>{label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Recipients (Admin Users)</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                    {adminUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={formData.recipients.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                recipients: [...formData.recipients, user.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recipients: formData.recipients.filter(id => id !== user.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`user-${user.id}`} className="flex-1">
                          {user.full_name} ({user.email})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfiguration}>
                    {editingConfig ? 'Update' : 'Create'} Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="configurations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configurations">
            <Settings className="w-4 h-4 mr-2" />
            Configurations
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Send History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-4">
          {configurations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Mail className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Email Reports Configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first automated email report configuration.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {configurations.map((config) => (
                <Card key={config.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {config.name}
                          {config.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {config.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendTestReport(config.id)}
                        >
                          <TestTube className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSendReport(config.id)}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(config)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteConfiguration(config.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type:</span> {config.report_types?.name}
                      </div>
                      <div>
                        <span className="font-medium">Schedule:</span> {config.schedule_description || 'Manual'}
                      </div>
                      <div>
                        <span className="font-medium">Recipients:</span> {config.report_recipients?.length || 0}
                      </div>
                      <div>
                        <span className="font-medium">Subject:</span> {config.subject_template}
                      </div>
                    </div>
                    {config.report_recipients && config.report_recipients.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-sm">Recipients: </span>
                        <span className="text-sm text-muted-foreground">
                          {config.report_recipients.map(r => r.users.full_name).join(', ')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Email Reports</CardTitle>
              <CardDescription>
                History of sent email reports and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reports sent yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.report_configurations.name}
                        </TableCell>
                        <TableCell>
                          {new Date(report.sent_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{report.recipient_count}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell>
                          {report.error_message && (
                            <span className="text-red-500 text-sm">
                              {report.error_message}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailReportsPage; 