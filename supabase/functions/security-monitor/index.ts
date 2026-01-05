import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityAlert {
  type: 'critical_event' | 'multiple_failures' | 'admin_activity' | 'brute_force' | 'session_anomaly' | 'geographic_anomaly'
  event: any
  threshold_exceeded?: boolean
  count?: number
  geographic_risk?: boolean
  session_risk?: boolean
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { events } = await req.json()
    
    console.log(`Processing ${events?.length || 0} security events`)
    
    for (const event of events || []) {
      console.log(`[${event.severity}] ${event.event_type}:`, event.details)
      
      // Process critical events
      if (event.severity === 'critical') {
        await handleCriticalEvent(supabaseClient, event)
      }
      
      // Check for brute force attempts
      if (event.event_type === 'brute_force_attempt') {
        await handleBruteForceAttempt(supabaseClient, event)
      }
      
      // Check for suspicious patterns
      if (event.event_type === 'auth_failure') {
        await checkAuthFailurePattern(supabaseClient, event)
      }
      
      // Monitor geographic anomalies
      if (event.geographic_info) {
        await checkGeographicAnomaly(supabaseClient, event)
      }
      
      // Monitor session anomalies
      if (event.event_type === 'session_anomaly') {
        await handleSessionAnomaly(supabaseClient, event)
      }
      
      // Monitor admin activities
      if (event.event_type === 'admin_action') {
        await logAdminActivity(supabaseClient, event)
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events?.length || 0 }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error processing security events:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process security events' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function handleCriticalEvent(supabase: any, event: any) {
  console.log(`🚨 CRITICAL EVENT: ${event.event_type}`, event.details)
  
  // In a real implementation, you might:
  // - Send email/SMS alerts to administrators
  // - Create incident tickets
  // - Trigger automated responses (like account lockouts)
  // - Log to external monitoring systems
  
  // For now, we'll just ensure it's logged with high priority
  await supabase.rpc('log_security_event', {
    p_event_type: 'critical_alert_processed',
    p_details: {
      original_event: event.event_type,
      original_details: event.details,
      alert_processed_at: new Date().toISOString()
    },
    p_severity: 'high'
  })
}

async function checkAuthFailurePattern(supabase: any, event: any) {
  // Check for multiple auth failures from same user/IP in short time
  const timeWindow = 15 * 60 * 1000 // 15 minutes
  const threshold = 5
  
  const recentFailures = await supabase
    .from('security_audit_log')
    .select('*')
    .eq('event_type', 'auth_failure')
    .gte('created_at', new Date(Date.now() - timeWindow).toISOString())
    .or(`details->>email.eq.${event.details?.email},ip_address.eq.${event.ip_address}`)
  
  if (recentFailures.data && recentFailures.data.length >= threshold) {
    await supabase.rpc('log_security_event', {
      p_event_type: 'auth_failure_threshold_exceeded',
      p_details: {
        email: event.details?.email,
        ip_address: event.ip_address,
        failure_count: recentFailures.data.length,
        time_window_minutes: 15
      },
      p_severity: 'high'
    })
    
    console.log(`⚠️ Auth failure threshold exceeded for ${event.details?.email || event.ip_address}`)
  }
}

async function handleBruteForceAttempt(supabase: any, event: any) {
  console.log(`🔒 BRUTE FORCE ATTEMPT detected for ${event.details?.email}`)
  
  // Log the brute force attempt with high priority
  await supabase.rpc('log_security_event', {
    p_event_type: 'brute_force_detected',
    p_details: {
      target_email: event.details?.email,
      attempt_count: event.details?.attempt_count,
      ip_address: event.ip_address,
      geographic_info: event.geographic_info,
      detected_at: new Date().toISOString()
    },
    p_severity: 'critical'
  })
  
  // In a real implementation, you might:
  // - Temporarily block the IP address
  // - Send immediate alerts to security team
  // - Lock the target account temporarily
}

async function checkGeographicAnomaly(supabase: any, event: any) {
  if (!event.user_id || !event.geographic_info?.country) return
  
  // Check user's typical login locations
  const recentLogins = await supabase
    .from('security_audit_log')
    .select('details')
    .eq('user_id', event.user_id)
    .eq('event_type', 'auth_success')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .limit(10)
  
  if (recentLogins.data?.length > 0) {
    const countries = recentLogins.data
      .map((log: any) => log.details?.geographic_info?.country)
      .filter(Boolean)
    
    const currentCountry = event.geographic_info.country
    const isNewCountry = !countries.includes(currentCountry)
    
    if (isNewCountry && countries.length > 0) {
      console.log(`🌍 Geographic anomaly: User ${event.user_id} logging in from new country: ${currentCountry}`)
      
      await supabase.rpc('log_security_event', {
        p_event_type: 'geographic_anomaly',
        p_user_id: event.user_id,
        p_details: {
          new_country: currentCountry,
          previous_countries: countries,
          detected_at: new Date().toISOString()
        },
        p_severity: 'medium'
      })
    }
  }
}

async function handleSessionAnomaly(supabase: any, event: any) {
  console.log(`⚠️ Session Anomaly: ${event.details?.anomaly_type} for user ${event.user_id}`)
  
  await supabase.rpc('log_security_event', {
    p_event_type: 'session_anomaly_processed',
    p_user_id: event.user_id,
    p_details: {
      anomaly_type: event.details?.anomaly_type,
      session_id: event.session_id,
      processed_at: new Date().toISOString(),
      original_details: event.details
    },
    p_severity: 'high'
  })
}

async function logAdminActivity(supabase: any, event: any) {
  console.log(`👤 Admin Activity: ${event.details?.action} by user ${event.user_id}`)
  
  // Track admin actions for audit purposes
  await supabase.rpc('log_security_event', {
    p_event_type: 'admin_activity_monitored',
    p_user_id: event.user_id,
    p_details: {
      action: event.details?.action,
      target_user: event.details?.target_user_id,
      session_id: event.session_id,
      geographic_info: event.geographic_info,
      monitored_at: new Date().toISOString()
    },
    p_severity: 'medium'
  })
}