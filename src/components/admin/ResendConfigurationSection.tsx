import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Eye, EyeOff, Loader2, Check, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ResendSettings {
  api_key: string;
  from_domain: string;
  enabled: boolean;
}

export function ResendConfigurationSection() {
  const [settings, setSettings] = useState<ResendSettings>({
    api_key: '',
    from_domain: '',
    enabled: false,
  });
  const [originalSettings, setOriginalSettings] = useState<ResendSettings>({
    api_key: '',
    from_domain: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_resend_settings');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSettings(data[0]);
        setOriginalSettings(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading Resend settings:', error);
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
      const { error } = await supabase.rpc('update_resend_settings', {
        p_api_key: settings.api_key,
        p_from_domain: settings.from_domain,
        p_enabled: settings.enabled,
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "Resend settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving Resend settings:', error);
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

  const handleInputChange = (field: keyof ResendSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Resend Configuration</CardTitle>
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
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Resend Configuration</CardTitle>
            <CardDescription>
              Configure Resend for email delivery services
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Get your Resend API key from the{' '}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Resend Dashboard
            </a>
            . Make sure to verify your domain first.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="resend-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="resend-enabled" className="cursor-pointer">
              Enable Resend Integration
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={settings.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                placeholder="re_..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API key for Resend email service (keep secure)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from-domain">From Domain</Label>
            <Input
              id="from-domain"
              type="text"
              value={settings.from_domain}
              onChange={(e) => handleInputChange('from_domain', e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Verified domain email address for sending emails
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