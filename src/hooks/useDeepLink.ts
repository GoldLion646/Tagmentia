import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to handle deep links from native share intents and universal links
 * Works on Web, Android, and iOS
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only handle deep links on native platforms (Android/iOS)
    // On web, URL parameters are handled by the router automatically
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let cleanup: (() => void) | null = null;

    // Dynamically import Capacitor App plugin only on native platforms
    import('@capacitor/app').then(({ App }) => {
      // Handle app open from deep link (when app is closed)
      App.addListener('appUrlOpen', (event: { url: string }) => {
        handleDeepLink(event.url);
      });

      // Handle app state change (when app is in background)
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          // Check if app was opened via deep link
          App.getLaunchUrl().then((launchUrl) => {
            if (launchUrl?.url) {
              handleDeepLink(launchUrl.url);
            }
          });
        }
      });

      // Check for launch URL on app start
      App.getLaunchUrl().then((launchUrl) => {
        if (launchUrl?.url) {
          handleDeepLink(launchUrl.url);
        }
      });

      cleanup = () => {
        // Cleanup listeners
        App.removeAllListeners();
      };
    }).catch((error) => {
      console.warn('Capacitor App plugin not available:', error);
    });

    return () => {
      // Cleanup listeners on unmount
      cleanup?.();
    };
  }, [navigate]);

  const handleDeepLink = (url: string) => {
    try {
      const urlObj = new URL(url);
      
      // Handle custom scheme: tagmentia://add?url=...
      if (urlObj.protocol === 'tagmentia:') {
        const sharedUrl = urlObj.searchParams.get('url');
        if (sharedUrl) {
          const encodedUrl = encodeURIComponent(sharedUrl);
          navigate(`/add?url=${encodedUrl}`);
          return;
        }
      }
      
      // Handle universal links: https://tagmentia.com/add?url=...
      if (urlObj.hostname === 'tagmentia.com' || urlObj.hostname.endsWith('.tagmentia.com')) {
        if (urlObj.pathname === '/add') {
          // Already has query params, just navigate
          navigate(`/add${urlObj.search}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };
}

