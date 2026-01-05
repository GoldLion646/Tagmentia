import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== create-subscription-checkout START ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting checkout creation...");
    const body = await req.json();
    console.log("Request body parsed:", body);
    const { plan_id, billing_interval, redirect_base } = body;
    
    if (!plan_id || !billing_interval) {
      console.error("Missing required parameters:", { plan_id, billing_interval });
      throw new Error("Missing plan_id or billing_interval");
    }

    // Initialize Supabase with service role for secure operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header exists:", !!authHeader);
    
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError) {
      console.error("User authentication error:", userError);
      throw new Error("User not authenticated: " + userError.message);
    }
    
    if (!user?.email) {
      console.error("User has no email:", user);
      throw new Error("User not authenticated or email not available");
    }
    
    console.log("User authenticated:", user.email);

    // Get plan details
    const { data: plan, error: planError } = await supabaseService
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('enabled', true)
      .single();

    if (planError) {
      console.error("Plan query error:", planError);
      throw new Error("Plan not found: " + planError.message);
    }
    
    if (!plan) {
      console.error("Plan not found or disabled");
      throw new Error("Plan not found or disabled");
    }
    
    console.log("Plan found:", plan.name);

    // Fetch Stripe configuration from database
    const { data: stripeConfig, error: stripeConfigError } = await supabaseService.rpc('get_stripe_configuration');
    
    if (stripeConfigError) {
      console.error("Failed to fetch Stripe configuration:", stripeConfigError);
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
    console.log("Stripe key from database:", Boolean(stripeKey), "startsWith sk_:", stripeKey?.startsWith("sk_"));

    if (!stripeKey || !stripeKey.startsWith("sk_")) {
      throw new Error("Invalid Stripe secret key configured. Please update the Stripe configuration in Admin > Configuration with a valid secret key (must start with 'sk_').");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
    }

    // Resolve the Stripe Price ID (accepts either a Price ID or a Product ID)
    let priceId: string | null | undefined =
      billing_interval === 'yearly' ? plan.stripe_yearly_price_id : plan.stripe_monthly_price_id;

    if (!priceId) {
      throw new Error(`No Stripe identifier configured for ${plan.name} ${billing_interval}. Please set stripe_${billing_interval}_price_id on the plan or ensure the product has an active price.`);
    }

    if (priceId.startsWith('prod_')) {
      console.log('Configured identifier is a Product ID; resolving matching Price for interval:', billing_interval);
      const interval = billing_interval === 'yearly' ? 'year' : 'month';
      // Try to find an active price for this product that matches the interval
      const priceList = await stripe.prices.list({ product: priceId, active: true, limit: 20 });
      const matching = priceList.data.find((p: any) => p.recurring?.interval === interval);
      if (matching) {
        priceId = matching.id;
        console.log('Resolved Price ID from product + interval:', priceId);
      } else {
        // Fall back to product.default_price
        const product = await stripe.products.retrieve(priceId);
        const defaultPriceId = typeof product.default_price === 'string' ? product.default_price : product.default_price?.id;
        if (defaultPriceId) {
          priceId = defaultPriceId;
          console.log('Falling back to product default_price:', priceId);
        }
      }
    }

    if (!priceId || !priceId.startsWith('price_')) {
      throw new Error(`Could not resolve a valid Stripe Price ID for ${plan.name} (${billing_interval}). Please configure a Price for this product in Stripe and update the plan.`);
    }

    console.log("Using Stripe Price ID:", priceId);

    // Validate that the Price exists and is active in Stripe
    try {
      const priceObject = await stripe.prices.retrieve(priceId);
      if (!priceObject.active) {
        throw new Error(`The price for ${plan.name} (${billing_interval}) is inactive in Stripe. Please activate it or configure a different price in the Subscription Management page.`);
      }
      console.log("Price validated successfully:", {
        id: priceObject.id,
        active: priceObject.active,
        currency: priceObject.currency,
        unit_amount: priceObject.unit_amount,
      });
    } catch (priceError: any) {
      console.error("Price validation error:", priceError);
      if (priceError.type === 'StripeInvalidRequestError') {
        throw new Error(`The Stripe Price ID "${priceId}" for ${plan.name} (${billing_interval}) does not exist in your Stripe account. Please update the plan configuration in Admin > Subscription Management with the correct Price ID from your Stripe Dashboard (https://dashboard.stripe.com/products). Make sure you're using Price IDs from the same Stripe account (test/live) as your configured API keys.`);
      }
      throw new Error(`Unable to validate Stripe price: ${priceError.message}`);
    }

    // Determine base URL for redirects
    const originHeader = req.headers.get("origin") || undefined;
    const refererHeader = req.headers.get("referer") || undefined;
    let baseUrl = redirect_base || originHeader;
    if (!baseUrl && refererHeader) {
      try {
        baseUrl = new URL(refererHeader).origin;
      } catch (e) {
        console.warn("Failed to parse referer header:", refererHeader);
      }
    }
    if (!baseUrl) {
      baseUrl = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5173";
    }
    console.log("Using base URL for Stripe redirects:", baseUrl);

    // Create checkout session using pre-configured Stripe Price ID
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId, // Use pre-configured Price ID instead of dynamic price_data
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=canceled`,
      metadata: {
        user_id: user.id,
        plan_id: plan_id,
        billing_interval: billing_interval,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Checkout error:", error);
    // Return 200 with structured error so clients can show a helpful message instead of a generic non-2xx error
    const message = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
    return new Response(JSON.stringify({ error: message, ok: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});