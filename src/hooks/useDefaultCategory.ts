import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CATEGORY_KEY = 'tagmentia_default_category_id';

export function useDefaultCategory() {
  const [defaultCategoryId, setDefaultCategoryIdState] = useState<string | null>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      return localStorage.getItem(DEFAULT_CATEGORY_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDefaultCategory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Try to get from user profile first (if stored in database)
        // For now, we'll use localStorage as it's simpler and works across platforms
        const stored = localStorage.getItem(DEFAULT_CATEGORY_KEY);
        if (stored) {
          // Verify the category still exists and belongs to the user
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('id', stored)
            .eq('user_id', user.id)
            .single();

          if (category) {
            setDefaultCategoryIdState(stored);
          } else {
            // Category doesn't exist or doesn't belong to user, clear it
            localStorage.removeItem(DEFAULT_CATEGORY_KEY);
            setDefaultCategoryIdState(null);
          }
        }
      } catch (error) {
        console.error('Error loading default category:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDefaultCategory();
  }, []);

  const setDefaultCategory = async (categoryId: string | null) => {
    try {
      if (categoryId) {
        // Verify the category exists and belongs to the user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('id', categoryId)
          .eq('user_id', user.id)
          .single();

        if (category) {
          localStorage.setItem(DEFAULT_CATEGORY_KEY, categoryId);
          setDefaultCategoryIdState(categoryId);
        } else {
          throw new Error('Category not found or does not belong to user');
        }
      } else {
        localStorage.removeItem(DEFAULT_CATEGORY_KEY);
        setDefaultCategoryIdState(null);
      }
    } catch (error) {
      console.error('Error setting default category:', error);
      throw error;
    }
  };

  return {
    defaultCategoryId,
    setDefaultCategory,
    loading,
  };
}

