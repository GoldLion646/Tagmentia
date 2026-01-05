import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Reminder {
  id: string;
  title: string;
  category: string;
  reminderDate: string;
  time: string;
  url: string;
  description: string;
}

export const useUpcomingReminders = (limit: number = 5) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcomingReminders = async () => {
    try {
      setLoading(true);
      
      // Get videos with reminders set that are in the future
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          reminder_date,
          url,
          description,
          categories(name)
        `)
        .not('reminder_date', 'is', null)
        .gte('reminder_date', now)
        .order('reminder_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching reminders:', error);
        return;
      }

      const mappedReminders = (data || []).map((video: any) => ({
        id: video.id,
        title: video.title,
        category: video.categories?.name || 'No category',
        reminderDate: video.reminder_date,
        time: formatReminderTime(video.reminder_date),
        url: video.url,
        description: video.description || ''
      }));

      setReminders(mappedReminders);
    } catch (error) {
      console.error('Error in fetchUpcomingReminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatReminderTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    const timeFormat = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (isToday) {
      return `Today ${timeFormat}`;
    } else if (isTomorrow) {
      return `Tomorrow ${timeFormat}`;
    } else {
      const dateFormat = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      return `${dateFormat}, ${timeFormat}`;
    }
  };

  useEffect(() => {
    fetchUpcomingReminders();
  }, [limit]);

  return {
    reminders,
    loading,
    refetch: fetchUpcomingReminders
  };
};