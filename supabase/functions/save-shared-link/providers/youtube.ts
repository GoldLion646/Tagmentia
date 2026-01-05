// YouTube provider implementation

import { VideoProvider, VideoMetadata, CanonicalResult } from './types.ts';

export class YouTubeProvider implements VideoProvider {
  platform = 'youtube' as const;

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname.includes('youtube.com') || hostname === 'youtu.be';
    } catch {
      return false;
    }
  }

  canonicalize(url: string): CanonicalResult | null {
    try {
      const parsed = new URL(url);
      let videoId: string | null = null;

      // Handle youtu.be short links
      if (parsed.hostname === 'youtu.be') {
        videoId = parsed.pathname.slice(1);
      } 
      // Handle youtube.com/watch?v=
      else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      }
      // Handle youtube.com/embed/ or /v/
      else if (parsed.pathname.startsWith('/embed/') || parsed.pathname.startsWith('/v/')) {
        videoId = parsed.pathname.split('/')[2];
      }

      if (!videoId) {
        console.error('❌ Could not extract YouTube video ID from:', url);
        return null;
      }

      // Build canonical URL, keeping timestamp if present
      const canonical = new URL('https://www.youtube.com/watch');
      canonical.searchParams.set('v', videoId);
      
      const timestamp = parsed.searchParams.get('t');
      if (timestamp) {
        canonical.searchParams.set('t', timestamp);
      }

      console.log(`✅ YouTube canonical: ${canonical.toString()}`);
      return {
        canonical: canonical.toString(),
        platform: this.platform,
        videoId,
      };
    } catch (error) {
      console.error('❌ YouTube canonicalize error:', error);
      return null;
    }
  }

  async fetchMetadata(canonicalUrl: string): Promise<VideoMetadata> {
    console.log('📹 Fetching YouTube metadata for:', canonicalUrl);
    
    try {
      // Try oEmbed first (reliable and fast)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
      const oembedRes = await fetch(oembedUrl);

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        console.log('✅ YouTube oEmbed data:', data);

        // Extract video ID for thumbnail
        const videoId = new URL(canonicalUrl).searchParams.get('v');
        let thumbUrl = data.thumbnail_url;

        // Try higher quality thumbnails
        if (videoId) {
          const maxResUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          const hqUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          
          // Test if maxresdefault exists
          try {
            const testRes = await fetch(maxResUrl, { method: 'HEAD' });
            if (testRes.ok) {
              thumbUrl = maxResUrl;
            } else {
              thumbUrl = hqUrl;
            }
          } catch {
            thumbUrl = hqUrl;
          }
        }

        return {
          title: data.title || null,
          creator: data.author_name || null,
          thumbRemoteUrl: thumbUrl,
          durationSeconds: null, // Would need YouTube Data API for this
          publishedAt: null,
        };
      }
    } catch (error) {
      console.error('⚠️ YouTube oEmbed failed:', error);
    }

    // Fallback: try OG tags
    try {
      const response = await fetch(canonicalUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<meta\s+property=[\"']og:title[\"']\s+content=[\"']([^\"']+)[\"']/i);
        const imageMatch = html.match(/<meta\s+property=[\"']og:image[\"']\s+content=[\"']([^\"']+)[\"']/i);

        return {
          title: titleMatch?.[1] || null,
          creator: null,
          thumbRemoteUrl: imageMatch?.[1] || null,
          durationSeconds: null,
          publishedAt: null,
        };
      }
    } catch (error) {
      console.error('⚠️ YouTube OG fallback failed:', error);
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
