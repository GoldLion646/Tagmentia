import { Capacitor } from '@capacitor/core';

/**
 * Schedule a local notification for a reminder
 * Works on iOS and Android via Capacitor Local Notifications
 */
export async function scheduleReminderNotification(
  videoId: string,
  videoTitle: string,
  reminderDate: string,
  categoryName?: string
): Promise<void> {
  // Only schedule on native platforms (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notifications only work on native platforms');
    return;
  }

  try {
    // Dynamically import Capacitor Local Notifications plugin
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    // Request permission first
    const permissionStatus = await LocalNotifications.checkPermissions();
    if (permissionStatus.display !== 'granted') {
      const requestResult = await LocalNotifications.requestPermissions();
      if (requestResult.display !== 'granted') {
        console.warn('Notification permission not granted');
        return;
      }
    }

    // Parse reminder date
    const reminderDateTime = new Date(reminderDate);
    const now = new Date();
    
    // Don't schedule if reminder is in the past
    if (reminderDateTime <= now) {
      console.warn('Reminder date is in the past, not scheduling notification');
      return;
    }

    // Calculate notification ID from video ID (use hash to ensure uniqueness)
    // Convert video ID to a number, ensuring it's positive and within valid range
    let notificationId: number;
    const numericId = videoId.replace(/\D/g, '');
    if (numericId.length > 0) {
      // Use last 9 digits of video ID, ensure it's positive
      notificationId = Math.abs(parseInt(numericId.slice(-9))) % 2147483647; // Max 32-bit int
    } else {
      // Fallback: use hash of video ID string
      let hash = 0;
      for (let i = 0; i < videoId.length; i++) {
        const char = videoId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      notificationId = Math.abs(hash) % 2147483647;
    }

    // Cancel any existing notification with this ID first
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
    } catch (cancelError) {
      // Ignore cancel errors - notification might not exist
    }

    // Schedule notification
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '🔔 Video Reminder',
          body: `Time to watch: ${videoTitle}${categoryName ? ` (${categoryName})` : ''}`,
          id: notificationId,
          schedule: {
            at: reminderDateTime,
            allowWhileIdle: true,
          },
          sound: 'default',
          extra: {
            videoId: videoId,
            url: `/video/${videoId}`,
            category: categoryName || '',
          },
        },
      ],
    });

    console.log(`Scheduled reminder notification for video ${videoId} at ${reminderDateTime.toISOString()}`);
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
    // Don't throw - notification failure shouldn't break reminder setting
  }
}

/**
 * Cancel a scheduled notification for a reminder
 */
export async function cancelReminderNotification(videoId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    // Calculate notification ID using same logic as scheduleReminderNotification
    let notificationId: number;
    const numericId = videoId.replace(/\D/g, '');
    if (numericId.length > 0) {
      notificationId = Math.abs(parseInt(numericId.slice(-9))) % 2147483647;
    } else {
      let hash = 0;
      for (let i = 0; i < videoId.length; i++) {
        const char = videoId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      notificationId = Math.abs(hash) % 2147483647;
    }
    
    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });

    console.log(`Cancelled reminder notification for video ${videoId}`);
  } catch (error) {
    console.error('Error cancelling reminder notification:', error);
  }
}

/**
 * Request notification permissions
 * Call this on app startup to ensure permissions are granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    
    const permissionStatus = await LocalNotifications.checkPermissions();
    if (permissionStatus.display === 'granted') {
      return true;
    }

    const requestResult = await LocalNotifications.requestPermissions();
    return requestResult.display === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

