import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

interface RouteMap {
  [key: string]: { mobile: string; web: string };
}

// Map of paired routes
const ROUTE_PAIRS: RouteMap = {
  dashboard: { mobile: '/dashboard', web: '/dashboard-web' },
  categories: { mobile: '/categories', web: '/categories-web' },
  'category-detail': { mobile: '/category/:id', web: '/category-web/:id' },
  videos: { mobile: '/videos', web: '/videos-web' },
  'video-detail': { mobile: '/video/:id', web: '/video-web/:id' },
  notes: { mobile: '/notes', web: '/notes-web' },
  account: { mobile: '/account', web: '/account-web' },
  search: { mobile: '/search', web: '/search-web' },
};

interface LayoutRouterProps {
  children: React.ReactNode;
}

export function LayoutRouter({ children }: LayoutRouterProps) {
  const { layoutType } = useDeviceDetection();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if current route needs to be redirected based on layout type
    const currentPath = location.pathname;
    
    console.log('🔀 LayoutRouter:', { currentPath, layoutType });
    
    // Skip auth routes and admin routes
    if (currentPath.startsWith('/auth') || 
        currentPath.startsWith('/admin') || 
        currentPath === '/' ||
        currentPath === '/splash' ||
        currentPath === '/account-suspended' ||
        currentPath === '/account-deleted' ||
        currentPath === '/help-feedback') {
      console.log('⏭️ Skipping route:', currentPath);
      return;
    }

    // Find which route pair this belongs to
    for (const [key, routes] of Object.entries(ROUTE_PAIRS)) {
      const mobileMatch = matchRoute(currentPath, routes.mobile);
      const webMatch = matchRoute(currentPath, routes.web);
      
      if (mobileMatch && layoutType === 'web') {
        // Currently on mobile route, but should be on web
        const webPath = buildPath(routes.web, mobileMatch.params);
        console.log('➡️ Redirecting to web:', { from: currentPath, to: webPath });
        if (webPath !== currentPath) {
          navigate(webPath, { replace: true });
        }
        return;
      }
      
      if (webMatch && layoutType === 'mobile') {
        // Currently on web route, but should be on mobile
        const mobilePath = buildPath(routes.mobile, webMatch.params);
        console.log('➡️ Redirecting to mobile:', { from: currentPath, to: mobilePath });
        if (mobilePath !== currentPath) {
          navigate(mobilePath, { replace: true });
        }
        return;
      }
    }
  }, [layoutType, location.pathname, navigate]);

  return <>{children}</>;
}

// Helper to match route patterns
function matchRoute(path: string, pattern: string): { params: Record<string, string> } | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  
  if (patternParts.length !== pathParts.length) return null;
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].slice(1);
      params[paramName] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  
  return { params };
}

// Helper to build path with params
function buildPath(pattern: string, params: Record<string, string>): string {
  let path = pattern;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, value);
  }
  return path;
}
