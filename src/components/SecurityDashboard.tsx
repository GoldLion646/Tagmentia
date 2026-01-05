import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { securityLogger } from '@/utils/securityLogger';

export function SecurityDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const loadSecurityEvents = () => {
    setLoading(true);
    try {
      const recentEvents = securityLogger.getRecentEvents(20);
      setEvents(recentEvents);
    } catch (error) {
      console.error('Failed to load security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'auth_failure': return '🔐';
      case 'privilege_escalation': return '⚠️';
      case 'admin_action': return '👑';
      case 'suspicious_activity': return '🚨';
      case 'rate_limit_exceeded': return '⏱️';
      default: return '📋';
    }
  };

  const eventCounts = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Security Dashboard
        </h2>
        <Button onClick={loadSecurityEvents} size="sm" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center">{events.length}</div>
            <div className="text-sm text-muted-foreground text-center">Total Events</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-red-500">
              {severityCounts.critical || 0}
            </div>
            <div className="text-sm text-muted-foreground text-center">Critical</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-orange-500">
              {severityCounts.high || 0}
            </div>
            <div className="text-sm text-muted-foreground text-center">High Priority</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-center text-yellow-500">
              {eventCounts.auth_failure || 0}
            </div>
            <div className="text-sm text-muted-foreground text-center">Auth Failures</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Security Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading security events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No security events recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="text-lg">{getEventTypeIcon(event.event_type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium capitalize">
                        {event.event_type.replace('_', ' ')}
                      </span>
                      <Badge 
                        className={`${getSeverityColor(event.severity)} text-white`}
                        variant="secondary"
                      >
                        {event.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {event.details.activity || event.details.reason || 'Security event detected'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}