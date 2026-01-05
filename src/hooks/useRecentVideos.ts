import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  platform?: string;
  thumbnail_url?: string;
  duration?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  reminder_date?: string;
  category_id?: string;
}

export const useRecentVideos = (limit: number = 3) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching videos:', error);
        setError(error.message);
        return;
      }

      setVideos(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentVideos();
  }, [limit]);

  return { videos, loading, error, refetch: fetchRecentVideos };
};