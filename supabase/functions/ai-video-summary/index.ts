import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to get video transcript using the dedicated edge function
async function getVideoTranscript(videoUrl: string, supabaseClient: any): Promise<string> {
  try {
    console.log('Getting transcript via edge function for:', videoUrl);
    
    const { data, error } = await supabaseClient.functions.invoke('get-video-transcript', {
      body: { video_url: videoUrl }
    });
    
    if (error) {
      console.error('Transcript edge function error:', error);
      throw new Error(`Transcript service error: ${error.message}`);
    }
    
    if (data && data.transcript) {
      console.log('Retrieved transcript successfully, length:', data.transcript.length);
      return data.transcript;
    }
    
    throw new Error('No transcript returned from service');
  } catch (error) {
    console.error('Error retrieving transcript via edge function:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, video_title, video_id } = await req.json();

    if (!video_url || !video_title || !video_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: video_url, video_title, or video_id" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Supabase (service role for server-side checks only)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
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

    // Check if video exists and belongs to user
    const { data: video, error: videoError } = await supabaseService
      .from('videos')
      .select('ai_summary, user_id')
      .eq('id', video_id)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: "Video not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Authorize: allow owner or admins
    const { data: isAdmin, error: roleError } = await supabaseService.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (roleError) {
      console.error('has_role RPC error:', roleError);
    }

    if (!isAdmin && video.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if summary already exists
    if (video.ai_summary) {
      return new Response(
        JSON.stringify({ 
          message: "AI Summary already generated!",
          summary: video.ai_summary,
          cached: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check subscription plan
    const { data: planLimits, error: limitsError } = await supabaseService
      .rpc('get_user_plan_limits', { user_uuid: user.id });

    if (limitsError) {
      console.error("Plan limits RPC error:", limitsError);
      return new Response(
        JSON.stringify({ error: "Failed to check user plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const userPlan = planLimits?.[0];
    if (!userPlan?.ai_summary_enabled) {
      return new Response(
        JSON.stringify({ error: "AI video summarization is only available with Gold plan" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if this is a Gold member
    const isGoldMember = userPlan.plan_name === 'Gold Plan' || userPlan.plan_name === 'Gold Plan (Admin)';
    
    // Retrieve transcript for Gold members using the dedicated edge function
    let transcript = '';
    if (isGoldMember) {
      try {
        console.log('Gold member detected, attempting to retrieve transcript...');
        transcript = await getVideoTranscript(video_url, supabaseService);
        if (transcript) {
          console.log('Transcript retrieved successfully, length:', transcript.length);
        }
      } catch (error) {
        console.error('Failed to retrieve transcript:', error);
        // Continue without transcript - the AI can still generate summaries based on title
        transcript = '';
      }
    }

    // Build comprehensive prompt for structured summary
    const prompt = transcript 
      ? `Analyze this video and provide a comprehensive, detailed summary in JSON format.

Title: ${video_title}
URL: ${video_url}

Transcript:
${transcript.substring(0, 12000)}

Please provide your response in this exact JSON structure with rich, detailed content:
{
  "tldr": "3-4 sentence comprehensive summary capturing the main concepts, key insights, and overall value",
  "keyPoints": [
    "Detailed actionable point 1 with specific examples or methods mentioned",
    "Detailed actionable point 2 with context and practical application",
    "Detailed actionable point 3 with supporting evidence or data",
    "Detailed actionable point 4 with implementation steps or frameworks",
    "Detailed actionable point 5 with results or outcomes expected",
    "Detailed actionable point 6 with additional nuances or considerations",
    "Detailed actionable point 7 with related concepts or connections"
  ],
  "timestamps": [
    {"time": "00:30", "description": "Detailed description of key concept introduced"},
    {"time": "02:45", "description": "Important methodology or framework explained"},
    {"time": "05:20", "description": "Practical example or case study presented"}
  ],
  "tags": ["primary-topic", "methodology", "industry", "skill-level", "content-type", "use-case"],
  "targetAudience": "Detailed description of who should watch this and their background/needs",
  "value": "Comprehensive explanation of what viewers will learn, achieve, or understand after watching",
  "mainConcepts": [
    "Core concept 1 with brief explanation",
    "Core concept 2 with brief explanation", 
    "Core concept 3 with brief explanation"
  ],
  "practicalApplications": [
    "How viewers can apply learning 1 in real scenarios",
    "How viewers can apply learning 2 in their work/life",
    "How viewers can apply learning 3 to solve problems"
  ]
}

Focus on making each section detailed and valuable. Extract specific examples, methodologies, frameworks, data points, and actionable insights from the transcript.`
      : `Based on the video title and context, provide a detailed structured summary in JSON format.

Title: ${video_title}
URL: ${video_url}

Please provide your response in this exact JSON structure with rich, detailed content:
{
  "tldr": "3-4 sentence comprehensive summary based on what this title suggests the video covers",
  "keyPoints": [
    "Likely detailed point 1 based on title analysis",
    "Likely detailed point 2 with expected methodologies",
    "Likely detailed point 3 with practical applications",
    "Likely detailed point 4 with implementation considerations",
    "Likely detailed point 5 with expected outcomes"
  ],
  "timestamps": [],
  "tags": ["primary-topic", "secondary-topic", "industry", "difficulty-level", "content-format"],
  "targetAudience": "Detailed description of likely target audience based on title",
  "value": "Comprehensive explanation of expected learning outcomes and value",
  "mainConcepts": [
    "Expected core concept 1 from title",
    "Expected core concept 2 from title",
    "Expected core concept 3 from title"
  ],
  "practicalApplications": [
    "Expected practical application 1",
    "Expected practical application 2", 
    "Expected practical application 3"
  ]
}

Provide detailed, thoughtful content based on what the title suggests this video covers.`;

    // Helper: Heuristic fallback when AI providers fail
    const heuristicFallback = () => {
      const domain = (() => {
        try { return new URL(video_url).hostname.replace("www.", ""); } catch { return "the site"; }
      })();
      const summary = `Quick summary (fallback): "${video_title}" likely covers key insights about its main topic. Expect a clear overview, practical takeaways, and context useful for ${domain} viewers. If you need a deeper AI summary, try again later or enable a secondary AI provider in settings.`;
      return { summary, provider: 'heuristic' as const };
    };

    // Helper: OpenAI attempt
    const tryOpenAI = async () => {
      const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiApiKey) return null; // No key, skip

      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4.1-2025-04-14",
            messages: [
              { role: "system", content: "You are an expert video analyst that creates comprehensive, detailed summaries. Always provide rich, actionable insights and specific details." },
              { role: "user", content: prompt },
            ],
            max_completion_tokens: 1200,
          }),
        });

        console.log("OpenAI Response Status:", resp.status);

        if (!resp.ok) {
          const text = await resp.text();
          console.error("OpenAI API Error:", text);
          try {
            const json = JSON.parse(text);
            const code = json?.error?.code || json?.error?.type || String(resp.status);
            return { error: { provider: 'openai', status: resp.status, code, details: json } } as const;
          } catch {
            return { error: { provider: 'openai', status: resp.status, code: String(resp.status), details: text } } as const;
          }
        }

        const data = await resp.json();
        console.log("OpenAI Response Data:", JSON.stringify(data, null, 2));
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return { error: { provider: 'openai', status: 502, code: 'empty_response' } } as const;
        
        // Try to parse structured JSON response
        try {
          const structuredSummary = JSON.parse(content);
          return { 
            summary: structuredSummary.tldr || content, 
            structuredData: structuredSummary,
            provider: 'openai' 
          } as const;
        } catch (parseError) {
          // Fallback to original content if JSON parsing fails
          console.warn("Failed to parse structured response, using raw content");
          return { summary: content, provider: 'openai' } as const;
        }
      } catch (error) {
        console.error("OpenAI request failed:", error);
        return { error: { provider: 'openai', status: 500, code: 'network_error', details: String(error) } } as const;
      }
    };

    // Try OpenAI first
    const openaiResult = await tryOpenAI();

    if (openaiResult && 'summary' in openaiResult) {
      // Save summary to videos table
      await supabaseService
        .from('videos')
        .update({ ai_summary: openaiResult.summary })
        .eq('id', video_id);

      // Save detailed summary and transcript to video_summaries table for Gold members
      if (isGoldMember && 'structuredData' in openaiResult) {
        const structured = openaiResult.structuredData;
        await supabaseService
          .from('video_summaries')
          .upsert({
            video_id: video_id,
            user_id: user.id,
            tldr: structured.tldr || openaiResult.summary,
            key_points: structured.keyPoints || [],
            timestamps: structured.timestamps || [],
            action_items: structured.practicalApplications || [],
            tags: structured.tags || [],
            transcript: transcript || null,
            status: 'ready',
            model_name: 'gpt-4.1-2025-04-14',
            transcript_source: transcript ? 'youtube_api' : null
          }, { onConflict: 'video_id' });
      } else if (isGoldMember) {
        // Fallback for non-structured responses
        await supabaseService
          .from('video_summaries')
          .upsert({
            video_id: video_id,
            user_id: user.id,
            tldr: openaiResult.summary,
            transcript: transcript || null,
            status: 'ready',
            model_name: 'gpt-4.1-2025-04-14',
            transcript_source: transcript ? 'youtube_api' : null
          }, { onConflict: 'video_id' });
      }

      return new Response(JSON.stringify({ 
        summary: openaiResult.summary, 
        structuredData: 'structuredData' in openaiResult ? openaiResult.structuredData : null,
        transcript: isGoldMember ? transcript : undefined,
        plan: userPlan.plan_name, 
        provider: openaiResult.provider 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If OpenAI failed, use heuristic fallback
    const fallback = heuristicFallback();
    
    // Save fallback summary to database
    await supabaseService
      .from('videos')
      .update({ ai_summary: fallback.summary })
      .eq('id', video_id);

    // Save to video_summaries table for Gold members even with fallback
    if (isGoldMember) {
      await supabaseService
        .from('video_summaries')
        .upsert({
          video_id: video_id,
          user_id: user.id,
          tldr: fallback.summary,
          transcript: transcript || null,
          status: 'ready',
          model_name: 'heuristic_fallback',
          transcript_source: transcript ? 'youtube_api' : null
        }, { onConflict: 'video_id' });
    }

    return new Response(JSON.stringify({ 
      summary: fallback.summary, 
      transcript: isGoldMember ? transcript : undefined,
      plan: userPlan.plan_name, 
      provider: fallback.provider, 
      note: "Used fallback due to AI provider unavailability." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("AI summary error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again later." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});