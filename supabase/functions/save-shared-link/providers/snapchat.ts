// Snapchat provider implementation

import { VideoProvider, VideoMetadata, CanonicalResult } from './types.ts';

export class SnapchatProvider implements VideoProvider {
  platform = 'snapchat' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname.includes('snapchat.com');
    } catch {
      return false;
    }
  }

  canonicalize(url: string): CanonicalResult | null {
    try {
      const parsed = new URL(url);
      
      // Handle shortlinks like t.snapchat.com
      if (parsed.hostname === 't.snapchat.com') {
        console.log('🔗 Snapchat shortlink detected, will follow redirect');
        return {
          canonical: url,
          platform: this.platform,
        };
      }

      // Extract ID from spotlight or story URLs
      // Formats: /spotlight/{id} or story.snapchat.com/p/{id}
      const spotlightMatch = parsed.pathname.match(/\/spotlight\/([^/]+)/);
      const storyMatch = parsed.pathname.match(/\/p\/([^/]+)/);
      
      const videoId = spotlightMatch?.[1] || storyMatch?.[1];
      
      if (!videoId) {
        console.log('⚠️ Could not extract Snapchat ID, using URL as-is');
        return {
          canonical: url,
          platform: this.platform,
        };
      }

      // Keep original hostname structure (story.snapchat.com vs www.snapchat.com)
      const canonical = url.split('?')[0]; // Remove query params
      console.log(`✅ Snapchat canonical: ${canonical}`);
      
      return {
        canonical,
        platform: this.platform,
        videoId,
      };
    } catch (error) {
      console.error('❌ Snapchat canonicalize error:', error);
      return null;
    }
  }

  async fetchMetadata(canonicalUrl: string): Promise<VideoMetadata> {
    console.log('👻 Fetching Snapchat metadata for:', canonicalUrl);

    try {
      // Fetch with redirect following for shortlinks
      const response = await fetch(canonicalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'referer': 'https://www.snapchat.com/',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        console.error('❌ Snapchat fetch failed with status:', response.status);
        return this.getFallbackMetadata();
      }

      const html = await response.text();
      console.log(`📄 Snapchat HTML length: ${html.length} characters`);

      // Extract OG tags (best effort)
      const titleMatch = html.match(/<meta\s+property=['"]og:title['"]\s+content=['"]([^'"]+)['"]/i);
      const imageMatch = html.match(/<meta\s+property=['"]og:image['"]\s+content=['"]([^'"]+)['"]/i);
      const siteNameMatch = html.match(/<meta\s+property=['"]og:site_name['"]\s+content=['"]([^'"]+)['"]/i);

      let thumbUrl = imageMatch?.[1] || null;

      // Try Snapchat-specific patterns if no OG image
      if (!thumbUrl) {
        const snapchatPatterns = [
          /\"thumbnailUrl\":\"([^\"]+)\"/,
          /\"thumbnail\":\"([^\"]+)\"/,
          /\"coverImageUrl\":\"([^\"]+)\"/,
          /\"poster\":\"([^\"]+)\"/,
        ];

        for (const pattern of snapchatPatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            let cleanedUrl = match[1]
              .replace(/\u002F/g, '/')
              .replace(/\u0026/g, '&')
              .replace(/\\/g, '');
            
            if (cleanedUrl.startsWith('//')) {
              cleanedUrl = 'https:' + cleanedUrl;
            } else if (!cleanedUrl.startsWith('http')) {
              cleanedUrl = 'https://' + cleanedUrl;
            }
            
            if (cleanedUrl.includes('snapchat') || cleanedUrl.includes('sc-cdn') || 
                cleanedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
              thumbUrl = cleanedUrl;
              console.log('✅ Found Snapchat thumbnail via JSON pattern');
              break;
            }
          }
        }
      }

      const title = titleMatch?.[1] || 'Snapchat Story';

      console.log(`📊 Snapchat metadata: title=${title}, thumb=${thumbUrl ? 'found' : 'none'}`);

      return {
        title,
        creator: siteNameMatch?.[1] || null,
        thumbRemoteUrl: thumbUrl,
        durationSeconds: null,
        publishedAt: null,
      };
    } catch (error) {
      console.error('❌ Snapchat metadata fetch error:', error);
      return this.getFallbackMetadata();
    }
  }

  private getFallbackMetadata(): VideoMetadata {
    return {
      title: 'Snapchat Story',
      creator: null,
      thumbRemoteUrl: null,
      durationSeconds: null,
      publishedAt: null,
    };
  }
}
