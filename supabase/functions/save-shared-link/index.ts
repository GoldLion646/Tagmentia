import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { saveVideoLink } from './providers/orchestrator.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🚀 save-shared-link function called`, { method: req.method, url: req.url });
  
  try {
    // Verify authentication
    console.log('🔐 Verifying authentication...');
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 JWT token extracted, length:', token.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create client with user token for auth verification
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request body
    const { url, categoryId, title, note, reminderAt } = await req.json();
    console.log('📦 Request data:', { url, categoryId, hasTitle: !!title });

    if (!url || !categoryId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: url and categoryId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use orchestrator to save video link
    const result = await saveVideoLink(
      url,
      user.id,
      categoryId,
      supabaseUrl,
      supabaseServiceKey,
      note,
      reminderAt
    );

    if (!result.success) {
      console.error('❌ Save failed:', result.error);
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Video saved successfully:', result.videoId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoId: result.videoId,
        platform: result.platform,
        message: 'Video link saved successfully. Metadata is being fetched in the background.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
