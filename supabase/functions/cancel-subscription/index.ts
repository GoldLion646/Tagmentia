import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch Stripe configuration from database
    const { data: stripeConfig, error: stripeConfigError } = await supabaseClient.rpc('get_stripe_configuration');
    
    if (stripeConfigError) {
      logStep("Failed to fetch Stripe configuration", { error: stripeConfigError });
      throw new Error("Failed to fetch Stripe configuration. Please configure Stripe in Admin > Configuration.");
    }
    
    if (!stripeConfig || stripeConfig.length === 0) {
      throw new Error("Stripe is not configured. Please configure Stripe keys in Admin > Configuration.");
    }
    
    const config = stripeConfig[0];
    
    if (!config.enabled) {
      throw new Error("Stripe integration is disabled. Please enable it in Admin > Configuration.");
    }
    
    const stripeKey = config.secret_key;
    
    if (!stripeKey || !stripeKey.startsWith("sk_")) {
      throw new Error("Invalid Stripe secret key configured. Please update the Stripe configuration in Admin > Configuration.");
    }
    
    logStep("Stripe key verified from database");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get user's active subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No active subscription found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Found active subscription", { 
      subscriptionId: subscription.stripe_subscription_id,
      planId: subscription.plan_id,
      hasStripeId: !!subscription.stripe_subscription_id
    });

    // Handle cancellation based on subscription type
    let periodEndDate;
    
    if (subscription.stripe_subscription_id) {
      // This is a Stripe subscription - cancel it at period end
      const canceledSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: true }
      );
      logStep("Stripe subscription set to cancel at period end", { 
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      });
      
      periodEndDate = new Date(canceledSubscription.current_period_end * 1000);
    } else {
      // This is a non-Stripe subscription (promo code, manual, etc.) - cancel immediately
      logStep("Non-Stripe subscription found, canceling immediately");
      periodEndDate = new Date(); // Cancel immediately
    }

    // Update subscription status in database
    // For Stripe subscriptions: set to 'canceling' with end_date for period end
    // For non-Stripe subscriptions: set to 'canceled' immediately
    const newStatus = subscription.stripe_subscription_id ? 'canceling' : 'cancelled';
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .update({ 
        status: newStatus,
        end_date: periodEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) {
      logStep("Error updating subscription status", { error: updateError });
      throw new Error("Failed to update subscription status");
    }

    // Handle post-cancellation logic based on subscription type
    if (subscription.stripe_subscription_id) {
      // Stripe subscription - user keeps access until period end
      logStep("Subscription scheduled for cancellation", {
        currentPeriodEnd: periodEndDate.toISOString(),
        message: "User will continue to have access until the end of their current billing period"
      });
    } else {
      // Non-Stripe subscription - move to Free Plan immediately
      const { data: freePlan, error: freePlanError } = await supabaseClient
        .from('plans')
        .select('id')
        .eq('name', 'Free Plan')
        .single();

      if (!freePlanError && freePlan) {
        const { error: insertError } = await supabaseClient
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_id: freePlan.id,
            start_date: new Date().toISOString(),
            status: 'active'
          });

        if (insertError) {
          logStep("Warning: Could not set Free Plan", { error: insertError });
        } else {
          logStep("User moved to Free Plan immediately");
        }
      }
    }

    logStep("Subscription cancellation completed successfully");

    const message = subscription.stripe_subscription_id 
      ? `Subscription cancellation scheduled. You will continue to have access to your current plan until ${periodEndDate.toLocaleDateString()}.`
      : "Subscription canceled successfully. You have been moved to the Free Plan.";

    return new Response(JSON.stringify({ 
      success: true,
      message: message,
      accessUntil: periodEndDate.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});