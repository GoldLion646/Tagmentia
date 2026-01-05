import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  videoCount: number;
  lastAccessed: string;
}

export const useRecentCategories = (limit: number = 5) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      // Get categories with video counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, color, description, updated_at')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        return;
      }

      // Get video counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);
          
          return {
            id: category.id,
            name: category.name,
            color: category.color || 'blue-ocean', // Just the color name, not prefixed
            description: category.description,
            videoCount: count || 0,
            lastAccessed: getTimeAgo(category.updated_at)
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error in fetchCategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchCategories();
  }, [limit]);

  return {
    categories,
    loading,
    refetch: fetchCategories
  };
};