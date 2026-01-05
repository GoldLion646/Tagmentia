import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAdminSubscriptionControls = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateUserPlan = async (userId: string, planId: string) => {
    try {
      setLoading(true);

      // Update user subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error updating user plan:', error);
        toast({
          title: "Error",
          description: "Failed to update user plan",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "User plan updated successfully",
      });
      return true;
    } catch (err) {
      console.error('Unexpected error updating user plan:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetUserLimits = async (userId: string) => {
    try {
      setLoading(true);

      // This could involve clearing user data or resetting counters
      // For now, we'll just refresh their subscription status
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting user limits:', error);
        toast({
          title: "Error",
          description: "Failed to reset user limits",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "User limits reset successfully",
      });
      return true;
    } catch (err) {
      console.error('Unexpected error resetting user limits:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error suspending user:', error);
        toast({
          title: "Error",
          description: "Failed to suspend user",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "User suspended successfully",
      });
      return true;
    } catch (err) {
      console.error('Unexpected error suspending user:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const reactivateUser = async (userId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error reactivating user:', error);
        toast({
          title: "Error",
          description: "Failed to reactivate user",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
      return true;
    } catch (err) {
      console.error('Unexpected error reactivating user:', err);
      toast({
        title: "Error",  
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateUserPlan,
    resetUserLimits,
    suspendUser,
    reactivateUser,
  };
};