import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type LayoutType = 'mobile' | 'web';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const STORAGE_KEY = 'preferred_layout';

interface DeviceDetection {
  deviceType: DeviceType;
  layoutType: LayoutType;
  width: number;
  setPreferredLayout: (layout: LayoutType | null) => void;
  preferredLayout: LayoutType | null;
}

export function useDeviceDetection(): DeviceDetection {
  const [width, setWidth] = useState<number>(window.innerWidth);
  const [preferredLayout, setPreferredLayoutState] = useState<LayoutType | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored as LayoutType | null;
  });

  useEffect(() => {
    // Auto-clear preference if it doesn't match the current device type
    // This prevents desktop users from being stuck in mobile view
    const currentWidth = window.innerWidth;
    const shouldBeMobile = currentWidth <= MOBILE_BREAKPOINT;
    const shouldBeWeb = currentWidth > MOBILE_BREAKPOINT;
    
    if (preferredLayout === 'mobile' && shouldBeWeb) {
      console.log('🔄 Auto-clearing mobile preference on desktop');
      localStorage.removeItem(STORAGE_KEY);
      setPreferredLayoutState(null);
    } else if (preferredLayout === 'web' && shouldBeMobile) {
      console.log('🔄 Auto-clearing web preference on mobile');
      localStorage.removeItem(STORAGE_KEY);
      setPreferredLayoutState(null);
    }
  }, [preferredLayout]);

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    // Debounce resize for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const setPreferredLayout = (layout: LayoutType | null) => {
    if (layout === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, layout);
    }
    setPreferredLayoutState(layout);
  };

  // Determine device type based on width
  const deviceType: DeviceType = 
    width <= MOBILE_BREAKPOINT ? 'mobile' :
    width <= TABLET_BREAKPOINT ? 'tablet' :
    'desktop';

  // Determine layout type (user preference overrides auto-detection)
  const layoutType: LayoutType = 
    preferredLayout ?? 
    (width <= MOBILE_BREAKPOINT ? 'mobile' : 'web');

  console.log('🔍 Device Detection:', { width, deviceType, layoutType, preferredLayout });

  return {
    deviceType,
    layoutType,
    width,
    setPreferredLayout,
    preferredLayout,
  };
}

// SSR-safe User-Agent detection (optional)
export function detectDeviceFromUserAgent(): DeviceType {
  if (typeof navigator === 'undefined') return 'desktop';
  
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  
  if (isMobile && !isTablet) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
