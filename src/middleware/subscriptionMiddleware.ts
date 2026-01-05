import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionCheck {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

class SubscriptionMiddleware {
  private static instance: SubscriptionMiddleware;
  private userLimitsCache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SubscriptionMiddleware {
    if (!SubscriptionMiddleware.instance) {
      SubscriptionMiddleware.instance = new SubscriptionMiddleware();
    }
    return SubscriptionMiddleware.instance;
  }

  private async getUserLimits(userId: string) {
    const cacheKey = `limits_${userId}`;
    const now = Date.now();
    
    // Check cache first
    if (this.userLimitsCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.userLimitsCache.get(cacheKey);
    }

    // Fetch from database
    const { data, error } = await supabase.rpc('get_user_plan_limits', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error fetching user limits:', error);
      return null;
    }

    const limits = data?.[0] || null;
    
    // Cache the result
    this.userLimitsCache.set(cacheKey, limits);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
    
    return limits;
  }

  public async checkCategoryCreation(userId: string): Promise<SubscriptionCheck> {
    try {
      const { data: canCreate, error } = await supabase.rpc('can_create_category', {
        user_uuid: userId
      });

      if (error) {
        return { allowed: false, reason: 'Error checking subscription limits' };
      }

      if (!canCreate) {
        const limits = await this.getUserLimits(userId);
        return {
          allowed: false,
          reason: `You've reached your plan limit of ${limits?.max_categories} categories`,
          currentUsage: limits?.current_categories,
          limit: limits?.max_categories
        };
      }

      return { allowed: true };
    } catch (err) {
      console.error('Error in checkCategoryCreation:', err);
      return { allowed: false, reason: 'Unexpected error checking limits' };
    }
  }

  public async checkVideoAddition(userId: string, categoryId: string): Promise<SubscriptionCheck> {
    try {
      const { data: canAdd, error } = await supabase.rpc('can_add_video_to_category', {
        user_uuid: userId,
        category_uuid: categoryId
      });

      if (error) {
        return { allowed: false, reason: 'Error checking subscription limits' };
      }

      if (!canAdd) {
        const limits = await this.getUserLimits(userId);
        
        // Get current video count for this category
        const { count: currentCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', categoryId)
          .eq('user_id', userId);

        return {
          allowed: false,
          reason: `You've reached your plan limit of ${limits?.max_videos_per_category} videos per category`,
          currentUsage: currentCount || 0,
          limit: limits?.max_videos_per_category
        };
      }

      return { allowed: true };
    } catch (err) {
      console.error('Error in checkVideoAddition:', err);
      return { allowed: false, reason: 'Unexpected error checking limits' };
    }
  }

  public async checkAISummaryAccess(userId: string): Promise<SubscriptionCheck> {
    try {
      const limits = await this.getUserLimits(userId);
      
      if (!limits?.ai_summary_enabled) {
        return {
          allowed: false,
          reason: 'AI Summary feature is only available for Gold Plan users'
        };
      }

      return { allowed: true };
    } catch (err) {  
      console.error('Error in checkAISummaryAccess:', err);
      return { allowed: false, reason: 'Unexpected error checking AI access' };
    }
  }

  public async checkFeatureAccess(userId: string, feature: 'categories' | 'videos' | 'ai_summary', categoryId?: string): Promise<SubscriptionCheck> {
    switch (feature) {
      case 'categories':
        return this.checkCategoryCreation(userId);
      case 'videos':
        if (!categoryId) {
          return { allowed: false, reason: 'Category ID required for video addition check' };
        }
        return this.checkVideoAddition(userId, categoryId);
      case 'ai_summary':
        return this.checkAISummaryAccess(userId);
      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  }

  public clearUserCache(userId: string) {
    const cacheKey = `limits_${userId}`;
    this.userLimitsCache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  public clearAllCache() {
    this.userLimitsCache.clear();
    this.cacheExpiry.clear();
  }
}

export const subscriptionMiddleware = SubscriptionMiddleware.getInstance();