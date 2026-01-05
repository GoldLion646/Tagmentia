import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LogoConfiguration {
  logo_url: string | null;
  favicon_url: string | null;
  updated_at: string;
}

const DEFAULT_LOGO_URL = null;
const CONFIG_TABLE = 'branding_settings';
const CACHE_KEY = 'tagmentia_logo_v4'; // New cache key
const CACHE_VERSION = '4.0';

// Preload logo from cache BEFORE React renders
const getInitialLogo = (): LogoConfiguration => {
  if (typeof window === 'undefined') {
    return { logo_url: null, favicon_url: null, updated_at: new Date().toISOString() };
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.version === CACHE_VERSION && parsed.logo_url) {
        console.log('⚡ Preloaded logo from cache:', parsed.logo_url);
        return {
          logo_url: parsed.logo_url,
          favicon_url: parsed.favicon_url,
          updated_at: parsed.updated_at
        };
      }
    }
  } catch (e) {
    console.error('Cache load error:', e);
  }

  return { logo_url: null, favicon_url: null, updated_at: new Date().toISOString() };
};

export function useLogoConfiguration() {
  // Start with cached logo to prevent flash
  const [logoConfig, setLogoConfig] = useState<LogoConfiguration>(getInitialLogo);
  
  const [isLoading, setIsLoading] = useState(!logoConfig.logo_url);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchLogoConfig = async () => {
    console.log('🔍 Logo Hook: Starting fetchLogoConfig...');
    try {
      // Don't clear cache on every fetch - this causes logo flash
      // Cache will be updated when new data is fetched
      
      // 2) Try public RPC first (works for unauthenticated users)
      console.log('🔍 Logo Hook: Calling get_public_branding RPC...');
      const { data: publicBranding, error: publicErr } = await supabase
        .rpc('get_public_branding');

      console.log('🔍 Logo Hook: RPC response:', { publicBranding, publicErr });

      if (!publicErr && publicBranding && Array.isArray(publicBranding) && publicBranding.length > 0) {
        const first = publicBranding[0] as any;
        const normalized: LogoConfiguration = {
          logo_url: first.logo_url ?? null,
          favicon_url: first.favicon_url ?? null,
          updated_at: new Date().toISOString(),
        };
        console.log('📸 Logo fetched via RPC:', normalized);
        setLogoConfig(normalized);
        // Store with version for cache invalidation
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ...normalized,
          version: CACHE_VERSION
        }));
        
        // Test image load directly
        if (normalized.logo_url) {
          console.log('🔍 Logo Hook: Testing image load for URL:', normalized.logo_url);
          const img = new Image();
          img.onload = () => console.log('✅ Logo Hook: Image loaded successfully');
          img.onerror = (e) => console.log('❌ Logo Hook: Image failed to load:', e);
          img.src = normalized.logo_url;
        }
        return; // Successfully fetched via RPC
      } else {
        // 3) Fallback to direct table read (should work now with public read policy)
        console.log('🔍 Logo Hook: RPC failed, trying direct DB query...');
        const { data, error } = await supabase
          .from(CONFIG_TABLE)
          .select('logo_url, favicon_url, updated_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('🔍 Logo Hook: Direct DB response:', { data, error });

        if (!error && data) {
          const normalized: LogoConfiguration = {
            logo_url: data.logo_url ?? null,
            favicon_url: data.favicon_url ?? null,
            updated_at: data.updated_at ?? new Date().toISOString(),
          };
          console.log('📸 Logo fetched via direct DB:', normalized);
          setLogoConfig(normalized);
          // Store with version for cache invalidation
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            ...normalized,
            version: CACHE_VERSION
          }));
        } else {
          console.warn('Logo config: All fetch methods failed', { publicErr, error });
        }
      }
    } catch (error) {
      console.error('Error fetching logo configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLogoConfig = async (newConfig: Partial<LogoConfiguration>) => {
    try {
      const updatedConfig: LogoConfiguration = {
        logo_url: newConfig.logo_url ?? logoConfig.logo_url ?? null,
        favicon_url: newConfig.favicon_url ?? logoConfig.favicon_url ?? null,
        updated_at: new Date().toISOString(),
      };

      // Persist to database (best-effort). Table: branding_settings
      try {
        const { error } = await (supabase as any)
          .from(CONFIG_TABLE)
          .upsert({
            logo_url: updatedConfig.logo_url,
            favicon_url: updatedConfig.favicon_url,
            updated_at: updatedConfig.updated_at
          });
        if (error) {
          console.warn('Logo config: DB upsert failed, falling back to localStorage only.', error);
        }
      } catch (dbErr) {
        console.warn('Logo config: DB upsert threw, falling back to localStorage only.', dbErr);
      }

      // Update local state and cache with version
      setLogoConfig(updatedConfig);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ...updatedConfig,
        version: CACHE_VERSION
      }));
      window.dispatchEvent(new CustomEvent('logoConfigUpdated', { detail: updatedConfig }));

      return updatedConfig;
    } catch (error) {
      console.error('Error updating logo configuration:', error);
      throw error;
    }
  };

  const uploadLogo = async (file: File, type: 'logo' | 'favicon' = 'logo') => {
    if (!file) return null;

    setIsUploading(true);
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${type}-${timestamp}.${fileExt}`;

      // Ensure authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to upload.');

      // Always use global path so all users see the same logo
      const globalPath = `global/branding/${fileName}`;
      
      const uploadResult = await supabase.storage
        .from('branding')
        .upload(globalPath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const finalPath = uploadResult.data.path;

      // Get public URL for the final path
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(finalPath);
      // Update configuration
      const configUpdate = type === 'logo' 
        ? { logo_url: publicUrl } 
        : { favicon_url: publicUrl };

      await updateLogoConfig(configUpdate);

      toast({
        title: `${type === 'logo' ? 'Logo' : 'Favicon'} Updated`,
        description: `Your ${type} has been successfully updated.`,
      });

      return publicUrl;
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: 'Upload Failed',
        description: error.message || `Failed to upload ${type}. Please try again.`,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const resetToDefault = async () => {
    try {
      await updateLogoConfig({ 
        logo_url: null,
        favicon_url: null 
      });

      toast({
        title: 'Logo Reset',
        description: 'Logo has been reset to default text logo.',
      });
    } catch (error) {
      toast({
        title: 'Reset Failed',
        description: 'Failed to reset logo. Please try again.',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchLogoConfig();
    
    // Listen for logo config updates from other components
    const handleLogoConfigUpdate = (event: CustomEvent) => {
      setLogoConfig(event.detail);
    };
    
    window.addEventListener('logoConfigUpdated', handleLogoConfigUpdate as EventListener);
    
    return () => {
      window.removeEventListener('logoConfigUpdated', handleLogoConfigUpdate as EventListener);
    };
  }, []);

  console.log('📸 Logo Hook: Current logo URL:', logoConfig.logo_url || 'No logo configured');
  console.log('📸 Logo Hook: Current favicon URL:', logoConfig.favicon_url || 'No favicon configured');

  // Don't use cache-busting - it causes re-fetches
  // The cache version mechanism handles updates
  return {
    logoConfig,
    isLoading,
    isUploading,
    uploadLogo,
    resetToDefault,
    currentLogoUrl: logoConfig.logo_url,
    currentFaviconUrl: logoConfig.favicon_url
  };
}