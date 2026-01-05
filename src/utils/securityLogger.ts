import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  event_type: 'auth_failure' | 'privilege_escalation' | 'admin_action' | 'suspicious_activity' | 'rate_limit_exceeded' | 'session_anomaly' | 'brute_force_attempt';
  user_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  session_id?: string;
  geographic_info?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private sessionId: string;
  private failureAttempts: Map<string, number> = new Map();
  private lastFailureTime: Map<string, number> = new Map();

  constructor() {
    // Generate unique session ID for correlation
    this.sessionId = this.generateSessionId();
    
    // Periodically flush events
    setInterval(() => this.flush(), this.flushInterval);
    
    // Clean up old failure tracking data every 5 minutes
    setInterval(() => this.cleanupFailureTracking(), 5 * 60 * 1000);
  }

  async logEvent(event: SecurityEvent) {
    // Add timestamp, session, and enhanced browser info
    const enrichedEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
      geographic_info: await this.getGeographicInfo(),
      details: {
        ...event.details,
        browser_info: this.getBrowserFingerprint(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
      },
    };

    this.events.push(enrichedEvent);

    // Track authentication failures for brute force detection
    if (event.event_type === 'auth_failure') {
      await this.trackFailureAttempt(event.details.email || 'unknown');
    }

    // Immediate flush for critical events
    if (event.severity === 'critical') {
      await this.flush();
    }

    // Flush when batch is full
    if (this.events.length >= this.batchSize) {
      await this.flush();
    }
  }

  async logAuthFailure(email: string, reason: string) {
    const failureCount = (this.failureAttempts.get(email) || 0) + 1;
    const severity = failureCount >= 5 ? 'high' : failureCount >= 3 ? 'medium' : 'low';
    
    await this.logEvent({
      event_type: failureCount >= 5 ? 'brute_force_attempt' : 'auth_failure',
      details: { 
        email, 
        reason, 
        attempt_count: failureCount,
        timestamp: Date.now() 
      },
      severity
    });
  }

  async logPrivilegeEscalation(userId: string, attemptedAction: string) {
    await this.logEvent({
      event_type: 'privilege_escalation',
      user_id: userId,
      details: { attemptedAction, timestamp: Date.now() },
      severity: 'high'
    });
  }

  async logAdminAction(userId: string, action: string, targetUserId?: string, details?: Record<string, any>) {
    await this.logEvent({
      event_type: 'admin_action',
      user_id: userId,
      details: { 
        action, 
        targetUserId, 
        timestamp: Date.now(),
        ...details 
      },
      severity: 'medium'
    });
  }

  async logSuspiciousActivity(userId: string | undefined, activity: string, details?: Record<string, any>) {
    await this.logEvent({
      event_type: 'suspicious_activity',
      user_id: userId,
      details: { 
        activity, 
        timestamp: Date.now(),
        ...details 
      },
      severity: 'high'
    });
  }

  async logRateLimitExceeded(identifier: string, action: string) {
    await this.logEvent({
      event_type: 'rate_limit_exceeded',
      details: { 
        identifier, 
        action, 
        timestamp: Date.now() 
      },
      severity: 'medium'
    });
  }

  async logSessionAnomaly(userId: string, anomalyType: string, details: Record<string, any>) {
    await this.logEvent({
      event_type: 'session_anomaly',
      user_id: userId,
      details: {
        anomaly_type: anomalyType,
        timestamp: Date.now(),
        ...details
      },
      severity: 'high'
    });
  }

  private async flush() {
    if (this.events.length === 0) return;

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      // Store in localStorage as backup and for immediate access
      const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      const allLogs = [...existingLogs, ...eventsToFlush].slice(-100); // Keep last 100 logs
      localStorage.setItem('security_logs', JSON.stringify(allLogs));

      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('Security Events');
        eventsToFlush.forEach(event => {
          console.log(`[${event.severity.toUpperCase()}] ${event.event_type}:`, event.details);
        });
        console.groupEnd();
      }

      // Send all events to the persistent audit log
      try {
        for (const event of eventsToFlush) {
          await supabase.rpc('log_security_event', {
            p_event_type: event.event_type,
            p_user_id: event.user_id,
            p_details: event.details,
            p_severity: event.severity,
            p_ip_address: event.ip_address,
            p_user_agent: event.user_agent
          });
        }
      } catch (dbError) {
        console.error('Failed to log to security audit table:', dbError);
      }

      // Also send critical events to edge function for additional processing
      const criticalEvents = eventsToFlush.filter(e => e.severity === 'critical' || e.severity === 'high');
      
      if (criticalEvents.length > 0) {
        try {
          await supabase.functions.invoke('security-monitor', {
            body: { events: criticalEvents }
          });
        } catch (error) {
          console.error('Failed to send critical security events to security monitor:', error);
        }
      }
    } catch (error) {
      console.error('Failed to flush security events:', error);
      // Re-add events back to queue on failure
      this.events.unshift(...eventsToFlush);
    }
  }

  private async getClientIP(): Promise<string> {
    try {
      // Try multiple methods to get real IP address
      const responses = await Promise.allSettled([
        fetch('https://api.ipify.org?format=json'),
        fetch('https://ipapi.co/json/'),
        fetch('https://httpbin.org/ip')
      ]);

      for (const response of responses) {
        if (response.status === 'fulfilled' && response.value.ok) {
          const data = await response.value.json();
          if (data.ip) return data.ip;
          if (data.query) return data.query;
        }
      }
      
      // Fallback: try to get from WebRTC (may not work in all browsers)
      return await this.getIPFromWebRTC() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async getIPFromWebRTC(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        const noop = () => {};
        
        pc.createDataChannel('');
        pc.createOffer()
          .then(pc.setLocalDescription.bind(pc))
          .catch(noop);
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) return;
          const match = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/.exec(ice.candidate.candidate);
          if (match) {
            pc.close();
            resolve(match[1]);
          }
        };
        
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 1000);
      } catch {
        resolve(null);
      }
    });
  }

  private async getGeographicInfo() {
    try {
      const response = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const data = await response.json();
        return {
          country: data.country_name,
          region: data.region,
          city: data.city,
        };
      }
    } catch {
      // Ignore errors for geographic info
    }
    return undefined;
  }

  private getBrowserFingerprint(): Record<string, any> {
    return {
      screen_resolution: `${screen.width}x${screen.height}`,
      color_depth: screen.colorDepth,
      pixel_ratio: window.devicePixelRatio,
      has_touch: 'ontouchstart' in window,
      cookies_enabled: navigator.cookieEnabled,
      do_not_track: navigator.doNotTrack,
      plugins_count: navigator.plugins?.length || 0,
      canvas_fingerprint: this.getCanvasFingerprint(),
    };
  }

  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'unavailable';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Security fingerprint', 2, 2);
      return canvas.toDataURL().slice(-50); // Last 50 chars as fingerprint
    } catch {
      return 'unavailable';
    }
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2) + '_' + Date.now().toString(36);
  }

  private async trackFailureAttempt(identifier: string) {
    const currentCount = (this.failureAttempts.get(identifier) || 0) + 1;
    this.failureAttempts.set(identifier, currentCount);
    this.lastFailureTime.set(identifier, Date.now());
  }

  private cleanupFailureTracking() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [identifier, lastTime] of this.lastFailureTime.entries()) {
      if (lastTime < fiveMinutesAgo) {
        this.failureAttempts.delete(identifier);
        this.lastFailureTime.delete(identifier);
      }
    }
  }

  getRecentEvents(limit = 50): SecurityEvent[] {
    try {
      const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
      return logs.slice(-limit);
    } catch {
      return [];
    }
  }
}

export const securityLogger = new SecurityLogger();