import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("=== manage-subscriptions START ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    console.log("OPTIONS request - returning CORS headers");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Parsing request body...");
    const { action, data } = await req.json();
    console.log("Request parsed - action:", action, "data:", data);

    // Initialize Supabase with service role for admin operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user and verify admin role
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseService.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    let result;

    switch (action) {
      case 'update_plan':
        const { id, ...planUpdates } = data;
        const { data: updatedPlan, error: updateError } = await supabaseService
          .from('plans')
          .update(planUpdates)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = { plan: updatedPlan };
        break;

      case 'create_plan':
        const { name, price_monthly, price_yearly, max_categories, max_videos_per_category, max_screenshots_per_user, storage_quota_mb, features, enabled, stripe_monthly_price_id, stripe_yearly_price_id } = data;
        const { data: newPlan, error: createPlanError } = await supabaseService
          .from('plans')
          .insert({
            name,
            price_monthly,
            price_yearly,
            max_categories,
            max_videos_per_category,
            max_screenshots_per_user: max_screenshots_per_user ?? null,
            storage_quota_mb: storage_quota_mb ?? null,
            features: features ?? {},
            enabled: enabled ?? true,
            stripe_monthly_price_id,
            stripe_yearly_price_id
          })
          .select()
          .single();

        if (createPlanError) throw createPlanError;
        result = { plan: newPlan };
        break;

      case 'delete_plan':
        const { id: planId } = data;
        const { error: deletePlanError } = await supabaseService
          .from('plans')
          .delete()
          .eq('id', planId);

        if (deletePlanError) throw deletePlanError;
        result = { success: true };
        break;
      case 'create_promotion':
        const { code, plan_id, validity_period } = data;
        
        // Calculate validity days based on period
        const validityDaysMap: Record<string, number> = {
          "1 Month": 30,
          "3 Months": 90,
          "6 Months": 180,
          "1 Year": 365,
          "Lifetime": 36500 // 100 years for "lifetime"
        };

        const validityDays = validityDaysMap[validity_period] || 30;

        const { data: promotion, error: promoError } = await supabaseService
          .from('promotions')
          .insert({
            code,
            plan_id,
            validity_period,
            validity_days: validityDays,
            status: 'active'
          })
          .select()
          .single();

        if (promoError) throw promoError;
        result = { promotion };
        break;

      case 'get_promotions':
        const { data: promotions, error: getPromoError } = await supabaseService
          .from('promotions')
          .select(`
            *,
            plans!inner(name)
          `)
          .in('status', ['active', 'frozen'])
          .order('created_at', { ascending: false });

        if (getPromoError) throw getPromoError;
        result = { promotions };
        break;

      case 'get_plans':
        const { data: plans, error: getPlansError } = await supabaseService
          .from('plans')
          .select('*')
          .order('price_monthly', { ascending: true });

        if (getPlansError) throw getPlansError;
        result = { plans };
        break;

      case 'check_stripe_env':
        const { data: stripeConfig, error: stripeConfigError } = await supabaseService
          .rpc('get_stripe_configuration');
        
        if (stripeConfigError) throw stripeConfigError;
        
        const config = stripeConfig?.[0];
        const secretKey = config?.secret_key || '';
        result = { 
          present: Boolean(secretKey && secretKey.length > 0), 
          startsWithSk: secretKey ? secretKey.startsWith('sk_') : false 
        };
        break;

      case 'activate_promotion':
        const { promo_code, user_id } = data;
        const { data: activationResult, error: activationError } = await supabaseService
          .rpc('activate_promotion', {
            promo_code_input: promo_code,
            user_uuid: user_id
          });

        if (activationError) throw activationError;
        result = { activation: activationResult[0] };
        break;

      case 'freeze_promotion':
        const { id: freezeId } = data;
        const { data: frozenPromo, error: freezeError } = await supabaseService
          .from('promotions')
          .update({ status: 'frozen' })
          .eq('id', freezeId)
          .select()
          .single();

        if (freezeError) throw freezeError;
        result = { promotion: frozenPromo };
        break;

      case 'unfreeze_promotion':
        const { id: unfreezeId } = data;
        const { data: unfrozenPromo, error: unfreezeError } = await supabaseService
          .from('promotions')
          .update({ status: 'active' })
          .eq('id', unfreezeId)
          .select()
          .single();

        if (unfreezeError) throw unfreezeError;
        result = { promotion: unfrozenPromo };
        break;

      case 'delete_promotion':
        const { id: deleteId } = data;
        const { error: deleteError } = await supabaseService
          .from('promotions')
          .delete()
          .eq('id', deleteId);

        if (deleteError) throw deleteError;
        result = { success: true };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Subscription management error:", error);
    // Return 200 with structured error to avoid generic non-2xx on client
    const message = (error instanceof Error ? error.message : String(error)) || 'Unknown error';
    return new Response(JSON.stringify({ error: message, ok: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});