
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
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReportType {
  id: string;
  name: string;
  description: string;
  template_type: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
}

const EmailReportsPage: React.FC = () => {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadReportTypes(),
        loadAdminUsers(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load email reports data');
    } finally {
      setLoading(false);
    }
  };

  const loadReportTypes = async () => {
    try {
      console.log('🔄 Loading report types...');
      const { data, error } = await supabase.functions.invoke('email-reports/types');
      
      if (error) {
        console.error('Error loading report types:', error);
        throw error;
      }

      if (data?.success) {
        setReportTypes(data.data || []);
        console.log('✅ Report types loaded:', data.data);
      } else {
        console.error('Failed to load report types:', data);
      }
    } catch (error) {
      console.error('Error in loadReportTypes:', error);
    }
  };

  const loadAdminUsers = async () => {
    try {
      console.log('🔄 Loading admin users...');
      const { data, error } = await supabase.functions.invoke('email-reports/admin-users');
      
      if (error) {
        console.error('Error loading admin users:', error);
        throw error;
      }

      if (data?.success) {
        setAdminUsers(data.data || []);
        console.log('✅ Admin users loaded:', data.data);
      } else {
        console.error('Failed to load admin users:', data);
      }
    } catch (error) {
      console.error('Error in loadAdminUsers:', error);
    }
  };

  const handleTestEmailConfiguration = async () => {
    try {
      setTestingEmail(true);
      console.log('🧪 Testing email configuration...');
      
      const { data, error } = await supabase.functions.invoke('email-reports/test-email', {
        method: 'POST'
      });
      
      console.log('📧 Email test response:', { data, error });
      
      if (error) {
        console.error('Email test error:', error);
        toast.error(`Email test failed: ${error.message}`);
        return;
      }
      
      if (data?.success) {
        toast.success(data.message);
        console.log('✅ Email test successful');
      } else {
        toast.error(data?.message || 'Email test failed');
        console.error('❌ Email test failed:', data);
      }
    } catch (error) {
      console.error('Error testing email:', error);
      toast.error('Failed to test email configuration');
    } finally {
      setTestingEmail(false);
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
          <Button 
            onClick={handleTestEmailConfiguration} 
            variant="outline"
            disabled={testingEmail}
          >
            {testingEmail ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4 mr-2" />
            )}
            {testingEmail ? 'Testing...' : 'Test Email Setup'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Types</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportTypes.length}</div>
            <p className="text-xs text-muted-foreground">
              Available report templates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available recipients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Status</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground">
              System operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Click "Test Email Setup" to verify your email configuration is working correctly. 
          You should receive a test email at your admin email address.
        </AlertDescription>
      </Alert>

      {/* Report Types Display */}
      {reportTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Report Types</CardTitle>
            <CardDescription>
              These are the report templates available for configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {reportTypes.map((type) => (
                <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{type.name}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                  <Badge variant="secondary">{type.template_type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Users Display */}
      {adminUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Users</CardTitle>
            <CardDescription>
              These users can receive email reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {adminUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">Admin</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailReportsPage;
