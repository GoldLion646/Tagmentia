import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export function SupabaseConfigurationSection() {
  const [copiedKey, setCopiedKey] = useState<string>("");

  const supabaseConfig = {
    projectId: 'vgsavnlyathtlvrevtjb',
    url: 'https://vgsavnlyathtlvrevtjb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnc2F2bmx5YXRodGx2cmV2dGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NjI1MzMsImV4cCI6MjA3MTAzODUzM30.F8KXmmqb4dqgZJJSqGb0O9fpgUY9WIRnVe7ZanquWGY',
  };

  const copyToClipboard = async (value: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(keyName);
      toast({
        title: "Copied to clipboard",
        description: `${keyName} has been copied to your clipboard.`,
      });
      setTimeout(() => setCopiedKey(""), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Supabase Configuration</CardTitle>
            <CardDescription>
              Database and authentication settings (read-only)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Project ID</Label>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Your Supabase project identifier</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Input 
              value={supabaseConfig.projectId}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(supabaseConfig.projectId, 'Project ID')}
              className="px-2"
            >
              {copiedKey === 'Project ID' ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <Copy className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="font-medium">URL</Label>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Your Supabase project URL</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Input 
              value={supabaseConfig.url}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(supabaseConfig.url, 'URL')}
              className="px-2"
            >
              {copiedKey === 'URL' ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <Copy className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Public Anon Key</Label>
                <Badge variant="secondary" className="text-xs">Public</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Public key for client-side operations</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Input 
              value={supabaseConfig.anonKey}
              readOnly
              className="font-mono text-sm bg-background"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(supabaseConfig.anonKey, 'Anon Key')}
              className="px-2"
            >
              {copiedKey === 'Anon Key' ? 
                <Check className="h-4 w-4 text-green-600" /> : 
                <Copy className="h-4 w-4" />
              }
            </Button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/20 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            These values are configured in your Lovable project and cannot be changed here. 
            Visit the{' '}
            <a
              href="https://supabase.com/dashboard/project/vgsavnlyathtlvrevtjb"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Supabase Dashboard
            </a>{' '}
            to manage your project.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}