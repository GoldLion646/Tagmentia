import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'sidebar_collapsed';

interface LayoutBreakpoint {
  isMobile: boolean;
  width: number;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export function useLayoutBreakpoint(): LayoutBreakpoint {
  const [width, setWidth] = useState<number>(window.innerWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, String(newValue));
      return newValue;
    });
  };

  return {
    isMobile: width <= MOBILE_BREAKPOINT,
    width,
    sidebarCollapsed,
    toggleSidebar,
  };
}
