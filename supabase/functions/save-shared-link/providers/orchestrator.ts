// Orchestrator for handling video link saves across all platforms

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { VideoProvider, Platform, isAllowedHostname } from './types.ts';
import { YouTubeProvider } from './youtube.ts';
import { TikTokProvider } from './tiktok.ts';
import { InstagramProvider } from './instagram.ts';
import { SnapchatProvider } from './snapchat.ts';
import { LoomProvider } from './loom.ts';

const providers: VideoProvider[] = [
  new YouTubeProvider(),
  new TikTokProvider(),
  new InstagramProvider(),
  new SnapchatProvider(),
  new LoomProvider(),
];

export interface SaveVideoResult {
  success: boolean;
  videoId?: string;
  error?: string;
  platform?: Platform;
}

export async function saveVideoLink(
  url: string,
  userId: string,
  categoryId: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  note?: string,
  reminderAt?: string
): Promise<SaveVideoResult> {
  console.log('🎬 Orchestrator: saveVideoLink called', { url, userId, categoryId });

  // Step 1: Check if URL is from allowed hostname
  if (!isAllowedHostname(url)) {
    console.error('❌ Unsupported hostname:', url);
    return {
      success: false,
      error: 'UNSUPPORTED_PLATFORM',
    };
  }

  // Step 2: Find provider that can handle this URL
  const provider = providers.find(p => p.canHandle(url));
  
  if (!provider) {
    console.error('❌ No provider found for URL:', url);
    return {
      success: false,
      error: 'Unable to determine video platform for this URL.',
    };
  }

  console.log(`✅ Provider found: ${provider.platform}`);

  // Step 3: Canonicalize the URL
  const canonicalResult = provider.canonicalize(url);
  
  if (!canonicalResult) {
    console.error('❌ Failed to canonicalize URL');
    return {
      success: false,
      error: 'Failed to process video URL. Please check the URL format.',
    };
  }

  const { canonical, platform, videoId } = canonicalResult;
  console.log(`📋 Canonical URL: ${canonical}`);

  // Step 4: Create Supabase client with service role (for storage operations)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });

  // Step 5: Check for duplicates
  const { data: existingVideos, error: checkError } = await supabase
    .from('videos')
    .select('id')
    .eq('user_id', userId)
    .eq('url', canonical)
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking for duplicates:', checkError);
  } else if (existingVideos && existingVideos.length > 0) {
    console.log('⚠️ Duplicate video detected');
    return {
      success: false,
      error: 'DUPLICATE_VIDEO',
    };
  }

  // Step 6: Create initial video record with pending_meta status
  const initialVideoData = {
    user_id: userId,
    category_id: categoryId,
    url: canonical,
    platform,
    title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
    meta_status: 'pending_meta',
    reminder_date: reminderAt || null,
  };

  const { data: videoRecord, error: insertError } = await supabase
    .from('videos')
    .insert(initialVideoData)
    .select()
    .single();

  if (insertError || !videoRecord) {
    console.error('❌ Failed to insert video record:', insertError);
    return {
      success: false,
      error: 'Failed to save video to database.',
    };
  }

  console.log(`✅ Video record created with ID: ${videoRecord.id}`);

  // Step 7: Fetch metadata asynchronously (don't await - let it run in background)
  fetchAndUpdateMetadata(
    videoRecord.id,
    canonical,
    platform,
    provider,
    supabase
  ).catch(error => {
    console.error('❌ Background metadata fetch failed:', error);
  });

  return {
    success: true,
    videoId: videoRecord.id,
    platform,
  };
}

async function fetchAndUpdateMetadata(
  videoId: string,
  canonicalUrl: string,
  platform: Platform,
  provider: VideoProvider,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  console.log(`🔄 Background: Fetching metadata for video ${videoId}`);

  try {
    // Fetch metadata from provider
    const metadata = await provider.fetchMetadata(canonicalUrl);
    console.log(`📊 Metadata fetched:`, metadata);

    // Prepare update data
    const updateData: Record<string, any> = {
      title: metadata.title || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Video`,
      creator: metadata.creator,
      duration: metadata.durationSeconds,
      published_at: metadata.publishedAt,
      thumbnail_last_checked_at: new Date().toISOString(),
      meta_status: 'ready',
      meta_error: null,
    };

    // Handle thumbnail if available
    if (metadata.thumbRemoteUrl) {
      console.log(`📥 Downloading thumbnail from: ${metadata.thumbRemoteUrl}`);
      
      try {
        // Download thumbnail with timeout and size limit
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        // Use platform-specific headers for thumbnail download
        const thumbHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        };

        // Instagram requires referer header for CDN downloads
        if (platform === 'instagram') {
          thumbHeaders['referer'] = 'https://www.instagram.com/';
          thumbHeaders['accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
        }

        const thumbResponse = await fetch(metadata.thumbRemoteUrl, {
          signal: controller.signal,
          headers: thumbHeaders,
        });
        clearTimeout(timeoutId);

        if (thumbResponse.ok) {
          const contentType = thumbResponse.headers.get('content-type');
          
          // Validate MIME type
          if (contentType && ['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
            const blob = await thumbResponse.blob();
            
            // Check size (max 5MB)
            if (blob.size <= 5 * 1024 * 1024) {
              // Generate filename
              const fileExt = contentType.split('/')[1];
              const fileName = `${platform}/${videoId}.${fileExt}`;
              
              // Upload to storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('video-thumbnails')
                .upload(fileName, blob, {
                  contentType,
                  upsert: true,
                });

              if (uploadError) {
                console.error('❌ Thumbnail upload failed:', uploadError);
                updateData.thumbnail_source = 'none';
              } else {
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                  .from('video-thumbnails')
                  .getPublicUrl(fileName);

                updateData.thumbnail_url = publicUrl;
                updateData.thumbnail_source = 'direct';
                console.log(`✅ Thumbnail uploaded: ${publicUrl}`);
              }
            } else {
              console.warn('⚠️ Thumbnail too large:', blob.size);
              updateData.thumbnail_source = 'none';
            }
          } else {
            console.warn('⚠️ Invalid thumbnail content type:', contentType);
            updateData.thumbnail_source = 'none';
          }
        } else {
          console.warn('⚠️ Thumbnail fetch failed:', thumbResponse.status);
          updateData.thumbnail_source = 'none';
        }
      } catch (thumbError) {
        console.error('❌ Thumbnail processing error:', thumbError);
        updateData.thumbnail_source = 'none';
      }
    } else {
      updateData.thumbnail_source = 'none';
    }

    // Update video record
    const { error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId);

    if (updateError) {
      console.error('❌ Failed to update video metadata:', updateError);
      
      // Update status to failed
      await supabase
        .from('videos')
        .update({
          meta_status: 'failed_meta',
          meta_error: updateError.message,
        })
        .eq('id', videoId);
    } else {
      console.log(`✅ Video ${videoId} updated successfully`);
    }
  } catch (error) {
    console.error('❌ Metadata fetch error:', error);
    
    // Update status to failed
    await supabase
      .from('videos')
      .update({
        meta_status: 'failed_meta',
        meta_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', videoId);
  }
}
