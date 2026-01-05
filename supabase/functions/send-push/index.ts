import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushBody {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, message, type = 'info' } = (await req.json()) as SendPushBody;

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Missing title or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate and ensure caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: isAdmin, error: roleError } = await supabaseService.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Configure web-push
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    webpush.setVapidDetails(
      'mailto:admin@tagmentia-app.local',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Fetch active subscriptions
    const { data: subs, error: subsError } = await supabaseService
      .from('push_subscriptions')
      .select('id, subscription_data');

    if (subsError) throw subsError;

    let sent = 0;
    let removed = 0;

    const payload = JSON.stringify({ title, message, type });

    // Send notifications sequentially to simplify error handling
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(sub.subscription_data, payload);
        sent++;
      } catch (err: any) {
        const statusCode = err?.statusCode ?? err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Remove invalid subscription
          await supabaseService.from('push_subscriptions').delete().eq('id', sub.id);
          removed++;
        } else {
          console.error('Push send error:', err);
        }
      }
    }

    return new Response(JSON.stringify({ sent, removed }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('send-push error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});