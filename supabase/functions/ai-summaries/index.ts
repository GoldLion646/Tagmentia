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
    const videoId = url.pathname.split('/').pop();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Missing video ID in URL" }),
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

    // Check if video belongs to user or user is admin
    const { data: video, error: videoError } = await supabaseService
      .from('videos')
      .select('user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: "Video not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

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

    // Get latest summary for the video
    const { data: summary, error: summaryError } = await supabaseService
      .from('video_summaries')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (summaryError) {
      console.error('Summary fetch error:', summaryError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch summary" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!summary) {
      return new Response(
        JSON.stringify({ 
          message: "No summary found for this video",
          status: "not_summarized"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        summary: {
          id: summary.id,
          status: summary.status,
          tldr: summary.tldr,
          key_points: summary.key_points,
          timestamps: summary.timestamps,
          tags: summary.tags,
          transcript: summary.transcript,
          error_message: summary.error_message,
          created_at: summary.created_at,
          updated_at: summary.updated_at
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Get summary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});