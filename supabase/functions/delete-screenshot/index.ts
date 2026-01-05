import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { screenshotId } = await req.json();

    if (!screenshotId) {
      return new Response(JSON.stringify({ error: 'Screenshot ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get screenshot details
    const { data: screenshot, error: fetchError } = await supabaseClient
      .from('screenshots')
      .select('*')
      .eq('id', screenshotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !screenshot) {
      return new Response(JSON.stringify({ error: 'Screenshot not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store size for usage tracking
    const screenshotSize = screenshot.size_bytes || 0;

    // Extract file path from URL
    const urlPattern = /screenshots\/(.+)\?/;
    const match = screenshot.original_url.match(urlPattern);
    
    if (match && match[1]) {
      const filePath = match[1];
      
      // Delete from storage
      const { error: storageError } = await supabaseClient.storage
        .from('screenshots')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseClient
      .from('screenshots')
      .delete()
      .eq('id', screenshotId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('DB deletion error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete screenshot' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update storage usage
    if (screenshotSize > 0) {
      const { data: currentUsage } = await supabaseClient
        .from('user_storage_usage')
        .select('used_bytes')
        .eq('user_id', user.id)
        .single();

      if (currentUsage) {
        const newUsedBytes = Math.max(0, currentUsage.used_bytes - screenshotSize);
        const { error: usageError } = await supabaseClient
          .from('user_storage_usage')
          .upsert({
            user_id: user.id,
            used_bytes: newUsedBytes,
            updated_at: new Date().toISOString(),
          });

        if (!usageError) {
          console.log('Storage freed:', {
            user_id: user.id,
            bytes_freed: screenshotSize,
            new_total: newUsedBytes,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in delete-screenshot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
