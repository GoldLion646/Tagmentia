import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Infinity, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface UpgradePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  feature: string;
  limitType: 'categories' | 'videos' | 'ai_summary' | 'plan_upgrade';
}

export const UpgradePromptModal = ({ 
  open, 
  onOpenChange, 
  currentPlan, 
  feature,
  limitType 
}: UpgradePromptModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = [
    {
      name: 'Free Plan',
      planId: '9828dd80-d6fc-4e14-a030-fe5271ebbbc7',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxCategories: 3,
      maxVideosPerCategory: 10,
      maxScreenshots: 5,
      storageQuotaMB: null,
      aiSummary: false,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      current: currentPlan === 'Free Plan'
    },
    {
      name: 'Premium Plan',
      planId: '15c0c510-8867-4db5-808a-e2f4678cb596',
      monthlyPrice: 2.99,
      yearlyPrice: 29.99, // ~17% discount ($2.50/month)
      maxCategories: 'Unlimited',
      maxVideosPerCategory: 'Unlimited',
      maxScreenshots: 'Unlimited',
      storageQuotaMB: 500,
      aiSummary: false,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      current: currentPlan === 'Premium Plan',
      recommended: true // Premium is now the recommended plan
    },
    // Gold Plan disabled across all platforms
    // {
    //   name: 'Gold Plan',
    //   planId: 'ac0e82e9-1e6e-4108-8f30-2a1c597ffaf5',
    //   monthlyPrice: 24.99,
    //   yearlyPrice: 199.99,
    //   maxCategories: 'Unlimited',
    //   maxVideosPerCategory: 'Unlimited',
    //   aiSummary: true,
    //   color: 'text-yellow-600',
    //   bgColor: 'bg-yellow-50',
    //   current: currentPlan === 'Gold Plan',
    //   recommended: true
    // }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (billingInterval === 'monthly') {
      return plan.monthlyPrice;
    } else {
      // For yearly, show monthly equivalent
      return plan.yearlyPrice / 12;
    }
  };

  const getDiscountPercentage = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyAnnual = plan.monthlyPrice * 12;
    const discount = ((monthlyAnnual - plan.yearlyPrice) / monthlyAnnual) * 100;
    return Math.round(discount);
  };

  const getPeriod = () => {
    return billingInterval === 'monthly' ? '/month' : '/year';
  };

  const getRecommendedPlans = () => {
    // Gold Plan is disabled - only show Free and Premium plans
    const availablePlans = plans; // Gold Plan already removed from plans array
    
    if (limitType === 'ai_summary') {
      return availablePlans; // Show available plans for AI summary limitation
    }
    // Always show available plans for comparison
    return availablePlans;
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    setSelectedPlanId(planId);
    
    try {
      console.log('🚀 Starting checkout for plan:', planId);
      console.log('🚀 Billing interval:', billingInterval);
      console.log('🚀 Origin:', window.location.origin);
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { plan_id: planId, billing_interval: billingInterval, redirect_base: window.location.origin }
      });
      
      console.log('🚀 Checkout response data:', data);
      console.log('🚀 Checkout response error:', error);
      
      // Handle structured error from the function (returns 200 with { error })
      if (data?.error) {
        console.error('🚀 Data contains error:', data.error);
        toast({ title: 'Upgrade Failed', description: data.error, variant: 'destructive' });
        return;
      }

      if (error) {
        console.error('🚀 Response has error object:', error);
        let message = 'Failed to start checkout process. Please try again.';

        // Try to extract error from function response
        try {
          const response = (error as any)?.context?.response;
          if (response && typeof response.text === 'function') {
            const errorText = await response.text();
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) message = errorJson.error;
              } catch {
                if (errorText.length < 200 && errorText.trim()) message = errorText;
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing checkout response:', parseError);
        }

        // Provide user-friendly messages for common issues
        if (message.includes('STRIPE_SECRET_KEY') || message.includes('stripe secret key')) {
          message = 'Payment system configuration issue. Please contact support.';
        } else if (message.includes('Plan not found')) {
          message = 'Selected plan is not available. Please try a different plan or contact support.';
        } else if (message.includes('User not authenticated')) {
          message = 'Please log in again and try upgrading.';
        }

        toast({ title: 'Upgrade Failed', description: message, variant: 'destructive' });
        return;
      }
      
      console.log('🚀 Checking for URL in data:', data);
      
      if (data?.url) {
        console.log('🚀 SUCCESS! URL found:', data.url);
        console.log('🚀 Attempting redirect to:', data.url);
        
        // Redirect immediately - don't reset loading state as we're leaving the page
        window.location.href = data.url;
      } else {
        console.error('No checkout URL received:', data);
        toast({ title: 'Upgrade Failed', description: 'Could not start checkout session. Please try again.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Upgrade checkout exception:', err);
      
      let errorMessage = 'An unexpected error occurred. Please try again or contact support.';
      
      if (err.message) {
        errorMessage = err.message;
        
        // Handle specific error types
        if (err.message.includes('NetworkError') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('not authenticated')) {
          errorMessage = 'Please log in again and try upgrading.';
        }
      }
      
      toast({ 
        title: 'Upgrade Failed', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      // Only reset loading if we're still on the page (redirect didn't happen)
      setTimeout(() => {
        setLoading(false);
        setSelectedPlanId(null);
      }, 100);
    }
  };

  const getFeatureMessage = () => {
    switch (limitType) {
      case 'categories':
        return `You've reached the maximum number of categories (${currentPlan === 'Free Plan' ? '3' : 'Unlimited'}) for your ${currentPlan}.`;
      case 'videos':
        return `You've reached the maximum number of videos per category (${currentPlan === 'Free Plan' ? '10' : 'Unlimited'}) for your ${currentPlan}.`;
      case 'ai_summary':
        return `AI Summary feature is currently unavailable.`;
      default:
        return 'This feature requires a plan upgrade.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl justify-center">
            <Crown className="w-6 h-6 text-yellow-500" />
            Upgrade Required
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Feature limitation message */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="mb-3">
              <Badge variant="secondary" className="text-xs">
                Your current plan: {currentPlan}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {getFeatureMessage()}
            </p>
            <p className="font-medium text-foreground">
              Upgrade to unlock {feature} and more!
            </p>
          </div>

          {/* Billing interval toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-muted rounded-lg p-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  billingInterval === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Plan comparison - Centered for 2 plans */}
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {getRecommendedPlans().map((plan) => (
              <Card 
                key={plan.name}
                className={`relative transition-all duration-200 hover:shadow-lg w-full sm:w-[280px] ${
                  plan.recommended ? 'ring-2 ring-primary' : ''
                } ${plan.current ? 'opacity-75' : ''}`}
              >
                {plan.recommended && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Recommended
                  </Badge>
                )}
                
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${plan.color}`}>
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mt-2">
                        <span className="text-2xl font-bold text-foreground">
                          ${getPrice(plan).toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {billingInterval === 'monthly' ? '/month' : '/month'}
                        </span>
                        {billingInterval === 'yearly' && getDiscountPercentage(plan) > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">
                            {plan.name === 'Premium Plan' ? '17% discount' : getDiscountPercentage(plan) + '% discount'}
                          </Badge>
                        )}
                      </div>
                      {billingInterval === 'yearly' && plan.yearlyPrice > 0 && (
                        <div className="text-center">
                          <span className="text-sm text-muted-foreground">
                            ${plan.yearlyPrice.toFixed(2)} yearly
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Categories</span>
                        <span className="font-medium">
                          {plan.maxCategories === 'Unlimited' ? (
                            <div className="flex items-center gap-1">
                              <Infinity className="w-4 h-4" />
                              Unlimited
                            </div>
                          ) : (
                            `${plan.maxCategories} max`
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Videos per Category</span>
                        <span className="font-medium">
                          {plan.maxVideosPerCategory === 'Unlimited' ? (
                            <div className="flex items-center gap-1">
                              <Infinity className="w-4 h-4" />
                              Unlimited
                            </div>
                          ) : (
                            `${plan.maxVideosPerCategory} max`
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Max Snapshots</span>
                        <span className="font-medium">
                          {plan.maxScreenshots === 'Unlimited' ? (
                            <div className="flex items-center gap-1">
                              <Infinity className="w-4 h-4" />
                              Unlimited
                            </div>
                          ) : (
                            `${plan.maxScreenshots} max`
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>Storage Quota</span>
                        <span className="font-medium">
                          {plan.storageQuotaMB ? `${plan.storageQuotaMB} MB` : 'Unlimited'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span>AI Summary</span>
                        <span className={`font-medium ${plan.aiSummary ? 'text-green-600' : 'text-gray-400'}`}>
                          {plan.aiSummary ? (
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              Enabled
                            </div>
                          ) : (
                            'Disabled'
                          )}
                        </span>
                      </div>
                    </div>

                    {!plan.current && (
                      <Button 
                        onClick={() => handleUpgrade(plan.planId)}
                        className="w-full"
                        variant={plan.recommended ? "default" : "outline"}
                        disabled={loading}
                      >
                        {loading && selectedPlanId === plan.planId ? 'Processing...' : `Upgrade to ${plan.name}`}
                      </Button>
                    )}
                    
                    {plan.current && (
                      <Badge 
                        className="w-full justify-center py-2 text-white"
                        style={{ backgroundColor: '#545DEA' }}
                      >
                        Current Plan
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Stay in current plan button */}
          <div className="flex justify-center pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6">
              Stay in Current Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};