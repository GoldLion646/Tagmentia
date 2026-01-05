import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Configure web-push
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys not configured for reminder notifications');
      return new Response(JSON.stringify({ error: 'VAPID not configured', processed: 0 }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    webpush.setVapidDetails(
      'mailto:admin@tagmentia-app.local',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find videos with reminders due (within the last 5 minutes to avoid missing any)
    const { data: dueReminders, error: reminderError } = await supabaseService
      .from('videos')
      .select(`
        id,
        title,
        user_id,
        reminder_date,
        categories(name),
        url
      `)
      .not('reminder_date', 'is', null)
      .gte('reminder_date', fiveMinutesAgo.toISOString())
      .lte('reminder_date', now.toISOString());

    if (reminderError) {
      console.error('Error fetching due reminders:', reminderError);
      throw reminderError;
    }

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No due reminders found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let notificationsSent = 0;
    let subscriptionsRemoved = 0;

    // Process each reminder
    for (const reminder of dueReminders) {
      try {
        // Get user's push subscriptions
        const { data: userSubs, error: subsError } = await supabaseService
          .from('push_subscriptions')
          .select('id, subscription_data')
          .eq('user_id', reminder.user_id);

        if (subsError) {
          console.error('Error fetching user subscriptions:', subsError);
          continue;
        }

        if (!userSubs || userSubs.length === 0) {
          console.log(`No push subscriptions found for user ${reminder.user_id}`);
          continue;
        }

        const categoryName = (reminder.categories as any)?.name || 'Video';
        const payload = JSON.stringify({
          title: '🔔 Video Reminder',
          message: `Time to watch: ${reminder.title}`,
          type: 'info',
          data: {
            videoId: reminder.id,
            url: `/video/${reminder.id}`,
            category: categoryName
          }
        });

        // Send notification to all user's devices
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(sub.subscription_data, payload);
            notificationsSent++;
          } catch (pushError: any) {
            const statusCode = pushError?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              // Remove invalid subscription
              await supabaseService
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id);
              subscriptionsRemoved++;
              console.log(`Removed invalid push subscription ${sub.id}`);
            } else {
              console.error('Push notification error:', pushError);
            }
          }
        }

        // Mark reminder as sent by clearing the reminder_date
        // This prevents duplicate notifications
        await supabaseService
          .from('videos')
          .update({ reminder_date: null })
          .eq('id', reminder.id);

        console.log(`Processed reminder for video: ${reminder.title}`);

      } catch (error) {
        console.error(`Error processing reminder for video ${reminder.id}:`, error);
      }
    }

    return new Response(JSON.stringify({
      processed: dueReminders.length,
      notificationsSent,
      subscriptionsRemoved,
      message: `Processed ${dueReminders.length} reminders, sent ${notificationsSent} notifications`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('check-reminders error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'Unknown error',
      processed: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});