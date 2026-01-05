import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPlanLimits {
  plan_name: string;
  max_categories: number;
  max_videos_per_category: number;
  max_screenshots_per_user: number;
  storage_quota_mb: number | null;
  ai_summary_enabled: boolean;
  current_categories: number;
  features: any;
}

export interface SubscriptionStatus {
  limits: UserPlanLimits | null;
  loading: boolean;
  error: string | null;
  canCreateCategory: boolean;
  canAddVideoToCategory: (categoryId: string) => Promise<boolean>;
  canUseAISummary: boolean;
  isFreePlan: boolean;
  isPremiumPlan: boolean;
  isGoldPlan: boolean;
}

export const useSubscriptionLimits = () => {
  const [limits, setLimits] = useState<UserPlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserLimits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: planData, error: planError } = await supabase.rpc('get_user_plan_limits', {
        user_uuid: user.id
      });

      if (planError) {
        console.error('Error fetching user plan limits:', planError);
        setError(planError.message);
        return;
      }

      if (planData && planData.length > 0) {
        setLimits(planData[0]);
      }
    } catch (err: any) {
      console.error('Error fetching subscription limits:', err);
      setError(err.message || 'Failed to fetch subscription limits');
    } finally {
      setLoading(false);
    }
  };

  const canCreateCategory = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: canCreate, error } = await supabase.rpc('can_create_category', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error checking category limits:', error);
        return false;
      }

      return canCreate || false;
    } catch (err) {
      console.error('Error checking category creation limits:', err);
      return false;
    }
  };

  const canAddVideoToCategory = async (categoryId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: canAdd, error } = await supabase.rpc('can_add_video_to_category', {
        user_uuid: user.id,
        category_uuid: categoryId
      });

      if (error) {
        console.error('Error checking video limits:', error);
        return false;
      }

      return canAdd || false;
    } catch (err) {
      console.error('Error checking video addition limits:', err);
      return false;
    }
  };

  const showUpgradePrompt = (feature: string, currentPlan: string) => {
    const upgradePlan = currentPlan === 'Free Plan' ? 'Premium' : 'Premium';
    toast({
      title: "Upgrade Required",
      description: `${feature} requires ${upgradePlan} plan. Upgrade to unlock this feature.`,
      variant: "destructive",
    });
  };

  const checkFeatureAccess = (feature: 'categories' | 'videos' | 'ai_summary'): boolean => {
    if (!limits) return false;

    switch (feature) {
      case 'categories':
        return limits.max_categories === -1 || limits.current_categories < limits.max_categories;
      case 'ai_summary':
        return limits.ai_summary_enabled;
      default:
        return true;
    }
  };

  useEffect(() => {
    fetchUserLimits();
  }, []);

  // Listen for auth changes to refresh limits
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserLimits();
      } else if (event === 'SIGNED_OUT') {
        setLimits(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    limits,
    loading,
    error,
    canCreateCategory,
    canAddVideoToCategory,
    canUseAISummary: limits?.ai_summary_enabled || false,
    isFreePlan: limits?.plan_name === 'Free Plan',
    isPremiumPlan: limits?.plan_name === 'Premium Plan',  
    isGoldPlan: limits?.plan_name === 'Gold Plan' || limits?.plan_name === 'Gold Plan (Admin)',
    showUpgradePrompt,
    checkFeatureAccess,
    refetch: fetchUserLimits,
  };
};