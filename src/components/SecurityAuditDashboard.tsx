import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, Info, AlertCircle, RefreshCw } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface SecurityAuditEvent {
  id: string
  event_type: string
  user_id: string | null
  details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  ip_address?: string
  user_agent?: string
}

export function SecurityAuditDashboard() {
  const [events, setEvents] = useState<SecurityAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchAuditEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching audit events:', error)
        toast({
          title: "Error",
          description: "Failed to load security audit logs",
          variant: "destructive"
        })
        return
      }

      setEvents((data || []) as SecurityAuditEvent[])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Failed to load security audit logs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditEvents()
  }, [])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <Shield className="h-4 w-4 text-blue-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return "bg-red-100 text-red-800 border-red-200"
      case 'high':
        return "bg-orange-100 text-orange-800 border-orange-200"
      case 'medium':
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case 'low':
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDetails = (details: any) => {
    if (!details || typeof details !== 'object') return '-'
    
    const keys = Object.keys(details)
    if (keys.length === 0) return '-'
    
    return keys.slice(0, 3).map(key => `${key}: ${details[key]}`).join(', ')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Security Audit Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Monitor security events and system activities
          </p>
        </div>
        <Button
          onClick={fetchAuditEvents}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low'] as const).map(severity => {
          const count = events.filter(event => event.severity === severity).length
          return (
            <Card key={severity}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {severity} Priority
                </CardTitle>
                {getSeverityIcon(severity)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Last 50 security events, ordered by most recent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading audit logs...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Badge className={getSeverityColor(event.severity)}>
                          <span className="flex items-center gap-1">
                            {getSeverityIcon(event.severity)}
                            {event.severity}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatEventType(event.event_type)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {event.user_id ? `${event.user_id.slice(0, 8)}...` : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {formatDetails(event.details)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {event.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(event.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}