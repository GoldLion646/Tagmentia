// URL normalization utilities for shared links

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'snapchat' | 'loom' | 'unknown';

export interface NormalizedUrl {
  canonical: string;
  platform: Platform;
  videoId?: string;
}

// Strict allowlist - ONLY these exact hostnames are permitted
const ALLOWED_HOSTNAMES = new Set([
  // YouTube
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  // Instagram
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  // TikTok
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  // Snapchat
  'snapchat.com',
  'www.snapchat.com',
  'story.snapchat.com',
  't.snapchat.com',
  // Loom
  'loom.com',
  'www.loom.com',
]);

/**
 * Normalize hostname by removing common prefixes for comparison
 */
function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
}

/**
 * Check if hostname is in allowlist
 */
function isAllowedHostname(hostname: string): boolean {
  return ALLOWED_HOSTNAMES.has(hostname.toLowerCase());
}

/**
 * Get platform from URL - returns null if not explicitly allowed
 */
export function getPlatform(urlString: string): Platform | null {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // First check: must be in strict allowlist
    if (!isAllowedHostname(hostname)) {
      console.log('❌ Hostname not in allowlist:', hostname);
      return null;
    }
    
    // Second check: determine which platform
    const normalized = normalizeHostname(hostname);
    
    if (normalized === 'youtube.com' || normalized === 'youtu.be') {
      return 'youtube';
    }
    
    if (normalized === 'instagram.com') {
      return 'instagram';
    }
    
    if (normalized === 'tiktok.com' || normalized === 'vm.tiktok.com' || normalized === 'vt.tiktok.com') {
      return 'tiktok';
    }
    
    if (normalized === 'snapchat.com' || normalized === 'story.snapchat.com' || normalized === 't.snapchat.com') {
      return 'snapchat';
    }
    
    if (normalized === 'loom.com') {
      return 'loom';
    }
    
    // Should never reach here if allowlist is correct
    console.error('⚠️ Hostname in allowlist but no platform matched:', hostname);
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize video URLs to canonical form
 * Strips tracking parameters while preserving important ones (like YouTube timestamp)
 * Returns null if the platform is not supported
 */
export function normalizeUrl(urlString: string): NormalizedUrl | null {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Block dangerous schemes
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      console.log('❌ Invalid protocol:', url.protocol);
      return null;
    }
    
    // Check if platform is supported (strict allowlist check)
    const platform = getPlatform(urlString);
    if (!platform) {
      return null;
    }
    
    const normalized = normalizeHostname(hostname);
    
    // YouTube - expand youtu.be, keep timestamp, strip tracking
    if (normalized === 'youtube.com') {
      const videoId = url.searchParams.get('v');
      if (videoId) {
        const timeParam = url.searchParams.get('t');
        const canonical = `https://www.youtube.com/watch?v=${videoId}${timeParam ? `&t=${timeParam}` : ''}`;
        return { canonical, platform: 'youtube', videoId };
      }
    } else if (normalized === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('?')[0];
      const timeParam = url.searchParams.get('t');
      const canonical = `https://www.youtube.com/watch?v=${videoId}${timeParam ? `&t=${timeParam}` : ''}`;
      return { canonical, platform: 'youtube', videoId };
    }
    
    // TikTok - strip tracking params, normalize URL
    if (normalized === 'tiktok.com' || normalized === 'vm.tiktok.com' || normalized === 'vt.tiktok.com') {
      const cleanPath = url.pathname.replace(/\?.*$/, '');
      // Extract video ID if present in path
      const videoIdMatch = cleanPath.match(/\/video\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : undefined;
      return { 
        canonical: `https://www.tiktok.com${cleanPath}`, 
        platform: 'tiktok',
        videoId
      };
    }
    
    // Instagram - normalize reels and posts, strip tracking
    if (normalized === 'instagram.com') {
      const cleanPath = url.pathname.replace(/\?.*$/, '');
      // Extract post/reel ID if present
      const idMatch = cleanPath.match(/\/(p|reel)\/([^\/]+)/);
      const videoId = idMatch ? idMatch[2] : undefined;
      return { 
        canonical: `https://www.instagram.com${cleanPath}`, 
        platform: 'instagram',
        videoId
      };
    }
    
    // Snapchat - normalize spotlight and story URLs, preserve /t/ shortlinks
    if (normalized === 'snapchat.com' || normalized === 'story.snapchat.com' || normalized === 't.snapchat.com') {
      const cleanPath = url.pathname.replace(/\?.*$/, '');
      
      // For /t/ shortlinks, keep the original URL
      if (cleanPath.startsWith('/t/')) {
        const shortCode = cleanPath.split('/')[2];
        return { 
          canonical: urlString,
          platform: 'snapchat',
          videoId: shortCode
        };
      }
      
      // For spotlight URLs, extract video ID
      const videoIdMatch = cleanPath.match(/\/spotlight\/([A-Za-z0-9_-]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : undefined;
      return { 
        canonical: `https://www.snapchat.com${cleanPath}`, 
        platform: 'snapchat',
        videoId
      };
    }
    
    // Loom - normalize share URLs (format: loom.com/share/VIDEO_ID)
    if (normalized === 'loom.com') {
      const cleanPath = url.pathname.replace(/\?.*$/, '');
      // Extract video ID from /share/VIDEO_ID pattern
      const videoIdMatch = cleanPath.match(/\/share\/([A-Za-z0-9_-]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : undefined;
      return { 
        canonical: `https://www.loom.com${cleanPath}`, 
        platform: 'loom',
        videoId
      };
    }
    
    return null;
  } catch (e) {
    console.error('URL normalization error:', e);
    return null;
  }
}

/**
 * Check if a URL is from a supported platform
 */
export function isSupportedUrl(urlString: string): boolean {
  return getPlatform(urlString) !== null;
}

/**
 * Get user-friendly error message for unsupported platforms
 */
export function getUnsupportedPlatformMessage(): string {
  return "This video site isn't supported yet. Currently supported: YouTube, TikTok, Instagram, Snapchat, Loom.";
}

/**
 * Get platform icon/badge info
 */
export function getPlatformInfo(platform: Platform): { 
  name: string; 
  icon: string; 
  color: string;
} {
  switch (platform) {
    case 'youtube':
      return { name: 'YouTube', icon: '▶️', color: '#FF0000' };
    case 'instagram':
      return { name: 'Instagram', icon: '📷', color: '#E4405F' };
    case 'tiktok':
      return { name: 'TikTok', icon: '🎵', color: '#000000' };
    case 'snapchat':
      return { name: 'Snapchat', icon: '👻', color: '#FFFC00' };
    case 'loom':
      return { name: 'Loom', icon: '🎥', color: '#625DF5' };
    default:
      return { name: 'Video', icon: '🎬', color: '#666666' };
  }
}
