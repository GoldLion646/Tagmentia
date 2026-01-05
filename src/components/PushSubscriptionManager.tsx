import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionManager() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        // Must be in a secure context and have SW & Push support
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        // Require logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Get VAPID public key from edge function
        const { data: cfg } = await supabase.functions.invoke('push-config');
        const publicKey = cfg?.publicKey as string | undefined;
        if (!publicKey) {
          console.warn('VAPID public key not configured');
          return;
        }

        // Ask for notification permission if needed
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') return;

        // Existing subscription?
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
          });
        }

        // Save to Supabase
        const payload: any = {
          user_id: user.id,
          subscription_data: subscription.toJSON() as any,
          user_agent: navigator.userAgent
        };

        // Upsert by composite unique key
        await supabase
          .from('push_subscriptions')
          .upsert([payload] as any, { onConflict: 'user_id,subscription_data' });

        setDone(true);
      } catch (e) {
        console.warn('Push setup failed:', e);
      }
    };

    setup();
  }, []);

  return done ? null : null;
}

export default PushSubscriptionManager;
