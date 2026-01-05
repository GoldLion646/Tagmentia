import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, EyeOff, Loader2, Check, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PushNotificationSettings {
  vapid_public_key: string;
  vapid_private_key: string;
  enabled: boolean;
}

export function PushNotificationConfigurationSection() {
  const [settings, setSettings] = useState<PushNotificationSettings>({
    vapid_public_key: '',
    vapid_private_key: '',
    enabled: false,
  });
  const [originalSettings, setOriginalSettings] = useState<PushNotificationSettings>({
    vapid_public_key: '',
    vapid_private_key: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_push_notification_settings');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSettings(data[0]);
        setOriginalSettings(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading push notification settings:', error);
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setJustSaved(false);
    try {
      const { error } = await supabase.rpc('update_push_notification_settings', {
        p_vapid_public_key: settings.vapid_public_key,
        p_vapid_private_key: settings.vapid_private_key,
        p_enabled: settings.enabled,
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "Push notification settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving push notification settings:', error);
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const handleInputChange = (field: keyof PushNotificationSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Push Notification Configuration</CardTitle>
              <CardDescription>Loading settings...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Push Notification Configuration</CardTitle>
            <CardDescription>
              Configure VAPID keys for web push notifications
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Generate VAPID keys using{' '}
            <a
              href="https://vapidkeys.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              vapidkeys.com
            </a>{' '}
            or use the web-push library to generate them.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="push-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="push-enabled" className="cursor-pointer">
              Enable Push Notifications
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vapid-public">VAPID Public Key</Label>
            <Input
              id="vapid-public"
              type="text"
              value={settings.vapid_public_key}
              onChange={(e) => handleInputChange('vapid_public_key', e.target.value)}
              placeholder="Public key for push subscriptions"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Public key shared with clients for push subscriptions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vapid-private">VAPID Private Key</Label>
            <div className="flex gap-2">
              <Input
                id="vapid-private"
                type={showPrivateKey ? 'text' : 'password'}
                value={settings.vapid_private_key}
                onChange={(e) => handleInputChange('vapid_private_key', e.target.value)}
                placeholder="Private key for sending notifications"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Private key used server-side to send push notifications (keep secure)
            </p>
          </div>

        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 bg-muted/20 border-t">
        {hasChanges && !justSaved && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 w-full">
            <Badge variant="outline" className="border-amber-600 dark:border-amber-400">
              Unsaved Changes
            </Badge>
            <span className="text-xs">You have unsaved changes</span>
          </div>
        )}
        {justSaved && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 w-full">
            <Check className="h-4 w-4" />
            <span className="text-xs">Configuration saved successfully</span>
          </div>
        )}
        <div className="flex gap-2 w-full">
          <Button 
            onClick={handleReset} 
            disabled={saving || !hasChanges} 
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges} 
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : justSaved ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}