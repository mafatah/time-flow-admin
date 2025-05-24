
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Camera, Clock, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SystemSettings {
  id: string;
  blur_screenshots: boolean;
  screenshot_interval_seconds: number;
  idle_threshold_seconds: number;
  notification_rules: any;
  created_at: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notificationRules, setNotificationRules] = useState('{}');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      // Using a more generic query since the table might not be in TypeScript definitions yet
      const { data, error } = await supabase
        .from('settings' as any)
        .select('*')
        .single();

      if (error) {
        // If settings table doesn't exist or no data, return default settings
        if (error.code === 'PGRST116' || error.message.includes('relation "settings" does not exist')) {
          return {
            id: 'default',
            blur_screenshots: false,
            screenshot_interval_seconds: 300,
            idle_threshold_seconds: 300,
            notification_rules: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as SystemSettings;
        }
        throw error;
      }
      
      if (data?.notification_rules) {
        setNotificationRules(JSON.stringify(data.notification_rules, null, 2));
      }
      
      return data as SystemSettings;
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<SystemSettings>) => {
      if (!settings?.id || settings.id === 'default') {
        // Create new settings if none exist
        const { data, error } = await supabase
          .from('settings' as any)
          .insert({
            ...updatedSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('settings' as any)
          .update({
            ...updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Settings updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating settings', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  const handleSaveSettings = () => {
    if (!settings) return;

    let parsedNotificationRules;
    try {
      parsedNotificationRules = JSON.parse(notificationRules);
    } catch (e) {
      toast({ title: 'Invalid JSON in notification rules', variant: 'destructive' });
      return;
    }

    updateSettingsMutation.mutate({
      notification_rules: parsedNotificationRules
    });
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    
    updateSettingsMutation.mutate({
      [key]: value
    });
  };

  if (isLoading) {
    return <div>Loading settings...</div>;
  }

  if (!settings) {
    return <div>No settings found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Screenshot Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Blur Screenshots</Label>
                <div className="text-sm text-muted-foreground">
                  Apply blur effect to protect sensitive information
                </div>
              </div>
              <Switch
                checked={settings.blur_screenshots}
                onCheckedChange={(checked) => updateSetting('blur_screenshots', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Screenshot Interval</Label>
                <div className="text-sm text-muted-foreground">
                  How often to capture screenshots (seconds)
                </div>
              </div>
              <div className="px-3">
                <Slider
                  value={[settings.screenshot_interval_seconds]}
                  onValueChange={([value]) => updateSetting('screenshot_interval_seconds', value)}
                  min={30}
                  max={600}
                  step={30}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>30s</span>
                  <span className="font-medium">{settings.screenshot_interval_seconds}s</span>
                  <span>10m</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Idle Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Idle Threshold</Label>
                <div className="text-sm text-muted-foreground">
                  Mark user as idle after this many seconds of inactivity
                </div>
              </div>
              <div className="px-3">
                <Slider
                  value={[settings.idle_threshold_seconds]}
                  onValueChange={([value]) => updateSetting('idle_threshold_seconds', value)}
                  min={60}
                  max={1800}
                  step={60}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>1m</span>
                  <span className="font-medium">{Math.floor(settings.idle_threshold_seconds / 60)}m</span>
                  <span>30m</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notification Rules (JSON)</Label>
            <div className="text-sm text-muted-foreground">
              Configure when and how notifications should be sent
            </div>
          </div>
          <Textarea
            value={notificationRules}
            onChange={(e) => setNotificationRules(e.target.value)}
            className="font-mono text-sm min-h-[200px]"
            placeholder={`{
  "low_activity_threshold": 60,
  "idle_warning_minutes": 15,
  "daily_summary": true,
  "unusual_activity_alert": true
}`}
          />
          <div className="text-xs text-muted-foreground">
            Example rules: Set thresholds for low activity alerts, idle warnings, and notification preferences
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <div className="text-sm text-muted-foreground">
                {new Date(settings.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Last Updated</Label>
              <div className="text-sm text-muted-foreground">
                {new Date(settings.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
