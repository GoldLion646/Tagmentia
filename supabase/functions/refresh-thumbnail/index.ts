import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract video ID from URL
function extractVideoId(url: string, platform: string): string | undefined {
  try {
    const urlObj = new URL(url);
    
    if (platform === 'youtube') {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;
      
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1).split('?')[0];
      }
    }
    
    if (platform === 'tiktok') {
      const match = urlObj.pathname.match(/\/video\/(\d+)/);
      return match ? match[1] : undefined;
    }
    
    if (platform === 'instagram') {
      const match = urlObj.pathname.match(/\/(p|reel)\/([^\/]+)/);
      return match ? match[2] : undefined;
    }
    
    if (platform === 'snapchat') {
      const match = urlObj.pathname.match(/\/spotlight\/([A-Za-z0-9_-]+)/);
      return match ? match[1] : undefined;
    }
    
    if (platform === 'loom') {
      const match = urlObj.pathname.match(/\/share\/([A-Za-z0-9_-]+)/);
      return match ? match[1] : undefined;
    }
  } catch (error) {
    console.error('Error extracting video ID:', error);
  }
  return undefined;
}

// Thumbnail fetching with retry and fallback strategy
async function fetchThumbnail(platform: string, canonicalUrl: string, videoId?: string): Promise<{
  thumbUrl: string | null;
  source: 'ytimg' | 'oembed' | 'og' | 'none';
}> {
  const timeout = 3000;
  const maxRetries = 2;
  
  async function fetchWithRetry(url: string, retries = 0): Promise<Response | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'Tagmentia/1.0' }
      });
      clearTimeout(timeoutId);
      
      return response;
    } catch (error) {
      if (retries < maxRetries) {
        const backoff = 200 * Math.pow(3, retries);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, retries + 1);
      }
      return null;
    }
  }
  
  // YouTube thumbnail strategy
  if (platform === 'youtube' && videoId) {
    const patterns = [
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ];
    
    for (const pattern of patterns) {
      const response = await fetchWithRetry(pattern);
      if (response && response.ok) {
        return { thumbUrl: pattern, source: 'ytimg' };
      }
    }
    
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
      const response = await fetchWithRetry(oembedUrl);
      if (response && response.ok) {
        const data = await response.json();
        if (data.thumbnail_url) {
          return { thumbUrl: data.thumbnail_url, source: 'oembed' };
        }
      }
    } catch (error) {
      console.error('YouTube oEmbed failed:', error);
    }
  }
  
  // TikTok thumbnail strategy
  if (platform === 'tiktok') {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(canonicalUrl)}`;
      const response = await fetchWithRetry(oembedUrl);
      if (response && response.ok) {
        const data = await response.json();
        if (data.thumbnail_url) {
          return { thumbUrl: data.thumbnail_url, source: 'oembed' };
        }
      }
    } catch (error) {
      console.error('TikTok oEmbed failed:', error);
    }
    
    try {
      const response = await fetchWithRetry(canonicalUrl);
      if (response && response.ok) {
        const html = await response.text();
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return { thumbUrl: ogImageMatch[1], source: 'og' };
        }
      }
    } catch (error) {
      console.error('TikTok OG failed:', error);
    }
  }
  
  // Instagram thumbnail strategy
  if (platform === 'instagram') {
    try {
      const response = await fetchWithRetry(canonicalUrl);
      if (response && response.ok) {
        const html = await response.text();
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return { thumbUrl: ogImageMatch[1], source: 'og' };
        }
      }
    } catch (error) {
      console.error('Instagram OG failed:', error);
    }
  }
  
  // Snapchat thumbnail strategy
  if (platform === 'snapchat') {
    try {
      const response = await fetchWithRetry(canonicalUrl);
      if (response && response.ok) {
        const html = await response.text();
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return { thumbUrl: ogImageMatch[1], source: 'og' };
        }
      }
    } catch (error) {
      console.error('Snapchat OG failed:', error);
    }
  }
  
  if (platform === 'loom') {
    try {
      // Try oEmbed API first
      const oembedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(canonicalUrl)}`;
      const oembedResponse = await fetchWithRetry(oembedUrl);
      if (oembedResponse && oembedResponse.ok) {
        const data = await oembedResponse.json();
        if (data.thumbnail_url) {
          return { thumbUrl: data.thumbnail_url, source: 'oembed' };
        }
      }
      
      // Fallback to Open Graph
      const response = await fetchWithRetry(canonicalUrl);
      if (response && response.ok) {
        const html = await response.text();
        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch && ogImageMatch[1]) {
          return { thumbUrl: ogImageMatch[1], source: 'og' };
        }
      }
    } catch (error) {
      console.error('Loom thumbnail fetch error:', error);
    }
  }
  
  return { thumbUrl: null, source: 'none' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video and verify ownership
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('id, url, tags, user_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !video) {
      return new Response(JSON.stringify({ error: 'Video not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine platform
    const platform = video.tags && video.tags[0] ? video.tags[0] : 'unknown';
    if (!['youtube', 'tiktok', 'instagram', 'snapchat'].includes(platform)) {
      return new Response(JSON.stringify({ error: 'Unsupported platform' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract video ID
    const extractedVideoId = extractVideoId(video.url, platform);

    console.log(`🔄 Refreshing thumbnail for ${platform} video ${videoId}...`);

    // Fetch thumbnail
    const thumbnailResult = await fetchThumbnail(platform, video.url, extractedVideoId);

    if (!thumbnailResult.thumbUrl) {
      console.warn(`⚠️ No thumbnail found for video ${videoId}`);
      return new Response(JSON.stringify({ 
        success: false,
        message: "We couldn't fetch a thumbnail for this video. The video may be private or the platform is temporarily unavailable."
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download and store thumbnail
    const response = await fetch(thumbnailResult.thumbUrl, {
      headers: { 'User-Agent': 'Tagmentia/1.0' }
    });

    if (!response.ok) {
      throw new Error(`Failed to download thumbnail: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    // Store in storage
    const timestamp = Date.now();
    const fileName = `${platform}/${extractedVideoId || videoId}/${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('video-thumbnails')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '86400',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('video-thumbnails')
      .getPublicUrl(fileName);

    // Update video record
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        thumbnail_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Thumbnail refreshed for video ${videoId}`);

    return new Response(JSON.stringify({ 
      success: true,
      thumbnailUrl: publicUrl,
      source: thumbnailResult.source,
      message: 'Thumbnail updated successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in refresh-thumbnail:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
