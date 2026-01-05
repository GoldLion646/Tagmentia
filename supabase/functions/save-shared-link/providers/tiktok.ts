// TikTok provider implementation

import { VideoProvider, VideoMetadata, CanonicalResult } from './types.ts';

export class TikTokProvider implements VideoProvider {
  platform = 'tiktok' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname.includes('tiktok.com');
    } catch {
      return false;
    }
  }

  canonicalize(url: string): CanonicalResult | null {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // For shortlinks (vm.tiktok.com, vt.tiktok.com), we need to follow redirects
      if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
        console.log('🔗 TikTok shortlink detected, will need redirect handling');
        // Return the short URL as canonical for now
        // The metadata fetch will handle the redirect
        return {
          canonical: url,
          platform: this.platform,
        };
      }

      // For regular TikTok URLs, extract video ID
      // Format: https://www.tiktok.com/@username/video/1234567890
      const videoMatch = parsed.pathname.match(/\/video\/(\d+)/);
      if (videoMatch) {
        const videoId = videoMatch[1];
        // Keep the full canonical URL with username
        const canonical = `https://www.tiktok.com${parsed.pathname}`;
        console.log(`✅ TikTok canonical: ${canonical}`);
        return {
          canonical,
          platform: this.platform,
          videoId,
        };
      }

      console.error('❌ Could not extract TikTok video ID from:', url);
      return null;
    } catch (error) {
      console.error('❌ TikTok canonicalize error:', error);
      return null;
    }
  }

  async fetchMetadata(canonicalUrl: string): Promise<VideoMetadata> {
    console.log('🎵 Fetching TikTok metadata for:', canonicalUrl);

    // Try oEmbed API first
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;
      console.log('📡 Trying TikTok oEmbed:', oembedUrl);
      
      const oembedRes = await fetch(oembedUrl);
      
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        console.log('✅ TikTok oEmbed data:', data);
        
        return {
          title: data.title || null,
          creator: data.author_name || null,
          thumbRemoteUrl: data.thumbnail_url || null,
          durationSeconds: null,
          publishedAt: null,
        };
      } else {
        console.log('⚠️ TikTok oEmbed failed with status:', oembedRes.status);
      }
    } catch (error) {
      console.error('⚠️ TikTok oEmbed error:', error);
    }

    // Fallback: try HTML scraping
    try {
      const response = await fetch(canonicalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'referer': 'https://www.tiktok.com/',
        },
        redirect: 'follow',
      });

      if (response.ok) {
        const html = await response.text();
        
        // Extract from OG tags
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

        // Try to extract thumbnail from JSON data in HTML
        let thumbUrl = imageMatch?.[1] || null;
        
        const coverPatterns = [
          /\"cover\":\"([^\"]+)\"/,
          /\"originCover\":\"([^\"]+)\"/,
          /\"dynamicCover\":\"([^\"]+)\"/,
        ];

        for (const pattern of coverPatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            thumbUrl = match[1].replace(/\\\\u002F/g, '/').replace(/\\/g, '');
            if (thumbUrl.startsWith('//')) {
              thumbUrl = 'https:' + thumbUrl;
            }
            break;
          }
        }

        return {
          title: titleMatch?.[1] || null,
          creator: null,
          thumbRemoteUrl: thumbUrl,
          durationSeconds: null,
          publishedAt: null,
        };
      }
    } catch (error) {
      console.error('⚠️ TikTok HTML scraping failed:', error);
    }

    return {
      title: null,
      creator: null,
      thumbRemoteUrl: null,
      durationSeconds: null,
      publishedAt: null,
    };
  }
}
