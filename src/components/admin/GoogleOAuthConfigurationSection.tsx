import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, ExternalLink, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GoogleOAuthSettings {
  client_id: string;
  client_secret: string;
  enabled: boolean;
}

export function GoogleOAuthConfigurationSection() {
  const [settings, setSettings] = useState<GoogleOAuthSettings>({
    client_id: "",
    client_secret: "",
    enabled: false
  });
  const [originalSettings, setOriginalSettings] = useState<GoogleOAuthSettings>({
    client_id: "",
    client_secret: "",
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_google_oauth_settings');

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedSettings = {
          client_id: data[0].client_id || "",
          client_secret: data[0].client_secret || "",
          enabled: data[0].enabled || false
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error: any) {
      console.error('Error loading Google OAuth settings:', error);
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
      const { error } = await supabase.rpc('update_google_oauth_settings', {
        p_client_id: settings.client_id,
        p_client_secret: settings.client_secret,
        p_enabled: settings.enabled
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "Google OAuth settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving Google OAuth settings:', error);
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

  const handleInputChange = (field: keyof GoogleOAuthSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Google OAuth Configuration...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          Google OAuth Configuration
        </CardTitle>
        <CardDescription>
          Configure Google Sign-In for your application. Users will be able to sign up and sign in using their Google accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <ExternalLink className="h-4 w-4" />
          <AlertDescription>
            To set up Google OAuth, you need to create a project in the{" "}
            <a 
              href="https://console.cloud.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-primary hover:text-primary/80"
            >
              Google Cloud Console
            </a>{" "}
            and configure OAuth credentials. The redirect URL should be:{" "}
            <code className="bg-muted px-2 py-1 rounded text-sm">
              https://vgsavnlyathtlvrevtjb.supabase.co/auth/v1/callback
            </code>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Google OAuth</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to sign up and sign in with their Google accounts
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
          </div>

          {/* Client ID */}
          <div className="space-y-2">
            <Label htmlFor="client-id">Google Client ID</Label>
            <Input
              id="client-id"
              placeholder="Enter your Google OAuth Client ID"
              value={settings.client_id}
              onChange={(e) => handleInputChange('client_id', e.target.value)}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              The Client ID from your Google Cloud Console OAuth credentials
            </p>
          </div>

          {/* Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="client-secret">Google Client Secret</Label>
            <div className="relative">
              <Input
                id="client-secret"
                type={showSecret ? "text" : "password"}
                placeholder="Enter your Google OAuth Client Secret"
                value={settings.client_secret}
                onChange={(e) => handleInputChange('client_secret', e.target.value)}
                className="font-mono pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The Client Secret from your Google Cloud Console OAuth credentials (keep this secure)
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