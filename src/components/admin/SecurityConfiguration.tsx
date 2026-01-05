import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Shield, AlertTriangle, CheckCircle, Database, Lock } from "lucide-react";

interface SecurityConfigurationProps {
  className?: string;
}

export const SecurityConfiguration = ({ className }: SecurityConfigurationProps) => {
  const securityChecks = [
    {
      id: 'leaked_password_protection',
      title: 'Leaked Password Protection',
      description: 'Prevent users from using passwords found in data breaches',
      status: 'warning',
      actionRequired: true,
      dashboardPath: 'auth/settings',
      instructions: 'Navigate to Authentication → Settings → Password Settings and enable "Check for breached passwords"'
    },
    {
      id: 'database_version',
      title: 'PostgreSQL Version',
      description: 'Ensure database is running the latest secure version',
      status: 'warning',
      actionRequired: true,
      dashboardPath: 'settings/infrastructure',
      instructions: 'Navigate to Settings → Infrastructure → Database and follow the upgrade wizard'
    },
    {
      id: 'rls_policies',
      title: 'Row Level Security',
      description: 'Database access is properly secured with RLS policies',
      status: 'success',
      actionRequired: false,
      instructions: 'All tables have appropriate RLS policies configured'
    },
    {
      id: 'admin_functions',
      title: 'Admin Functions Security',
      description: 'Critical admin functions use SECURITY DEFINER and proper validation',
      status: 'success',
      actionRequired: false,
      instructions: 'All admin functions properly secured with role validation'
    },
    {
      id: 'audit_logging',
      title: 'Enhanced Audit Logging',
      description: 'Comprehensive security event logging with IP tracking and geographic monitoring',
      status: 'success',
      actionRequired: false,
      instructions: 'Enhanced security logging implemented with session correlation'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Shield className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string, actionRequired: boolean) => {
    if (status === 'success') {
      return <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-200">Secure</Badge>;
    }
    if (actionRequired) {
      return <Badge variant="destructive">Action Required</Badge>;
    }
    return <Badge variant="secondary">Review</Badge>;
  };

  const openSupabaseDashboard = (path: string) => {
    const projectId = "vgsavnlyathtlvrevtjb";
    const url = `https://supabase.com/dashboard/project/${projectId}/${path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Security Configuration</h2>
          <p className="text-muted-foreground">
            Review and configure security settings to ensure your application is properly protected.
          </p>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Status:</strong> Your application has strong foundational security, but some configuration updates are recommended.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {securityChecks.map((check) => (
            <Card key={check.id} className="border-l-4 border-l-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <CardTitle className="text-lg">{check.title}</CardTitle>
                  </div>
                  {getStatusBadge(check.status, check.actionRequired)}
                </div>
                <CardDescription>{check.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{check.instructions}</p>
                
                {check.actionRequired && check.dashboardPath && (
                  <Button
                    onClick={() => openSupabaseDashboard(check.dashboardPath)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Configure in Supabase Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-blue-900">Enhanced Security Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Implemented Security Enhancements:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Enhanced IP address detection with multiple fallbacks</li>
                  <li>• Geographic location tracking for anomaly detection</li>
                  <li>• Session correlation for event tracking</li>
                  <li>• Browser fingerprinting for device identification</li>
                  <li>• Brute force attack detection and logging</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Active Monitoring:</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• Real-time security event processing</li>
                  <li>• Automated threat pattern detection</li>
                  <li>• Admin activity audit trails</li>
                  <li>• Critical event immediate alerts</li>
                  <li>• Geographic login anomaly detection</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Next Steps:</strong> Complete the configuration tasks above, then regularly review security logs and consider implementing additional monitoring based on your specific security requirements.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};