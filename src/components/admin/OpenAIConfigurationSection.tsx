import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Brain, Eye, EyeOff, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface OpenAISettings {
  api_key: string;
  enabled: boolean;
}

export function OpenAIConfigurationSection() {
  const [settings, setSettings] = useState<OpenAISettings>({
    api_key: "",
    enabled: false
  });
  const [originalSettings, setOriginalSettings] = useState<OpenAISettings>({
    api_key: "",
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
      const { data, error } = await supabase.rpc('get_openai_settings');

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedSettings = {
          api_key: data[0].api_key || "",
          enabled: data[0].enabled || false
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (error: any) {
      console.error('Error loading OpenAI settings:', error);
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
    if (!settings.api_key.trim()) {
      toast({
        title: "Validation error",
        description: "API key is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    setJustSaved(false);
    try {
      const { error } = await supabase.rpc('update_openai_settings', {
        p_api_key: settings.api_key,
        p_enabled: settings.enabled
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "OpenAI settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving OpenAI settings:', error);
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

  const handleInputChange = (field: keyof OpenAISettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">OpenAI Configuration</CardTitle>
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
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">OpenAI Configuration</CardTitle>
            <CardDescription>
              Configure OpenAI API for AI video summaries and other AI features
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Configure your OpenAI API key to enable AI-powered video summaries. Get your API key from the{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              OpenAI Platform
            </a>
            .
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="openai-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="openai-enabled" className="cursor-pointer">
              Enable OpenAI Integration
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type={showSecret ? 'text' : 'password'}
                value={settings.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                placeholder="sk-..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your OpenAI API key (keep secure)
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
            disabled={saving || !hasChanges || !settings.api_key.trim()} 
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