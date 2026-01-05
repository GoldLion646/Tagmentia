import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { scheduleReminderNotification } from '@/utils/reminderNotifications';

/**
 * Hook to reschedule all reminder notifications when app loads
 * This ensures existing reminders have notifications scheduled
 */
export function useRescheduleReminders() {
  useEffect(() => {
    const rescheduleAllReminders = async () => {
      // Only run on native platforms
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return;
        }

        // Get all videos with reminders set that are in the future
        const now = new Date().toISOString();
        const { data: videos, error } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            reminder_date,
            categories(name)
          `)
          .eq('user_id', user.id)
          .not('reminder_date', 'is', null)
          .gte('reminder_date', now)
          .order('reminder_date', { ascending: true });

        if (error) {
          console.error('Error fetching reminders for rescheduling:', error);
          return;
        }

        if (!videos || videos.length === 0) {
          console.log('No reminders to reschedule');
          return;
        }

        console.log(`Rescheduling ${videos.length} reminder notifications...`);

        // Schedule notification for each reminder
        for (const video of videos) {
          try {
            const categoryName = (video.categories as any)?.name;
            await scheduleReminderNotification(
              video.id,
              video.title,
              video.reminder_date,
              categoryName
            );
          } catch (error) {
            console.error(`Error rescheduling notification for video ${video.id}:`, error);
          }
        }

        console.log('Finished rescheduling reminder notifications');
      } catch (error) {
        console.error('Error in rescheduleAllReminders:', error);
      }
    };

    // Wait a bit for app to fully load, then reschedule
    const timer = setTimeout(rescheduleAllReminders, 2000);
    return () => clearTimeout(timer);
  }, []);
}

