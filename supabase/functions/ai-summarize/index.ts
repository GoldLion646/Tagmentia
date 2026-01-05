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
    const { video_id } = await req.json();

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: "Missing video_id" }),
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

    // Check daily quota for Gold users
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

    // Get video details
    const { data: video, error: videoError } = await supabaseService
      .from('videos')
      .select('*')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: "Video not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check authorization
    const { data: isAdmin } = await supabaseService.rpc('has_role', { 
      _user_id: user.id, 
      _role: 'admin' 
    });

    if (!isAdmin && video.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if summary is already being processed
    const { data: existingSummary } = await supabaseService
      .from('video_summaries')
      .select('*')
      .eq('video_id', video_id)
      .single();

    if (existingSummary?.status === 'processing') {
      return new Response(
        JSON.stringify({ 
          message: "Summary is already being processed",
          status: "processing",
          summary_id: existingSummary.id
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create or update summary record with queued status
    const { data: summaryRecord, error: summaryError } = await supabaseService
      .from('video_summaries')
      .upsert({
        video_id: video_id,
        user_id: user.id,
        status: 'queued',
        platform: 'youtube'
      }, { 
        onConflict: 'video_id'
      })
      .select()
      .single();

    if (summaryError) {
      console.error('Summary record error:', summaryError);
      return new Response(
        JSON.stringify({ error: "Failed to create summary record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Trigger the actual summarization process in background
    const { error: funcError } = await supabaseService.functions.invoke('ai-video-summary', {
      body: {
        video_url: video.url,
        video_title: video.title,
        video_id: video_id,
        summary_id: summaryRecord.id
      },
      headers: {
        Authorization: authHeader
      }
    });

    if (funcError) {
      console.error('AI summary function error:', funcError);
      // Update status to failed
      await supabaseService
        .from('video_summaries')
        .update({ 
          status: 'failed',
          error_message: funcError.message 
        })
        .eq('id', summaryRecord.id);

      return new Response(
        JSON.stringify({ error: "Failed to start summarization process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Summarization job queued successfully",
        status: "queued",
        summary_id: summaryRecord.id,
        quota: { used: dailyCount + 1, limit: DAILY_LIMIT }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 202 }
    );

  } catch (error) {
    console.error("Summarize endpoint error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});