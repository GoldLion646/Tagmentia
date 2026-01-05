import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const summaryId = url.pathname.split('/').pop()?.replace('/regenerate', '');

    if (!summaryId) {
      return new Response(
        JSON.stringify({ error: "Missing summary ID in URL" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Get summary and verify ownership
    const { data: summary, error: summaryError } = await supabaseService
      .from('video_summaries')
      .select(`
        *,
        videos!inner(user_id, url, title)
      `)
      .eq('id', summaryId)
      .single();

    if (summaryError || !summary) {
      return new Response(
        JSON.stringify({ error: "Summary not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const { data: isAdmin } = await supabaseService.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!isAdmin && summary.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check daily quota
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySummaries, error: quotaError } = await supabaseService
      .from('video_summaries')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`);

    if (quotaError) {
      console.error('Quota check error:', quotaError);
      return new Response(
        JSON.stringify({ error: "Failed to check daily quota" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const dailyCount = todaySummaries?.length || 0;
    const DAILY_LIMIT = 20;

    if (dailyCount >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: "Daily summary quota exceeded", 
          quota: { used: dailyCount, limit: DAILY_LIMIT }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Reset summary status and increment regeneration count
    const { error: updateError } = await supabaseService
      .from('video_summaries')
      .update({
        status: 'queued',
        error_message: null,
        regeneration_count: (summary.regeneration_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId);

    if (updateError) {
      console.error('Update summary error:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update summary status" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Trigger regeneration
    const { error: funcError } = await supabaseService.functions.invoke('ai-video-summary', {
      body: {
        video_url: summary.videos.url,
        video_title: summary.videos.title,
        video_id: summary.video_id,
        summary_id: summaryId,
        regenerate: true
      }
    });

    if (funcError) {
      console.error('AI summary function error:', funcError);
      await supabaseService
        .from('video_summaries')
        .update({ 
          status: 'failed',
          error_message: funcError.message 
        })
        .eq('id', summaryId);

      return new Response(
        JSON.stringify({ error: "Failed to start regeneration process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Summary regeneration started",
        status: "queued",
        summary_id: summaryId,
        regeneration_count: (summary.regeneration_count || 0) + 1
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
    );

  } catch (error) {
    console.error("Regenerate summary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});