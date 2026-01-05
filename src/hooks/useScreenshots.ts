import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStorageQuota } from '@/hooks/useStorageQuota';

export interface Screenshot {
  id: string;
  user_id: string;
  category_id: string;
  video_id: string;
  original_url: string;
  image_1600_url: string | null;
  thumb_320_url: string | null;
  size_bytes: number;
  format: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScreenshotLimits {
  max_screenshots: number;
  current_screenshots: number;
  can_upload: boolean;
}

export const useScreenshots = (videoId?: string) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [limits, setLimits] = useState<ScreenshotLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { refresh: refreshStorageQuota } = useStorageQuota();

  const fetchScreenshots = async () => {
    if (!videoId) return;

    try {
      const { data, error } = await supabase
        .from('screenshots')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScreenshots(data || []);
    } catch (error: any) {
      console.error('Error fetching screenshots:', error);
      toast({
        title: "Error",
        description: "Failed to load screenshots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_user_screenshot_limits', {
        user_uuid: user.id
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setLimits({
          max_screenshots: data[0].max_screenshots,
          current_screenshots: data[0].current_screenshots,
          can_upload: data[0].can_upload
        });
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const deleteScreenshot = async (screenshotId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-screenshot`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ screenshotId }),
        }
      );

      if (!response.ok) throw new Error('Failed to delete screenshot');

      toast({
        title: "Success",
        description: "Screenshot deleted successfully",
      });

      await fetchScreenshots();
      await fetchLimits();
      refreshStorageQuota();
    } catch (error: any) {
      console.error('Error deleting screenshot:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete screenshot",
        variant: "destructive"
      });
    }
  };

  const updateNote = async (screenshotId: string, note: string) => {
    try {
      const { error } = await supabase
        .from('screenshots')
        .update({ note })
        .eq('id', screenshotId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Note updated successfully",
      });

      await fetchScreenshots();
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (videoId) {
      fetchScreenshots();
      fetchLimits();
    }
  }, [videoId]);

  return {
    screenshots,
    limits,
    loading,
    refresh: () => {
      fetchScreenshots();
      fetchLimits();
    },
    deleteScreenshot,
    updateNote,
  };
};
