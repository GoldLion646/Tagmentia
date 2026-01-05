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
    const keyCandidates = [
      Deno.env.get("STRIPE_SECRET_KEY"),
      Deno.env.get("STRIPE_SECRET"),
      Deno.env.get("STRIPE_API_KEY"),
      Deno.env.get("STRIPE_KEY"),
    ];
    const key = keyCandidates.find((k) => typeof k === "string" && k.length > 0);

    const present = Boolean(key);
    const startsWithSk = present ? key!.startsWith("sk_") : false;

    return new Response(
      JSON.stringify({ ok: true, present, startsWithSk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});