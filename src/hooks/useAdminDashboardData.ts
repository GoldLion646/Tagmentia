import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  videosCount: number;
  categoriesCount: number;
  userGrowthData: { month: string; users: number }[];
  subscriptionData: { name: string; value: number; color: string }[];
}

export const useAdminDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    videosCount: 0,
    categoriesCount: 0,
    userGrowthData: [],
    subscriptionData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Fetch active subscriptions
      const { count: activeSubscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gt.now()');

      if (subscriptionsError) throw subscriptionsError;

      // Fetch total videos (admin query to count all videos across all users)
      let totalVideosCount = 0;
      try {
        const { data: videosCountData, error: videosError } = await supabase
          .rpc('get_total_videos_count');

        if (videosError) {
          console.error('Error fetching videos count via RPC:', videosError);
          // Fallback to direct count if RPC fails
          const { count: videosCount, error: fallbackError } = await supabase
            .from('videos')
            .select('*', { count: 'exact', head: true });
          
          if (fallbackError) throw fallbackError;
          totalVideosCount = videosCount || 0;
        } else {
          totalVideosCount = Number(videosCountData) || 0;
        }
      } catch (err) {
        console.error('Error in videos count query:', err);
        totalVideosCount = 0;
      }

      // Fetch total categories (admin query to count all categories across all users)
      let totalCategoriesCount = 0;
      try {
        const { data: categoriesCountData, error: categoriesError } = await supabase
          .rpc('get_total_categories_count');

        if (categoriesError) {
          console.error('Error fetching categories count via RPC:', categoriesError);
          // Fallback to direct count if RPC fails
          const { count: categoriesCount, error: fallbackError } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true });
          
          if (fallbackError) throw fallbackError;
          totalCategoriesCount = categoriesCount || 0;
        } else {
          totalCategoriesCount = Number(categoriesCountData) || 0;
        }
      } catch (err) {
        console.error('Error in categories count query:', err);
        totalCategoriesCount = 0;
      }

      // Fetch user growth data (last 6 months)
      const { data: userGrowthRaw, error: growthError } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at');

      if (growthError) throw growthError;

      // Process user growth data by month
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const userGrowthMap = new Map<string, number>();
      
      // Initialize last 6 months with 0
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
        userGrowthMap.set(monthKey, 0);
      }

      // Count users by month
      userGrowthRaw?.forEach(user => {
        const date = new Date(user.created_at);
        const monthKey = `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
        userGrowthMap.set(monthKey, (userGrowthMap.get(monthKey) || 0) + 1);
      });

      const userGrowthData = Array.from(userGrowthMap.entries()).map(([monthYear, count]) => ({
        month: monthYear.split('-')[0],
        users: count
      }));

      // Fetch subscription distribution data
      const { data: subscriptionPlans, error: plansError } = await supabase
        .from('user_subscriptions')
        .select(`
          plan_id,
          plans!inner (
            name
          )
        `)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gt.now()');

      if (plansError) throw plansError;

      // Process subscription distribution
      const planCounts = new Map<string, number>();
      subscriptionPlans?.forEach(sub => {
        const planName = sub.plans?.name || 'Unknown';
        planCounts.set(planName, (planCounts.get(planName) || 0) + 1);
      });

      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const subscriptionData = Array.from(planCounts.entries()).map(([name, count], index) => ({
        name,
        value: count,
        color: colors[index % colors.length]
      }));

      // Calculate revenue (simplified - based on active subscriptions and plan prices)
      const { data: revenueData, error: revenueError } = await supabase
        .from('user_subscriptions')
        .select(`
          plans!inner (
            price_monthly,
            price_yearly
          ),
          billing_interval
        `)
        .eq('status', 'active')
        .or('end_date.is.null,end_date.gt.now()');

      if (revenueError) throw revenueError;

      let totalRevenue = 0;
      revenueData?.forEach(sub => {
        const plan = sub.plans;
        if (plan) {
          if (sub.billing_interval === 'yearly') {
            totalRevenue += Number(plan.price_yearly) || 0;
          } else {
            totalRevenue += Number(plan.price_monthly) || 0;
          }
        }
      });

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalRevenue,
        videosCount: totalVideosCount || 0,
        categoriesCount: totalCategoriesCount || 0,
        userGrowthData,
        subscriptionData,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { stats, loading, error, refetch: fetchDashboardData };
};