import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create a regular client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is on Free Plan only
    const { data: planData, error: planError } = await supabaseClient.rpc('get_user_plan_limits', {
      user_uuid: user.id
    })

    if (planError) {
      console.error('Error checking user plan:', planError)
      throw new Error('Failed to verify user plan')
    }

    const userPlan = planData && planData.length > 0 ? planData[0] : null
    if (!userPlan || userPlan.plan_name !== 'Free Plan') {
      throw new Error('Account deletion is only available for Free Plan users')
    }

    console.log(`[DELETE-ACCOUNT] Starting account deletion for user: ${user.email}`)

    // Delete all user data in order (foreign key dependencies)
    
    // 1. Delete video summaries
    const { error: videoSummariesError } = await supabaseAdmin
      .from('video_summaries')
      .delete()
      .eq('user_id', user.id)
    
    if (videoSummariesError) {
      console.error('Error deleting video summaries:', videoSummariesError)
    }

    // 2. Delete videos
    const { error: videosError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('user_id', user.id)
    
    if (videosError) {
      console.error('Error deleting videos:', videosError)
    }

    // 3. Delete categories
    const { error: categoriesError } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('user_id', user.id)
    
    if (categoriesError) {
      console.error('Error deleting categories:', categoriesError)
    }

    // 4. Delete push subscriptions
    const { error: pushError } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
    
    if (pushError) {
      console.error('Error deleting push subscriptions:', pushError)
    }

    // 5. Delete user subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id)
    
    if (subscriptionsError) {
      console.error('Error deleting user subscriptions:', subscriptionsError)
    }

    // 6. Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError)
    }

    // 7. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // 8. Finally, delete the auth user (this will cascade to any remaining references)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      throw deleteError
    }

    console.log(`[DELETE-ACCOUNT] Successfully deleted account for user: ${user.email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account successfully deleted. All your data has been permanently removed.' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error deleting account:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})