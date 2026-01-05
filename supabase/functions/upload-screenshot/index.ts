// @ts-ignore - Deno runtime imports (not available in Node.js TypeScript)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Deno runtime imports (not available in Node.js TypeScript)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

// Deno global type declaration for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get storage policy
    const { data: policyData, error: policyError } = await supabaseClient
      .from('storage_policy')
      .select('*')
      .single();

    if (policyError || !policyData) {
      console.error('Policy fetch error:', policyError);
      return new Response(JSON.stringify({ error: 'Failed to fetch storage policy' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const videoId = formData.get('videoId') as string;
    const categoryId = formData.get('categoryId') as string;
    const files = formData.getAll('files') as File[];

    if (!videoId || !categoryId || files.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hard size check on uploaded files (before processing)
    const maxUploadBytes = policyData.max_upload_mb * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxUploadBytes) {
        return new Response(JSON.stringify({ 
          error: `This file exceeds ${policyData.max_upload_mb} MB. Please upload a smaller image.`
        }), {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check screenshot count quota
    const { data: limitsData, error: limitsError } = await supabaseClient.rpc(
      'get_user_screenshot_limits',
      { user_uuid: user.id }
    );

    if (limitsError) {
      console.error('Limits check error:', limitsError);
      return new Response(JSON.stringify({ error: 'Failed to check quota' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limits = limitsData[0];
    const remainingQuota = limits.max_screenshots === -1 
      ? Infinity 
      : limits.max_screenshots - limits.current_screenshots;

    if (files.length > remainingQuota) {
      return new Response(JSON.stringify({ 
        error: `You've reached your screenshot limit. Upgrade your plan to add more screenshots.`,
        maxScreenshots: limits.max_screenshots,
        currentScreenshots: limits.current_screenshots,
        requiresUpgrade: true
      }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check storage quota
    const { data: storageQuotaData, error: quotaError } = await supabaseClient.rpc(
      'get_user_storage_quota',
      { user_uuid: user.id }
    );

    if (quotaError) {
      console.error('Storage quota check error:', quotaError);
      return new Response(JSON.stringify({ error: 'Failed to check storage quota' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storageQuota = storageQuotaData[0];
    if (storageQuota.quota_bytes !== null && storageQuota.remaining_bytes !== null) {
      if (storageQuota.remaining_bytes <= 0) {
        return new Response(JSON.stringify({ 
          error: `You've reached your storage limit. Delete older screenshots or upgrade your plan.`,
          requiresUpgrade: true
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabaseClient
      .from('videos')
      .select('user_id, category_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video || video.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Video not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uploadedScreenshots: any[] = [];
    let totalBytesAdded = 0;

    // Process each file
    for (const file of files) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.warn(`File ${file.name} has invalid type ${file.type}, skipping`);
        continue;
      }

      try {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // For now, we'll upload the original file
        // In production, you'd use sharp, imagemagick, or similar to:
        // 1. Decode image
        // 2. Resize to max_longest_edge_px
        // 3. Convert to WebP at compression_quality
        // 4. Generate thumb_320
        
        // Generate unique filename
        const fileExt = policyData.enforce_webp ? 'webp' : (file.name.split('.').pop() || 'jpg');
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${user.id}/${categoryId}/${videoId}/${fileName}`;

        // Upload file to storage
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('screenshots')
          .upload(filePath, uint8Array, {
            contentType: policyData.enforce_webp ? 'image/webp' : file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Get file size from storage
        const { data: fileInfo } = await supabaseClient.storage
          .from('screenshots')
          .list(uploadData.path.split('/').slice(0, -1).join('/'), {
            search: fileName
          });

        const actualSize = fileInfo && fileInfo.length > 0 ? fileInfo[0].metadata?.size || file.size : file.size;

        // Check storage quota before committing
        if (storageQuota.quota_bytes !== null) {
          const prospectiveUsage = storageQuota.used_bytes + totalBytesAdded + actualSize;
          if (prospectiveUsage > storageQuota.quota_bytes) {
            // Rollback this upload
            await supabaseClient.storage.from('screenshots').remove([filePath]);
            console.warn('Would exceed storage quota, rolled back upload');
            break;
          }
        }

        // Get public URL (bucket is public)
        const { data: { publicUrl: originalUrl } } = supabaseClient.storage
          .from('screenshots')
          .getPublicUrl(filePath);

        // Use the same URL for all sizes (no server-side transformations)
        // The browser will handle resizing via CSS
        const image1600Url = originalUrl;
        const thumb320Url = originalUrl;

        // Create database record
        const { data: screenshot, error: dbError } = await supabaseClient
          .from('screenshots')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            video_id: videoId,
            original_url: originalUrl!,
            image_1600_url: image1600Url!,
            thumb_320_url: thumb320Url!,
            size_bytes: actualSize,
            format: fileExt,
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB insert error:', dbError);
          // Clean up uploaded file
          await supabaseClient.storage.from('screenshots').remove([filePath]);
          continue;
        }

        totalBytesAdded += actualSize;
        uploadedScreenshots.push(screenshot);

      } catch (error) {
        console.error('Error processing file:', error);
        continue;
      }
    }

    // Update user storage usage
    if (totalBytesAdded > 0) {
      const { error: usageError } = await supabaseClient
        .from('user_storage_usage')
        .upsert({
          user_id: user.id,
          used_bytes: storageQuota.used_bytes + totalBytesAdded,
          updated_at: new Date().toISOString(),
        });

      if (usageError) {
        console.error('Failed to update storage usage:', usageError);
      }

      // Log upload event
      console.log('Storage upload:', {
        user_id: user.id,
        bytes_added: totalBytesAdded,
        total_used: storageQuota.used_bytes + totalBytesAdded,
        quota: storageQuota.quota_bytes,
      });
    }

    return new Response(JSON.stringify({ 
      screenshots: uploadedScreenshots,
      uploaded: uploadedScreenshots.length,
      total: files.length,
      bytes_added: totalBytesAdded,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-screenshot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});