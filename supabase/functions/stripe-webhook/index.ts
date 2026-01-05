import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { method: req.method, url: req.url });

    // Initialize Supabase to fetch Stripe config
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch Stripe configuration from database
    const { data: stripeConfig, error: stripeConfigError } = await supabase.rpc('get_stripe_configuration');
    
    if (stripeConfigError) {
      logStep("Failed to fetch Stripe configuration", { error: stripeConfigError });
      throw new Error("Failed to fetch Stripe configuration");
    }
    
    if (!stripeConfig || stripeConfig.length === 0) {
      throw new Error("Stripe is not configured");
    }
    
    const config = stripeConfig[0];
    
    if (!config.enabled) {
      throw new Error("Stripe integration is disabled");
    }
    
    const stripeKey = config.secret_key;
    const webhookSecret = config.webhook_secret;
    
    if (!stripeKey?.startsWith("sk_")) {
      throw new Error("Invalid Stripe secret key configured");
    }
    
    if (!webhookSecret?.startsWith("whsec_")) {
      throw new Error("Invalid Stripe webhook secret configured - must start with 'whsec_'");
    }
    
    logStep("Stripe configuration loaded from database");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    logStep("Verifying webhook signature");
    
    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    logStep("Webhook verified", { type: event.type, id: event.id });

    // Supabase client already initialized above for config fetch

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        // Get user info from metadata
        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const billingInterval = session.metadata?.billing_interval;

        if (!userId || !planId || !billingInterval) {
          throw new Error("Missing required metadata in checkout session");
        }

        // Create subscription record
        const endDate = new Date();
        if (billingInterval === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: planId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: 'active',
            billing_interval: billingInterval,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
          }, { onConflict: 'user_id' });

        if (subscriptionError) {
          throw new Error(`Failed to create subscription: ${subscriptionError.message}`);
        }

        logStep("Subscription activated successfully", { userId, planId, billingInterval });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer
        });

        if (invoice.subscription && typeof invoice.subscription === 'string') {
          // Extend subscription period for recurring payments
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subscription) {
            const currentEndDate = new Date(subscription.end_date);
            const newEndDate = new Date(currentEndDate);
            
            if (subscription.billing_interval === 'monthly') {
              newEndDate.setMonth(newEndDate.getMonth() + 1);
            } else {
              newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            }

            const { error: updateError } = await supabase
              .from('user_subscriptions')
              .update({ 
                end_date: newEndDate.toISOString(),
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', invoice.subscription);

            if (updateError) {
              throw new Error(`Failed to extend subscription: ${updateError.message}`);
            }

            logStep("Subscription extended successfully", { subscriptionId: invoice.subscription });
          }
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep(`Processing ${event.type}`, { 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        const status = subscription.status === 'active' ? 'active' : 'canceled';

        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          throw new Error(`Failed to update subscription status: ${updateError.message}`);
        }

        logStep(`Subscription status updated to ${status}`, { subscriptionId: subscription.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("Webhook processing failed", { error: message });
    
    return new Response(JSON.stringify({ 
      error: message,
      received: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400, // Return 400 for webhook errors so Stripe retries
    });
  }
});