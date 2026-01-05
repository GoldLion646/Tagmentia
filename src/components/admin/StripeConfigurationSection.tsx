import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Eye, EyeOff, Loader2, Check, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StripeSettings {
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
  enabled: boolean;
}

export function StripeConfigurationSection() {
  const [settings, setSettings] = useState<StripeSettings>({
    secret_key: '',
    publishable_key: '',
    webhook_secret: '',
    enabled: false,
  });
  const [originalSettings, setOriginalSettings] = useState<StripeSettings>({
    secret_key: '',
    publishable_key: '',
    webhook_secret: '',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showSecrets, setShowSecrets] = useState({
    secret_key: false,
    webhook_secret: false,
  });

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_stripe_configuration');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setSettings(data[0]);
        setOriginalSettings(data[0]);
      }
    } catch (error: any) {
      console.error('Error loading Stripe settings:', error);
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
      const { error } = await supabase.rpc('update_stripe_configuration', {
        p_secret_key: settings.secret_key,
        p_publishable_key: settings.publishable_key,
        p_webhook_secret: settings.webhook_secret,
        p_enabled: settings.enabled,
      });

      if (error) throw error;

      setOriginalSettings(settings);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);

      toast({
        title: "Configuration saved",
        description: "Stripe settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving Stripe settings:', error);
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

  const handleInputChange = (field: keyof StripeSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Stripe Configuration</CardTitle>
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
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Stripe Configuration</CardTitle>
            <CardDescription>
              Configure Stripe payment processing and billing settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Get your Stripe keys from the{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Stripe Dashboard
            </a>
            . Webhook endpoint: <code className="bg-muted px-1 py-0.5 rounded text-xs">
              https://vgsavnlyathtlvrevtjb.supabase.co/functions/v1/stripe-webhook
            </code>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="stripe-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            />
            <Label htmlFor="stripe-enabled" className="cursor-pointer">
              Enable Stripe Integration
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishable-key">Publishable Key</Label>
            <Input
              id="publishable-key"
              type="text"
              value={settings.publishable_key}
              onChange={(e) => handleInputChange('publishable_key', e.target.value)}
              placeholder="pk_test_..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Public key used in client-side code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <div className="flex gap-2">
              <Input
                id="secret-key"
                type={showSecrets.secret_key ? 'text' : 'password'}
                value={settings.secret_key}
                onChange={(e) => handleInputChange('secret_key', e.target.value)}
                placeholder="sk_test_..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSecrets(prev => ({ ...prev, secret_key: !prev.secret_key }))}
              >
                {showSecrets.secret_key ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Private key for server-side operations (keep secure)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-secret"
                type={showSecrets.webhook_secret ? 'text' : 'password'}
                value={settings.webhook_secret}
                onChange={(e) => handleInputChange('webhook_secret', e.target.value)}
                placeholder="whsec_..."
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSecrets(prev => ({ ...prev, webhook_secret: !prev.webhook_secret }))}
              >
                {showSecrets.webhook_secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to verify webhook events from Stripe
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