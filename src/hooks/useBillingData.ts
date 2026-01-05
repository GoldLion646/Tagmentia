import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BillingStats {
  totalActiveSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  nextBillingCycleRevenue: number;
  subscriptionGrowth: number;
  revenueGrowth: number;
}

export interface SubscriptionDistribution {
  name: string;
  value: number;
  color: string;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  plan: string;
  startDate: string;
  lastPayment: string | null;
  status: string;
}

export const useBillingData = () => {
  const [stats, setStats] = useState<BillingStats>({
    totalActiveSubscriptions: 0,
    monthlyRecurringRevenue: 0,
    annualRecurringRevenue: 0,
    nextBillingCycleRevenue: 0,
    subscriptionGrowth: 0,
    revenueGrowth: 0,
  });
  const [subscriptionDistribution, setSubscriptionDistribution] = useState<SubscriptionDistribution[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Fetch active subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('status', 'active');

      if (subscriptionsError) throw subscriptionsError;

      if (!subscriptions || subscriptions.length === 0) {
        setStats({
          totalActiveSubscriptions: 0,
          monthlyRecurringRevenue: 0,
          annualRecurringRevenue: 0,
          nextBillingCycleRevenue: 0,
          subscriptionGrowth: 0,
          revenueGrowth: 0,
        });
        setSubscriptionDistribution([]);
        setRevenueData([]);
        setSubscribers([]);
        return;
      }

      // Fetch plans data
      const planIds = [...new Set(subscriptions.map(sub => sub.plan_id))];
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .in('id', planIds);

      if (plansError) throw plansError;

      // Fetch user profiles
      const userIds = [...new Set(subscriptions.map(sub => sub.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create lookup objects
      const plansLookup = plans?.reduce((acc, plan) => {
        acc[plan.id] = plan;
        return acc;
      }, {} as Record<string, any>) || {};

      const profilesLookup = profiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};

      // Combine the data
      const activeSubscriptions = subscriptions.map(sub => ({
        ...sub,
        plans: plansLookup[sub.plan_id],
        profiles: profilesLookup[sub.user_id]
      }));

      // Calculate stats
      const totalActive = activeSubscriptions?.length || 0;
      const monthlyRevenue = activeSubscriptions?.reduce((sum, sub) => {
        const plan = sub.plans as any;
        if (sub.billing_interval === 'monthly') {
          return sum + (plan?.price_monthly || 0);
        } else if (sub.billing_interval === 'yearly') {
          return sum + ((plan?.price_yearly || 0) / 12);
        }
        return sum;
      }, 0) || 0;

      const annualRevenue = monthlyRevenue * 12;

      setStats({
        totalActiveSubscriptions: totalActive,
        monthlyRecurringRevenue: monthlyRevenue,
        annualRecurringRevenue: annualRevenue,
        nextBillingCycleRevenue: monthlyRevenue, // Simplified calculation
        subscriptionGrowth: 0, // Would need historical data
        revenueGrowth: 0, // Would need historical data
      });

      // Calculate subscription distribution
      const planDistribution: { [key: string]: number } = {};
      const planColors: { [key: string]: string } = {
        'Free': '#94A3B8',
        'Basic': '#3B82F6',
        'Pro': '#10B981',
        'Premium': '#8B5CF6',
        'Enterprise': '#374151',
      };

      activeSubscriptions?.forEach(sub => {
        const plan = sub.plans as any;
        const planName = plan?.name || 'Unknown';
        planDistribution[planName] = (planDistribution[planName] || 0) + 1;
      });

      const distribution = Object.entries(planDistribution).map(([name, value]) => ({
        name,
        value,
        color: planColors[name] || '#6B7280',
      }));

      setSubscriptionDistribution(distribution);

      // Generate revenue data (simplified - would need historical data for real implementation)
      const currentMonth = new Date().getMonth();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const revenueHistory = [];
      
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        revenueHistory.push({
          month: months[monthIndex],
          revenue: monthlyRevenue * (0.8 + Math.random() * 0.4), // Simplified mock growth
        });
      }

      setRevenueData(revenueHistory);

      // Format subscribers data
      const formattedSubscribers = activeSubscriptions?.map(sub => {
        const plan = sub.plans as any;
        const profile = sub.profiles as any;
        
        return {
          id: sub.id,
          name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
          email: profile?.email || 'No email',
          plan: plan?.name || 'Unknown',
          startDate: new Date(sub.start_date).toLocaleDateString(),
          lastPayment: sub.updated_at ? new Date(sub.updated_at).toLocaleDateString() : null,
          status: sub.status === 'active' && plan?.name !== 'Free Plan' ? 'Paid' : sub.status === 'active' ? 'Free' : sub.status,
        };
      }) || [];

      setSubscribers(formattedSubscribers);

    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  return {
    stats,
    subscriptionDistribution,
    revenueData,
    subscribers,
    loading,
    error,
    refetch: fetchBillingData,
  };
};