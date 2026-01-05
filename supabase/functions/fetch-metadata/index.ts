// Deno Edge Function: fetch-metadata
// Fetches Open Graph metadata (title, image) for a given URL, focusing on Instagram reels

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

async function extractOgTags(html: string) {
  // Collect all <meta> tags and parse attributes (handles single/double quotes and any order)
  const metas = Array.from(html.matchAll(/<meta[^>]*>/gi));
  const parsed = metas.map((m) => {
    const attrs = Object.fromEntries(
      Array.from(m[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']+)["']/gi)).map((a) => [a[1].toLowerCase(), a[2]])
    );
    return attrs as Record<string, string>;
  });

  const getContent = (attrs: Record<string, string>) =>
    attrs.content ?? attrs.value ?? null;

  const findByProperty = (...props: string[]) =>
    parsed.find((a) => props.includes((a.property ?? a.name ?? '').toLowerCase()));

  // Extract title with improved fallbacks
  const titleTag = findByProperty('og:title', 'title', 'twitter:title');
  let title = titleTag ? getContent(titleTag) : null;
  if (!title) {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = m?.[1] ?? null;
  }

  // Enhanced image extraction with platform-specific patterns
  const imageTag =
    findByProperty('og:image:secure_url') ??
    findByProperty('og:image:url') ??
    findByProperty('og:image') ??
    findByProperty('twitter:image:src') ??
    findByProperty('twitter:image') ??
    findByProperty('twitter:image:alt') ??
    findByProperty('image') ??
    findByProperty('thumbnail') ??
    findByProperty('thumbnail_url');

  let image = imageTag ? getContent(imageTag) : null;

  // Instagram specific: Look for video thumbnail if no image found
  if (!image) {
    const videoThumbTag = findByProperty('og:video:thumbnail') ?? findByProperty('twitter:player:stream');
    image = videoThumbTag ? getContent(videoThumbTag) : null;
  }

  // Platform-specific fallback patterns
  if (!image) {
    if (html.includes('tiktok')) {
      // TikTok-specific patterns with enhanced coverage
      const tiktokPatterns = [
        // Enhanced TikTok patterns for 2025
        /"cover":"([^"]+)"/,
        /"originCover":"([^"]+)"/,
        /"dynamicCover":"([^"]+)"/,
        /"thumbnail":"([^"]+)"/,
        /"origin_cover":"([^"]+)"/,
        /"dynamic_cover":"([^"]+)"/,
        /"video":\s*{\s*"cover":"([^"]+)"/,
        /"videoObjectPageProps":\s*{[^}]*"cover":"([^"]+)"/,
        /"__DEFAULT_SCOPE__":\s*{[^}]*"webapp\.video-detail":\s*{[^}]*"itemInfo":\s*{[^}]*"itemStruct":\s*{[^}]*"video":\s*{[^}]*"cover":"([^"]+)"/,
        /"itemInfo":\s*{[^}]*"itemStruct":\s*{[^}]*"video":\s*{[^}]*"cover":"([^"]+)"/,
        /"itemStruct":\s*{[^}]*"video":\s*{[^}]*"cover":"([^"]+)"/,
        /"video":\s*{[^}]*"originCover":"([^"]+)"/,
        /"video":\s*{[^}]*"dynamicCover":"([^"]+)"/,
        // Additional modern TikTok patterns
        /"preloadList":\s*\[[^}]*"url":"([^"]*\.webp[^"]*)"/,
        /"preloadList":\s*\[[^}]*"url":"([^"]*\.jpg[^"]*)"/,
        /"playAddr":"([^"]+\.jpg[^"]*)"/,
        /"downloadAddr":"([^"]+\.jpg[^"]*)"/,
        /"coverLarge":"([^"]+)"/,
        /"coverMedium":"([^"]+)"/,
        /"coverThumb":"([^"]+)"/,
        /"cover_large":"([^"]+)"/,
        /"cover_medium":"([^"]+)"/,
        /"cover_thumb":"([^"]+)"/,
        // For newer TikTok structure
        /"VideoModule":\s*{[^}]*"[^"]*":\s*{[^}]*"video":\s*{[^}]*"cover":"([^"]+)"/,
        /"seoProps":\s*{[^}]*"metaParams":\s*{[^}]*"video_object_page":\s*{[^}]*"cover":"([^"]+)"/,
        // Alternative structures
        /window\.__INITIAL_STATE__[^{]*{[^}]*"VideoModule"[^}]*"cover":"([^"]+)"/,
        /window\.__NUXT__[^{]*{[^}]*"cover":"([^"]+)"/
      ];
      
      for (const pattern of tiktokPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          // Clean up the URL by removing escape characters and fixing encoding
          let cleanedUrl = match[1]
            .replace(/\\u002F/g, '/')      // Fix encoded forward slashes
            .replace(/\\u0026/g, '&')      // Fix encoded ampersands
            .replace(/\\\//g, '/')         // Fix escaped forward slashes
            .replace(/\\/g, '')            // Remove remaining backslashes
            .replace(/&amp;/g, '&')        // Fix HTML entities
            .replace(/u002F/g, '/')        // Fix unescaped encoded slashes
            .replace(/u0026/g, '&');       // Fix unescaped encoded ampersands
          
          // Ensure HTTPS
          if (cleanedUrl.startsWith('//')) {
            cleanedUrl = 'https:' + cleanedUrl;
          } else if (!cleanedUrl.startsWith('http')) {
            cleanedUrl = 'https://' + cleanedUrl;
          }
          
          // Additional URL cleaning for TikTok CDN URLs
          try {
            cleanedUrl = decodeURIComponent(cleanedUrl);
          } catch (e) {
            // If decode fails, use the URL as is
            console.log('Failed to decode URL, using as is:', cleanedUrl);
          }
          
          // Validate that we have a proper image URL
          if (cleanedUrl.includes('tiktokcdn.com') || cleanedUrl.includes('muscdn.com') || 
              cleanedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
            image = cleanedUrl;
            console.log(`Found TikTok thumbnail with pattern: ${pattern.source}, URL: ${image}`);
            break;
          }
        }
      }
    } else if (html.includes('instagram')) {
      // Enhanced Instagram specific patterns for 2025
      const instagramPatterns = [
        // Primary Instagram patterns
        /"display_url":"([^"]+)"/,
        /"src":"([^"]*\.jpg[^"]*)",/,
        /"src":"([^"]*\.jpeg[^"]*)",/,
        /"src":"([^"]*\.png[^"]*)",/,
        /"src":"([^"]*\.webp[^"]*)",/,
        /"thumbnail_src":"([^"]+)"/,
        /"profile_pic_url":"([^"]+)"/,
        // Modern Instagram structure patterns
        /"image_versions2":\s*{\s*"candidates":\s*\[\s*{\s*"url":"([^"]+)"/,
        /"candidates":\s*\[\s*{\s*"url":"([^"]+)"/,
        /"thumbnail_url":"([^"]+)"/,
        /"media_preview":"([^"]+)"/,
        // Instagram Reels specific patterns
        /"video_versions":\s*\[[^}]*"url":"([^"]*\.jpg[^"]*)"/,
        /"dash_manifest":"([^"]*\.jpg[^"]*)"/,
        // Instagram Stories and highlights
        /"cover_media":\s*{[^}]*"cropped_image_version":\s*{[^}]*"url":"([^"]+)"/,
        /"image_url":"([^"]+)"/,
        // Additional Instagram CDN patterns
        /instagram\.com\/[^"]*\.jpg/g,
        /scontent[^"]*\.jpg/g,
        /cdninstagram\.com\/[^"]*\.jpg/g,
        // Instagram GraphQL response patterns
        /"node":\s*{[^}]*"display_url":"([^"]+)"/,
        /"edge_media_to_caption":[^}]*"display_url":"([^"]+)"/,
        /"shortcode_media":[^}]*"display_url":"([^"]+)"/,
        // Instagram API response patterns
        /"media_url":"([^"]+)"/,
        /"permalink_url":"([^"]*\.jpg[^"]*)"/,
        /"media_product_type":[^}]*"media_url":"([^"]+)"/
      ];
      
      for (const pattern of instagramPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let cleanedUrl = match[1]
            .replace(/\\u0026/g, '&')
            .replace(/\\/g, '')
            .replace(/&amp;/g, '&')
            .replace(/\\u002F/g, '/')
            .replace(/u002F/g, '/');
          
          // Ensure HTTPS for Instagram URLs
          if (cleanedUrl.startsWith('//')) {
            cleanedUrl = 'https:' + cleanedUrl;
          } else if (!cleanedUrl.startsWith('http')) {
            cleanedUrl = 'https://' + cleanedUrl;
          }
          
          // Validate that we have a proper Instagram image URL
          if (cleanedUrl.includes('instagram') || cleanedUrl.includes('scontent') || 
              cleanedUrl.includes('cdninstagram') || cleanedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
            image = cleanedUrl;
            console.log(`Found Instagram thumbnail with pattern: ${pattern.source}, URL: ${image}`);
            break;
          }
        }
      }
    } else if (html.includes('snapchat')) {
      // Snapchat Spotlight specific patterns
      const snapchatPatterns = [
        /"thumbnailUrl":"([^"]+)"/,
        /"thumbnail":"([^"]+)"/,
        /"image":"([^"]+)"/,
        /"snapMediaURL":"([^"]+)"/,
        /"coverImageUrl":"([^"]+)"/,
        /"poster":"([^"]+)"/,
        // Snapchat CDN patterns
        /cf-st\.sc-cdn\.net\/[^"]*\.jpg/g,
        /bolt-gcdn\.sc-cdn\.net\/[^"]*\.jpg/g,
        /story\.snapchat\.com\/[^"]*\.jpg/g,
      ];
      
      for (const pattern of snapchatPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          let cleanedUrl = match[1]
            .replace(/\\u002F/g, '/')
            .replace(/\\u0026/g, '&')
            .replace(/\\\//g, '/')
            .replace(/\\/g, '')
            .replace(/&amp;/g, '&');
          
          // Ensure HTTPS
          if (cleanedUrl.startsWith('//')) {
            cleanedUrl = 'https:' + cleanedUrl;
          } else if (!cleanedUrl.startsWith('http')) {
            cleanedUrl = 'https://' + cleanedUrl;
          }
          
          // Validate that we have a proper Snapchat image URL
          if (cleanedUrl.includes('snapchat') || cleanedUrl.includes('sc-cdn') || 
              cleanedUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i)) {
            image = cleanedUrl;
            console.log(`Found Snapchat thumbnail with pattern: ${pattern.source}, URL: ${image}`);
            break;
          }
        }
      }
    }
  }

  // Additional fallback: look for thumbnail in JSON-LD data
  if (!image) {
    const jsonLdMatch = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
    if (jsonLdMatch) {
      for (const script of jsonLdMatch) {
        try {
          const jsonContent = script.replace(/<[^>]*>/g, '');
          const data = JSON.parse(jsonContent);
          if (data.image || (data.video && data.video.thumbnailUrl)) {
            image = data.image || data.video.thumbnailUrl;
            break;
          }
        } catch (e) {
          // Continue to next script
        }
      }
    }
  }

  // Extract tags/hashtags
  const keywordMeta = parsed.find((a) => (a.name ?? '').toLowerCase() === 'keywords');
  let keywordTags: string[] = [];
  const kwContent = keywordMeta ? getContent(keywordMeta) : null;
  if (kwContent) {
    keywordTags = kwContent
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const tagMetas = parsed.filter((a) => {
    const prop = (a.property ?? a.name ?? '').toLowerCase();
    return prop === 'og:video:tag' || prop === 'video:tag' || prop === 'article:tag';
  });
  const ogTags = tagMetas.map(getContent).filter(Boolean) as string[];

  const hashtagMatches = Array.from(html.matchAll(/#([A-Za-z0-9_][A-Za-z0-9_\-]{0,59})/g)).map((m) => m[1]);

  const tags = Array.from(
    new Set(
      [...keywordTags, ...ogTags, ...hashtagMatches]
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 25);

  // Decode HTML entities like &amp;
  const decode = (s: string | null) =>
    s ? s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/') : s;

  return { title: decode(title), image: decode(image), tags };
}

function detectPlatform(url: string) {
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('snapchat.com')) return 'snapchat';
  return 'other';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid url' }), {
        status: 400,
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const platform = detectPlatform(url);
    console.log(`Detected platform: ${platform} for URL: ${url}`);

    // Try TikTok oEmbed API first for better reliability
    if (platform === 'tiktok') {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('Attempting TikTok oEmbed API:', oembedUrl);
        const oembedRes = await fetch(oembedUrl);
        
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          console.log('TikTok oEmbed response:', oembedData);
          
          if (oembedData.thumbnail_url || oembedData.title) {
            return new Response(
              JSON.stringify({
                platform: 'tiktok',
                title: oembedData.title ?? null,
                thumbnail_url: oembedData.thumbnail_url ?? null,
                tags: [],
              }),
              { 
                headers: { 
                  'content-type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                } 
              }
            );
          }
        } else {
          console.log('TikTok oEmbed failed with status:', oembedRes.status);
        }
      } catch (oembedError) {
        console.log('TikTok oEmbed error, falling back to HTML scraping:', oembedError);
      }
    }

    // Fetch HTML with a browser-like User-Agent to improve chances of receiving OG tags
    const headers: Record<string, string> = {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'accept-language': 'en-US,en;q=0.9',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'cache-control': 'no-cache',
      'pragma': 'no-cache'
    };

    // Add platform-specific headers
    if (platform === 'instagram') {
      headers['referer'] = 'https://www.instagram.com/';
      headers['accept-encoding'] = 'gzip, deflate, br';
      headers['sec-fetch-dest'] = 'document';
      headers['sec-fetch-mode'] = 'navigate';
      headers['sec-fetch-site'] = 'cross-site';
      headers['sec-fetch-user'] = '?1';
      headers['upgrade-insecure-requests'] = '1';
      headers['x-instagram-ajax'] = '1';
      headers['x-asbd-id'] = '129477';
      headers['x-ig-app-id'] = '936619743392459';
    } else if (platform === 'tiktok') {
      headers['referer'] = 'https://www.tiktok.com/';
      headers['accept-encoding'] = 'gzip, deflate, br';
      headers['sec-fetch-dest'] = 'document';
      headers['sec-fetch-mode'] = 'navigate';
      headers['sec-fetch-site'] = 'none';
      headers['sec-fetch-user'] = '?1';
      headers['upgrade-insecure-requests'] = '1';
      headers['accept-language'] = 'en-US,en;q=0.9';
    } else if (platform === 'snapchat') {
      headers['referer'] = 'https://www.snapchat.com/';
      headers['accept-encoding'] = 'gzip, deflate, br';
      headers['sec-fetch-dest'] = 'document';
      headers['sec-fetch-mode'] = 'navigate';
      headers['sec-fetch-site'] = 'none';
      headers['sec-fetch-user'] = '?1';
      headers['upgrade-insecure-requests'] = '1';
    }

    console.log('Fetching URL with headers:', headers);
    const res = await fetch(url, {
      redirect: 'follow',
      headers,
    });

    if (!res.ok) {
      console.error(`Failed to fetch URL: ${url}, Status: ${res.status}, StatusText: ${res.statusText}`);
      return new Response(JSON.stringify({ error: 'Failed to fetch URL', status: res.status }), {
        status: 502,
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const html = await res.text();
    console.log(`Fetched HTML length: ${html.length} characters`);
    console.log('HTML preview (first 500 chars):', html.substring(0, 500));
    
    const { title, image, tags } = await extractOgTags(html);
    console.log(`Extracted metadata - Title: ${title}, Image: ${image}, Tags: ${Array.isArray(tags) ? tags.join(', ') : 'none'}`);

    return new Response(
      JSON.stringify({
        platform,
        title: title ?? null,
        thumbnail_url: image ?? null,
        tags: Array.isArray(tags) ? tags : [],
      }),
      { 
        headers: { 
          'content-type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: String(err) }), {
      status: 500,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
