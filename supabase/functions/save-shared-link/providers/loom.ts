// Loom provider implementation

import { VideoProvider, VideoMetadata, CanonicalResult } from './types.ts';

export class LoomProvider implements VideoProvider {
  platform = 'loom' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname.includes('loom.com');
    } catch {
      return false;
    }
  }

  canonicalize(url: string): CanonicalResult | null {
    try {
      const parsed = new URL(url);
      const cleanPath = parsed.pathname.replace(/\?.*$/, '');
      
      // Extract video ID from /share/VIDEO_ID pattern
      const videoIdMatch = cleanPath.match(/\/share\/([A-Za-z0-9_-]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : undefined;
      
      if (!videoId) {
        console.error('❌ Could not extract Loom video ID from:', url);
        return null;
      }

      const canonical = `https://www.loom.com/share/${videoId}`;
      
      console.log(`✅ Loom canonical: ${canonical}`);
      return {
        canonical,
        platform: this.platform,
        videoId,
      };
    } catch (error) {
      console.error('❌ Loom canonicalize error:', error);
      return null;
    }
  }

  async fetchMetadata(canonicalUrl: string): Promise<VideoMetadata> {
    console.log('🎥 Fetching Loom metadata for:', canonicalUrl);

    try {
      // Try oEmbed API first
      try {
        const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(canonicalUrl)}`;
        const oembedResponse = await fetch(oembedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });

        if (oembedResponse.ok) {
          const oembedData = await oembedResponse.json();
          console.log('✅ Loom oEmbed data:', oembedData);
          
          return {
            title: oembedData.title || null,
            creator: oembedData.author_name || null,
            thumbRemoteUrl: oembedData.thumbnail_url || null,
            description: oembedData.description || null,
          };
        }
      } catch (oembedError) {
        console.log('⚠️ Loom oEmbed failed, trying Open Graph...');
      }

      // Fallback to Open Graph scraping
      const response = await fetch(canonicalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        console.error('❌ Loom fetch failed with status:', response.status);
        return this.getFallbackMetadata();
      }

      const html = await response.text();
      console.log(`📄 Loom HTML length: ${html.length} characters`);

      // Extract OG tags
      const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
      const descriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      const authorMatch = html.match(/<meta\s+property=["']og:video:author["']\s+content=["']([^"']+)["']/i) ||
                          html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);

      const title = titleMatch ? titleMatch[1] : null;
      const description = descriptionMatch ? descriptionMatch[1] : null;
      const thumbRemoteUrl = imageMatch ? imageMatch[1] : null;
      const creator = authorMatch ? authorMatch[1] : null;

      console.log('✅ Loom metadata extracted:', { title, creator, hasThumbnail: !!thumbRemoteUrl });

      return {
        title,
        creator,
        thumbRemoteUrl,
        description,
      };
    } catch (error) {
      console.error('❌ Loom metadata fetch error:', error);
      return this.getFallbackMetadata();
    }
  }

  private getFallbackMetadata(): VideoMetadata {
    return {
      title: null,
      creator: null,
      thumbRemoteUrl: null,
      description: null,
    };
  }
}

