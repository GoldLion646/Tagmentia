import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting subscription check");

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plans!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Database error: ${subError.message}`);
    }

    if (!subscription) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: 'Free Plan',
        billing_interval: null,
        end_date: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify subscription is still active with Stripe
    let stripeSubscriptionActive = true;
    if (subscription.stripe_subscription_id) {
      // Fetch Stripe configuration from database
      const { data: stripeConfig } = await supabase.rpc('get_stripe_configuration');
      const stripeKey = stripeConfig?.[0]?.secret_key;
      
      if (stripeKey?.startsWith("sk_") && stripeConfig?.[0]?.enabled) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
        
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          stripeSubscriptionActive = stripeSubscription.status === 'active';
          logStep("Stripe subscription status checked", { 
            stripeStatus: stripeSubscription.status,
            active: stripeSubscriptionActive 
          });
        } catch (stripeError: any) {
          logStep("Failed to check Stripe subscription", { error: stripeError.message });
          stripeSubscriptionActive = false;
        }
      }
    }

    // Update database if Stripe shows subscription is no longer active
    if (!stripeSubscriptionActive && subscription.status === 'active') {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled' })
        .eq('user_id', user.id);
      
      logStep("Updated subscription status to canceled");
      
      return new Response(JSON.stringify({
        subscribed: false,
        plan: 'Free Plan',
        billing_interval: null,
        end_date: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if subscription has expired
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const isExpired = now > endDate;

    if (isExpired) {
      await supabase
        .from('user_subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', user.id);
      
      logStep("Subscription expired, updated status");
      
      return new Response(JSON.stringify({
        subscribed: false,
        plan: 'Free Plan',
        billing_interval: null,
        end_date: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Active subscription confirmed", { 
      plan: subscription.plans.name,
      endDate: subscription.end_date 
    });

    return new Response(JSON.stringify({
      subscribed: true,
      plan: subscription.plans.name,
      billing_interval: subscription.billing_interval,
      end_date: subscription.end_date,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("Error in subscription check", { error: message });
    
    return new Response(JSON.stringify({ 
      error: message,
      subscribed: false,
      plan: 'Free Plan' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 to avoid client-side errors
    });
  }
});