import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, RotateCcw, Eye, Image, Palette } from 'lucide-react';
import { useLogoConfiguration } from '@/hooks/useLogoConfiguration';

export function LogoConfigurationSection() {
  const { 
    logoConfig, 
    isLoading, 
    isUploading, 
    uploadLogo, 
    resetToDefault,
    currentLogoUrl 
  } = useLogoConfiguration();
  
  console.log('📸 Admin Config: Current logo config:', logoConfig);
  console.log('📸 Admin Config: Current logo URL from hook:', currentLogoUrl);
  
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [logoDisplay, setLogoDisplay] = useState<string>(currentLogoUrl);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Update logo display when currentLogoUrl changes
  useEffect(() => {
    console.log('📸 Admin Config: Logo URL changed, updating display:', currentLogoUrl);
    setLogoDisplay(currentLogoUrl);
  }, [currentLogoUrl]);

  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    try {
      await uploadLogo(file, 'logo');
      setPreviewUrl(''); // Clear preview on success
    } catch (error) {
      // Error is handled in the hook
      setPreviewUrl(''); // Clear preview on error
    }

    // Reset input
    event.target.value = '';
  };

  const handleFaviconSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadLogo(file, 'favicon');
    } catch (error) {
      // Error is handled in the hook
    }

    // Reset input
    event.target.value = '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Brand Configuration</CardTitle>
              <CardDescription>Loading logo settings...</CardDescription>
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
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Brand Configuration</CardTitle>
            <CardDescription>
              Upload and manage your organization's logo and branding elements
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Logo Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Current Logo</Label>
              <p className="text-sm text-muted-foreground mt-1">
                This logo will appear across all pages, headers, and authentication screens
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="relative">
              {(previewUrl || logoDisplay) ? (
                <img 
                  src={previewUrl || logoDisplay} 
                  key={logoDisplay} // Force re-render when logo changes
                  alt="Current Logo" 
                  className="h-16 w-auto max-w-[200px] object-contain bg-white rounded border"
                  onLoad={() => console.log('📸 Admin Config: Logo loaded successfully:', previewUrl || currentLogoUrl)}
                />
              ) : (
                <div className="h-16 w-32 bg-muted/20 animate-pulse rounded" />
              )}
              {previewUrl && (
                <Badge className="absolute -top-2 -right-2 text-xs" variant="default">
                  Preview
                </Badge>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Upload New Logo'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Default
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentLogoUrl ? window.open(currentLogoUrl, '_blank') : null}
                  disabled={!currentLogoUrl}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Full Size
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>• Recommended size: 200x60px (or similar aspect ratio)</p>
                <p>• Formats: PNG, JPG, SVG • Max size: 5MB</p>
                <p>• Will be automatically scaled to fit different screen sizes</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Favicon Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Favicon</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Small icon that appears in browser tabs and bookmarks
              </p>
            </div>
            <Badge variant={logoConfig.favicon_url ? "secondary" : "outline"} className="text-xs">
              {logoConfig.favicon_url ? "Custom" : "Default"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="w-8 h-8 bg-white rounded border flex items-center justify-center">
              {logoConfig.favicon_url ? (
                <img 
                  src={logoConfig.favicon_url} 
                  alt="Favicon" 
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <Image className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => faviconInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {logoConfig.favicon_url ? 'Update Favicon' : 'Upload Favicon'}
              </Button>
              
              <p className="text-xs text-muted-foreground mt-2">
                Recommended: 32x32px PNG or ICO format
              </p>
            </div>
          </div>
        </div>

        {/* Usage Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/20 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Logo Usage</h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Header navigation (all pages)</p>
            <p>• Login and authentication screens</p>
            <p>• Splash screen and loading states</p>
            <p>• Email templates and notifications</p>
            <p>• Progressive Web App (PWA) icons</p>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          type="file"
          ref={logoInputRef}
          onChange={handleLogoSelect}
          accept="image/*"
          className="hidden"
        />
        
        <input
          type="file"
          ref={faviconInputRef}
          onChange={handleFaviconSelect}
          accept="image/png,image/x-icon,image/vnd.microsoft.icon"
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}