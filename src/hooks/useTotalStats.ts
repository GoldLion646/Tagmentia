import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TotalStats {
  totalCategories: number;
  totalVideos: number;
  totalScreenshots: number;
}

export const useTotalStats = () => {
  const [stats, setStats] = useState<TotalStats>({
    totalCategories: 0,
    totalVideos: 0,
    totalScreenshots: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      console.log('📊 useTotalStats: Starting fetch...');
      
      // Get total categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true });

      console.log('📊 useTotalStats: Categories count:', categoriesCount);

      if (categoriesError) {
        console.error('Error fetching categories count:', categoriesError);
        throw categoriesError;
      }

      // Get total videos count (excluding screenshot container videos)
      const { count: videosCount, error: videosError } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .neq('platform', 'screenshot');

      console.log('📊 useTotalStats: Videos count:', videosCount);

      if (videosError) {
        console.error('Error fetching videos count:', videosError);
        throw videosError;
      }

      // Get total screenshots count
      const { count: screenshotsCount, error: screenshotsError } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true });

      console.log('📊 useTotalStats: Screenshots count:', screenshotsCount);

      if (screenshotsError) {
        console.error('Error fetching screenshots count:', screenshotsError);
        throw screenshotsError;
      }

      const finalStats = {
        totalCategories: categoriesCount || 0,
        totalVideos: videosCount || 0,
        totalScreenshots: screenshotsCount || 0,
      };

      console.log('📊 useTotalStats: Final stats:', finalStats);
      setStats(finalStats);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, refetch: fetchStats };
};