import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SecurityReport() {
  const securityMeasures = [
    {
      category: "Authentication Hardening",
      status: "implemented",
      items: [
        { name: "Enhanced Password Validation", status: "active", description: "8+ chars, mixed case, numbers, symbols" },
        { name: "Rate Limiting", status: "active", description: "Prevents brute force attacks" },
        { name: "Password Strength Indicator", status: "active", description: "Real-time feedback for users" },
        { name: "Account Lockout Protection", status: "active", description: "Temporary blocks after failed attempts" }
      ]
    },
    {
      category: "Input Validation & Sanitization",
      status: "implemented",
      items: [
        { name: "Input Sanitization", status: "active", description: "Removes XSS vectors and malicious content" },
        { name: "URL Validation", status: "active", description: "Ensures safe URL formats" },
        { name: "Text Length Limits", status: "active", description: "Prevents buffer overflow attacks" },
        { name: "Email Validation", status: "active", description: "Proper email format checking" }
      ]
    },
    {
      category: "Security Monitoring",
      status: "implemented", 
      items: [
        { name: "Failed Login Tracking", status: "active", description: "Logs authentication failures" },
        { name: "Admin Action Auditing", status: "active", description: "Comprehensive audit trail" },
        { name: "Privilege Escalation Detection", status: "active", description: "Monitors unauthorized access attempts" },
        { name: "Security Event Logging", status: "active", description: "Centralized security event collection" }
      ]
    },
    {
      category: "Error Handling & Privacy",
      status: "implemented",
      items: [
        { name: "Generic Error Messages", status: "active", description: "Prevents information disclosure" },
        { name: "Secure Authentication Flows", status: "active", description: "Standardized error responses" },
        { name: "Input Error Handling", status: "active", description: "Safe error reporting" },
        { name: "Session Management", status: "active", description: "Secure session handling" }
      ]
    },
    {
      category: "Database Security",
      status: "secured",
      items: [
        { name: "Row Level Security", status: "active", description: "Enforced on all tables" },
        { name: "Promotions Table Protection", status: "active", description: "Admin-only access implemented" },
        { name: "User Data Isolation", status: "active", description: "Users can only access their own data" },
        { name: "SQL Injection Prevention", status: "active", description: "Parameterized queries only" }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'implemented': return 'bg-blue-500';
      case 'secured': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'implemented': 
      case 'secured':
        return <CheckCircle className="w-4 h-4" />;
      default: 
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Security Implementation Report</h2>
      </div>

      <div className="grid gap-6">
        {securityMeasures.map((category, index) => (
          <Card key={index} className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {getStatusIcon(category.status)}
                  {category.category}
                </span>
                <Badge 
                  className={cn(
                    "text-white",
                    getStatusColor(category.status)
                  )}
                >
                  {category.status.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                      getStatusColor(item.status)
                    )} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        item.status === 'active' && "border-green-500 text-green-600"
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900">Security Recommendations</div>
              <div className="text-sm text-blue-700 mt-1">
                To further enhance security:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Enable leaked password protection in Supabase Auth settings</li>
                  <li>Configure 2FA requirements for admin accounts</li>
                  <li>Set up monitoring alerts for critical security events</li>
                  <li>Regularly review security logs and audit trails</li>
                  <li>Consider implementing IP-based access controls for admin functions</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}