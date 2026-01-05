// Instagram provider implementation

import { VideoProvider, VideoMetadata, CanonicalResult } from './types.ts';

export class InstagramProvider implements VideoProvider {
  platform = 'instagram' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname.includes('instagram.com');
    } catch {
      return false;
    }
  }

  canonicalize(url: string): CanonicalResult | null {
    try {
      const parsed = new URL(url);
      
      // Extract reel/post ID from pathname
      // Formats: /reel/{id}/ or /p/{id}/
      const reelMatch = parsed.pathname.match(/\/reel\/([^/]+)/);
      const postMatch = parsed.pathname.match(/\/p\/([^/]+)/);
      
      const videoId = reelMatch?.[1] || postMatch?.[1];
      
      if (!videoId) {
        console.error('❌ Could not extract Instagram video ID from:', url);
        return null;
      }

      // Preserve the reel vs post distinction in canonical URL
      const pathType = reelMatch ? 'reel' : 'p';
      const canonical = `https://www.instagram.com/${pathType}/${videoId}/`;
      
      console.log(`✅ Instagram canonical: ${canonical}`);
      return {
        canonical,
        platform: this.platform,
        videoId,
      };
    } catch (error) {
      console.error('❌ Instagram canonicalize error:', error);
      return null;
    }
  }

  async fetchMetadata(canonicalUrl: string): Promise<VideoMetadata> {
    console.log('📸 Fetching Instagram metadata for:', canonicalUrl);

    try {
      // Fetch with Instagram-specific headers (critical for getting correct HTML)
      const response = await fetch(canonicalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'referer': 'https://www.instagram.com/',
          'accept-encoding': 'gzip, deflate, br',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-user': '?1',
          'upgrade-insecure-requests': '1',
          'x-instagram-ajax': '1',
          'x-asbd-id': '129477',
          'x-ig-app-id': '936619743392459',
        },
      });

      if (!response.ok) {
        console.error('❌ Instagram fetch failed with status:', response.status);
        return this.getFallbackMetadata();
      }

      const html = await response.text();
      console.log(`📄 Instagram HTML length: ${html.length} characters`);

      // Extract OG tags first
      const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);

      let title = titleMatch?.[1] || null;
      let thumbUrl = imageMatch?.[1] || null;

      // Decode HTML entities in thumbnail URL (Instagram OG tags have &amp; instead of &)
      if (thumbUrl) {
        thumbUrl = thumbUrl
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&#x2F;/g, '/');
      }

      // If no OG image, try comprehensive Instagram-specific patterns
      if (!thumbUrl) {
        console.log('⚠️ No og:image found, trying Instagram JSON patterns...');
        
        const instagramPatterns = [
          /"display_url":"([^"]+)"/,
          /"thumbnail_src":"([^"]+)"/,
          /"src":"(https:\/\/[^"]*scontent[^"]*\.jpg[^"]*)"/,
          /"src":"(https:\/\/[^"]*cdninstagram[^"]*\.jpg[^"]*)"/,
          /"image_versions2":\s*{\s*"candidates":\s*\[\s*{\s*"url":"([^"]+)"/,
          /"thumbnail_url":"([^"]+)"/,
          /"node":\s*{[^}]*"display_url":"([^"]+)"/,
          /"media_url":"([^"]+)"/,
        ];

        for (const pattern of instagramPatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            let cleanedUrl = match[1]
              .replace(/\\u0026/g, '&')
              .replace(/\\/g, '')
              .replace(/&amp;/g, '&')
              .replace(/\\u002F/g, '/')
              .replace(/u002F/g, '/');
            
            // Ensure HTTPS
            if (cleanedUrl.startsWith('//')) {
              cleanedUrl = 'https:' + cleanedUrl;
            } else if (!cleanedUrl.startsWith('http')) {
              cleanedUrl = 'https://' + cleanedUrl;
            }
            
            // Validate it's an Instagram image URL
            if (cleanedUrl.includes('instagram') || cleanedUrl.includes('scontent') || 
                cleanedUrl.includes('cdninstagram') || cleanedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
              thumbUrl = cleanedUrl;
              console.log(`✅ Found Instagram thumbnail via pattern`);
              break;
            }
          }
        }
      }

      // Try to extract creator/author from title or HTML
      let creator = null;
      if (title) {
        // Instagram titles often contain "(@username)" or similar
        const creatorMatch = title.match(/\(@([^)]+)\)/);
        if (creatorMatch) {
          creator = '@' + creatorMatch[1];
        }
      }

      if (!title) {
        title = 'Instagram Reel';
      }

      console.log(`📊 Instagram metadata: title=${title}, thumb=${thumbUrl ? 'found' : 'none'}, creator=${creator}`);

      return {
        title,
        creator,
        thumbRemoteUrl: thumbUrl,
        durationSeconds: null,
        publishedAt: null,
      };
    } catch (error) {
      console.error('❌ Instagram metadata fetch error:', error);
      return this.getFallbackMetadata();
    }
  }

  private getFallbackMetadata(): VideoMetadata {
    return {
      title: 'Instagram Reel',
      creator: null,
      thumbRemoteUrl: null,
      durationSeconds: null,
      publishedAt: null,
    };
  }
}
