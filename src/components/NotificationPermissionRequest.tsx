import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { requestNotificationPermissions } from '@/utils/reminderNotifications';

/**
 * Component to request notification permissions on app startup
 * Only runs on native platforms (iOS/Android)
 */
export function NotificationPermissionRequest() {
  useEffect(() => {
    const requestPermissions = async () => {
      // Only request on native platforms
      if (Capacitor.isNativePlatform()) {
        try {
          await requestNotificationPermissions();
        } catch (error) {
          console.error('Error requesting notification permissions:', error);
        }
      }
    };

    // Request permissions after a short delay to ensure app is fully loaded
    const timer = setTimeout(requestPermissions, 1000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

