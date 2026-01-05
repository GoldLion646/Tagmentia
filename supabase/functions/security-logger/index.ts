import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityEvent {
  event_type: 'auth_failure' | 'privilege_escalation' | 'admin_action' | 'suspicious_activity' | 'rate_limit_exceeded';
  user_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { events } = await req.json() as { events: SecurityEvent[] }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log each event
    for (const event of events) {
      // Log to console with structured format
      console.log(JSON.stringify({
        level: 'SECURITY',
        event_type: event.event_type,
        severity: event.severity,
        user_id: event.user_id,
        details: event.details,
        timestamp: event.timestamp,
        ip_address: event.ip_address,
        user_agent: event.user_agent
      }))

      // For critical events, you might want to:
      // 1. Send alerts to administrators
      // 2. Temporarily block suspicious IPs
      // 3. Send to external security monitoring services
      
      if (event.severity === 'critical') {
        // Log critical events to a separate table or external service
        console.error('CRITICAL SECURITY EVENT:', event)
        
        // Example: Send notification to admin users
        if (event.event_type === 'privilege_escalation') {
          // You could send push notifications or emails here
          console.log('Admin notification would be sent for privilege escalation attempt')
        }
      }

      // Rate limiting logic for repeated suspicious activities
      if (event.event_type === 'suspicious_activity' && event.details.repeated) {
        console.warn('Repeated suspicious activity detected:', event.details)
        // Could implement IP blocking or user account suspension here
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Security logger error:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})