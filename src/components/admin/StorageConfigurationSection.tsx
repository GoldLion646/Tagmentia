import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, Save, RotateCcw, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StoragePolicy {
  id: string;
  max_upload_mb: number;
  max_longest_edge_px: number;
  compression_quality: number;
  enforce_webp: boolean;
}

export function StorageConfigurationSection() {
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<StoragePolicy | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const { data, error } = await supabase
        .from('storage_policy')
        .select('*')
        .single();

      if (error) throw error;
      setPolicy(data);
    } catch (error: any) {
      console.error('Error fetching storage policy:', error);
      toast({
        title: "Error",
        description: "Failed to load storage policy",
        variant: "destructive"
      });
    }
  };

  const handleChange = (field: keyof StoragePolicy, value: any) => {
    if (!policy) return;
    setPolicy({ ...policy, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!policy) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('storage_policy')
        .update({
          max_upload_mb: policy.max_upload_mb,
          max_longest_edge_px: policy.max_longest_edge_px,
          compression_quality: policy.compression_quality,
          enforce_webp: policy.enforce_webp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', policy.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Storage policy updated successfully",
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error updating storage policy:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update storage policy",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefaults = () => {
    if (!policy) return;
    setPolicy({
      ...policy,
      max_upload_mb: 5,
      max_longest_edge_px: 1600,
      compression_quality: 80,
      enforce_webp: true,
    });
    setHasChanges(true);
  };

  if (!policy) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Storage Configuration</CardTitle>
            <CardDescription>
              Configure upload limits, compression, and per-plan storage quotas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A 3000×2000 PNG (~3.5MB) will be compressed to ~300-600KB WebP after processing.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max_upload_mb">Max Upload Size (MB)</Label>
            <Input
              id="max_upload_mb"
              type="number"
              min={1}
              max={50}
              value={policy.max_upload_mb}
              onChange={(e) => handleChange('max_upload_mb', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Maximum file size before compression
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_longest_edge_px">Max Longest Edge (px)</Label>
            <Input
              id="max_longest_edge_px"
              type="number"
              min={800}
              max={4000}
              step={100}
              value={policy.max_longest_edge_px}
              onChange={(e) => handleChange('max_longest_edge_px', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Images will be resized to fit within this dimension
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compression_quality">Compression Quality (0-100)</Label>
            <Input
              id="compression_quality"
              type="number"
              min={0}
              max={100}
              value={policy.compression_quality}
              onChange={(e) => handleChange('compression_quality', parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Higher values = better quality but larger files
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="enforce_webp">Force WebP Format</Label>
              <Switch
                id="enforce_webp"
                checked={policy.enforce_webp}
                onCheckedChange={(checked) => handleChange('enforce_webp', checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Convert all images to WebP for better compression
            </p>
          </div>
        </div>

        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription>
            <strong>Storage quotas are now configured per plan.</strong> Go to <strong>Admin → Subscriptions</strong> to set storage limits for each subscription plan (Free, Premium, Gold).
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            disabled={loading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}