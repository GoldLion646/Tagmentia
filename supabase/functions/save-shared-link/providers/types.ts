// Shared types for video platform providers

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'snapchat' | 'loom';

export interface VideoMetadata {
  title: string | null;
  creator: string | null;
  durationSeconds?: number | null;
  publishedAt?: string | null;
  thumbRemoteUrl?: string | null;
  description?: string | null;
}

export interface CanonicalResult {
  canonical: string;
  platform: Platform;
  videoId?: string;
}

export interface VideoProvider {
  platform: Platform;
  canHandle(url: string): boolean;
  canonicalize(url: string): CanonicalResult | null;
  fetchMetadata(canonicalUrl: string): Promise<VideoMetadata>;
}

export const ALLOWED_HOSTNAMES = new Set([
  // YouTube
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  
  // TikTok
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
  
  // Instagram
  'instagram.com',
  'www.instagram.com',
  
  // Snapchat
  'snapchat.com',
  'www.snapchat.com',
  'story.snapchat.com',
  't.snapchat.com',
  
  // Loom
  'loom.com',
  'www.loom.com',
]);

export function isAllowedHostname(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}
