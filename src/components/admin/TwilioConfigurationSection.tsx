import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Phone, Eye, EyeOff, Loader2, Check, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TwilioSettings {
  account_sid: string;
  auth_token: string;
  phone_number: string;
  enabled: boolean;
}

export function TwilioConfigurationSection() {
  const [settings, setSettings] = useState<TwilioSettings>({
    account_sid: '',
    auth_token: '',
    phone_number: '',
    enabled: false,
  });
  const [originalSettings, setOriginalSettings] = useState<TwilioSettings>({
    account_sid: '',
    auth_token: '',
    phone_number: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showAuthToken, setShowAuthToken] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_twilio_settings');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSettings(data[0]);
        setOriginalSettings(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading Twilio settings:', error);
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
      const { error } = await supabase.rpc('update_twilio_settings', {
        p_account_sid: settings.account_sid,
        p_auth_token: settings.auth_token,
        p_phone_number: settings.phone_number,
        p_enabled: settings.enabled,
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "Twilio settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving Twilio settings:', error);
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

  const handleInputChange = (field: keyof TwilioSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Twilio Configuration</CardTitle>
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
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Twilio Configuration</CardTitle>
            <CardDescription>
              Configure Twilio for SMS and messaging services
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Get your Twilio credentials from the{' '}
            <a
              href="https://console.twilio.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Twilio Console
            </a>
            . You'll need an Account SID, Auth Token, and a phone number.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="twilio-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="twilio-enabled" className="cursor-pointer">
              Enable Twilio Integration
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-sid">Account SID</Label>
            <Input
              id="account-sid"
              type="text"
              value={settings.account_sid}
              onChange={(e) => handleInputChange('account_sid', e.target.value)}
              placeholder="AC..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio account identifier
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-token">Auth Token</Label>
            <div className="flex gap-2">
              <Input
                id="auth-token"
                type={showAuthToken ? 'text' : 'password'}
                value={settings.auth_token}
                onChange={(e) => handleInputChange('auth_token', e.target.value)}
                placeholder="Your auth token"
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowAuthToken(!showAuthToken)}
              >
                {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Authentication token for Twilio API (keep secure)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              type="text"
              value={settings.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
              placeholder="+1234567890"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio phone number for sending SMS (include country code)
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