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
    console.log("Starting bulk user deletion...")
    
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

    // Create a regular client to verify the requesting user is an admin
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

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin role
    const { data: hasAdminRole, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (roleError || !hasAdminRole) {
      throw new Error('Insufficient permissions')
    }

    // Get the user IDs to delete from the request body
    const { userIds } = await req.json()
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs array is required')
    }

    console.log(`Deleting ${userIds.length} users:`, userIds)

    const results = []
    const errors = []

    // Delete users one by one
    for (const userId of userIds) {
      try {
        console.log(`Deleting user: ${userId}`)
        
        // Delete the user using the admin client
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        
        if (deleteError) {
          console.error(`Error deleting user ${userId}:`, deleteError)
          errors.push({ userId, error: deleteError.message })
        } else {
          console.log(`Successfully deleted user: ${userId}`)
          results.push({ userId, success: true })
        }
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error)
        errors.push({ userId, error: (error as any)?.message || 'Unknown error' })
      }
    }

    const response = {
      success: errors.length === 0,
      message: `Processed ${userIds.length} users`,
      results: {
        successful: results.length,
        failed: errors.length,
        details: {
          successful: results,
          failed: errors
        }
      }
    }

    console.log("Bulk deletion completed:", response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in bulk delete users:', error)
    return new Response(
      JSON.stringify({ error: (error as any)?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})