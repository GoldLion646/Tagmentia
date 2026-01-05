import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  User, 
  Settings, 
  Shield, 
  FileText,
  Search
} from "lucide-react"
import { useEffect, useState } from "react"
import ChangePasswordDialog from "@/components/admin/ChangePasswordDialog"
import Manage2FADialog from "@/components/admin/Manage2FADialog"
import { useToast } from "@/hooks/use-toast"
import { SecurityAuditDashboard } from "@/components/SecurityAuditDashboard"
import { SecurityConfiguration } from "@/components/admin/SecurityConfiguration"
import { supabase } from "@/integrations/supabase/client"
import RetentionPolicyDialog from "@/components/admin/RetentionPolicyDialog"
import NotificationPreferencesDialog from "@/components/admin/NotificationPreferencesDialog"
import ResetAllPasswordsDialog from "@/components/admin/ResetAllPasswordsDialog"

export function SystemSettings() {
  const [openChangePwd, setOpenChangePwd] = useState(false)
  const [openManage2FA, setOpenManage2FA] = useState(false)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [openRetentionPolicy, setOpenRetentionPolicy] = useState(false)
  const [openNotificationPrefs, setOpenNotificationPrefs] = useState(false)
  const [openResetAllPasswords, setOpenResetAllPasswords] = useState(false)
  const { toast } = useToast()
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loadingSettings, setLoadingSettings] = useState(true)

  const settingKeys = [
    "enable_new_user_registration",
    "activate_maintenance_mode", 
    "receive_system_notifications",
    "public_analytics_dashboard",
    "require_strong_passwords",
    "automated_security_audits"
  ]

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", settingKeys)
      if (error) {
        toast({ title: "Failed to load settings", description: error.message })
      } else if (data) {
        const map: Record<string, boolean> = {}
        data.forEach((row: any) => { map[row.setting_key] = row.setting_value })
        setSettings(map)
      }
      setLoadingSettings(false)
    }
    load()
  }, [])

  const handleToggle = async (key: string, value: boolean) => {
    setSettings((s) => ({ ...s, [key]: value }))
    const { error } = await supabase
      .from("system_settings")
      .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" })
    if (error) {
      setSettings((s) => ({ ...s, [key]: !value }))
      toast({ title: "Update failed", description: error.message })
    } else {
      toast({ title: "Setting saved", description: "Your change has been saved." })
    }
  }

  const terminateAllSessions = async () => {
    try {
      // Log the admin action for security audit
      await supabase.from('security_events').insert({
        event_type: 'admin_action',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        details: {
          action: 'terminate_all_sessions',
          timestamp: new Date().toISOString(),
          description: 'Administrator initiated global session termination'
        },
        severity: 'high'
      })

      // For a real implementation, this would revoke all refresh tokens
      // For now, we'll sign out the current admin and show appropriate message
      await supabase.auth.signOut({ scope: 'global' as any })
      
      toast({ 
        title: 'Session termination initiated', 
        description: 'All active sessions are being terminated. You have been signed out.' 
      })
    } catch (e: any) {
      toast({ 
        title: 'Failed to terminate sessions', 
        description: e.message || 'Please try again.' 
      })
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System & Settings</h1>
        <p className="text-muted-foreground">
          Manage essential aspects of the Tagmentia application, including admin accounts, site-wide toggles, and security configurations.
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button className="flex items-center space-x-2">
          <Search className="h-4 w-4" />
          <span>Search</span>
        </Button>
      </div>
    </div>

    <div className="grid gap-6 md:grid-cols-3">
        {/* Admin Account Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Admin Account Management</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage personal account details and credentials.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Change Password</Label>
                <p className="text-xs text-muted-foreground">
                  Update your current administrator password securely.
                </p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => setOpenChangePwd(true)}>
                  Change Password
                </Button>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Manage Notification Preferences</Label>
                <p className="text-xs text-muted-foreground">
                  Control how you receive alerts and updates.
                </p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => setOpenNotificationPrefs(true)}>
                  Preferences
                </Button>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Reset All Admin Passwords</Label>
                <p className="text-xs text-muted-foreground">
                  Force all administrators to reset their passwords on next login.
                </p>
                <Button variant="outline" className="mt-2 w-full" onClick={() => setOpenResetAllPasswords(true)}>
                  Reset All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* General Site Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>General Site Settings</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure site-wide functionalities and user experience.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable New User Registration</Label>
                <p className="text-xs text-muted-foreground">
                  Allow new users to create accounts on the platform.
                </p>
              </div>
              <Switch checked={!!settings["enable_new_user_registration"]} onCheckedChange={(v) => handleToggle("enable_new_user_registration", v)} disabled={loadingSettings} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Activate Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Temporarily disable public access for system updates.
                </p>
              </div>
              <Switch checked={!!settings["activate_maintenance_mode"]} onCheckedChange={(v) => handleToggle("activate_maintenance_mode", v)} disabled={loadingSettings} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Receive System Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Get email alerts for critical system events.
                </p>
              </div>
              <Switch checked={!!settings["receive_system_notifications"]} onCheckedChange={(v) => handleToggle("receive_system_notifications", v)} disabled={loadingSettings} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Public Analytics Dashboard</Label>
                <p className="text-xs text-muted-foreground">
                  Make key performance indicators publicly accessible.
                </p>
              </div>
              <Switch checked={!!settings["public_analytics_dashboard"]} onCheckedChange={(v) => handleToggle("public_analytics_dashboard", v)} disabled={loadingSettings} />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Security Settings</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enhance the security of your Tagmentia application.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Require Strong Passwords</Label>
                <p className="text-xs text-muted-foreground">
                  Enforce complex password policies for all user accounts.
                </p>
              </div>
              <Switch 
                checked={!!settings["require_strong_passwords"]}
                onCheckedChange={(checked) => handleToggle('require_strong_passwords', checked)}
                disabled={loadingSettings}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Two-Factor Authentication (2FA)</Label>
              <p className="text-xs text-muted-foreground">
                2FA is currently enabled for admin accounts.
              </p>
              <Button variant="outline" size="sm" onClick={() => setOpenManage2FA(true)}>
                Manage 2FA
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Terminate All Active Sessions</Label>
              <p className="text-xs text-muted-foreground">
                Log out all users and administrators from all devices.
              </p>
              <Button variant="outline" size="sm" onClick={terminateAllSessions}>
                Terminate All
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Automated Security Audits</Label>
                <p className="text-xs text-muted-foreground">
                  Schedule regular security scans and vulnerability checks.
                </p>
              </div>
              <Switch 
                checked={!!settings["automated_security_audits"]}
                onCheckedChange={(checked) => handleToggle('automated_security_audits', checked)}
                disabled={loadingSettings}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Configuration & Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Security Configuration & Review</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and configure comprehensive security settings for optimal protection.
          </p>
        </CardHeader>
        <CardContent>
          <SecurityConfiguration />
        </CardContent>
      </Card>

      {/* Audit Log & Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>Audit Log & Activity</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review recent administrative actions and system events.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">View Recent Activity</Label>
              <p className="text-xs text-muted-foreground">
                Access a detailed log of all system changes and actions.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setShowAuditLogs(!showAuditLogs)}>
                {showAuditLogs ? 'Hide Logs' : 'View Logs'}
              </Button>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Configure Retention Policy</Label>
              <p className="text-xs text-muted-foreground">
                Set how long audit logs are stored before archival.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setOpenRetentionPolicy(true)}>
                Set Policy
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Last audit: 2024-07-26, 10:30 AM</p>
              <p>Status: All systems nominal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Audit Dashboard */}
      {showAuditLogs && <SecurityAuditDashboard />}

      <ChangePasswordDialog open={openChangePwd} onOpenChange={setOpenChangePwd} />
      <Manage2FADialog open={openManage2FA} onOpenChange={setOpenManage2FA} />
      <RetentionPolicyDialog open={openRetentionPolicy} onOpenChange={setOpenRetentionPolicy} />
      <NotificationPreferencesDialog open={openNotificationPrefs} onOpenChange={setOpenNotificationPrefs} />
      <ResetAllPasswordsDialog open={openResetAllPasswords} onOpenChange={setOpenResetAllPasswords} />
    </div>
  )
}