import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[STRIPE-VERIFICATION] Starting verification...");
    
    // Check for Stripe secret key
    const keyCandidates = [
      Deno.env.get("STRIPE_SECRET_KEY"),
      Deno.env.get("STRIPE_SECRET"),
      Deno.env.get("STRIPE_API_KEY"),
      Deno.env.get("STRIPE_KEY"),
    ];
    
    const key = keyCandidates.find((k) => typeof k === "string" && k.length > 0);
    const present = Boolean(key);
    const startsWithSk = present ? key!.startsWith("sk_") : false;
    
    console.log("[STRIPE-VERIFICATION] Key present:", present, "Starts with sk_:", startsWithSk);
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        present, 
        startsWithSk,
        message: present 
          ? (startsWithSk ? "Stripe key found and valid" : "Stripe key found but invalid format") 
          : "No Stripe key found"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  } catch (e) {
    console.error("[STRIPE-VERIFICATION] Error:", e);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: e instanceof Error ? e.message : String(e),
        present: false,
        startsWithSk: false 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );
  }
});