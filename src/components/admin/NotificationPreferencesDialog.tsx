import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"

interface NotificationPreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NotificationPreferencesDialog({ open, onOpenChange }: NotificationPreferencesDialogProps) {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [systemUpdates, setSystemUpdates] = useState(false)
  const [userActivityAlerts, setUserActivityAlerts] = useState(true)
  const [subscriptionUpdates, setSubscriptionUpdates] = useState(true)
  const [maintenanceNotices, setMaintenanceNotices] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const { toast } = useToast()

  const settingKeys = [
    "email_notifications_enabled",
    "security_alerts_enabled", 
    "system_updates_enabled",
    "user_activity_alerts_enabled",
    "subscription_updates_enabled",
    "maintenance_notices_enabled"
  ]

  useEffect(() => {
    if (open) {
      loadCurrentSettings()
    }
  }, [open])

  const loadCurrentSettings = async () => {
    try {
      setLoadingSettings(true)
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", settingKeys)

      if (error) throw error

      data?.forEach(setting => {
        switch (setting.setting_key) {
          case "email_notifications_enabled":
            setEmailNotifications(setting.setting_value || true)
            break
          case "security_alerts_enabled":
            setSecurityAlerts(setting.setting_value || true)
            break
          case "system_updates_enabled":
            setSystemUpdates(setting.setting_value || false)
            break
          case "user_activity_alerts_enabled":
            setUserActivityAlerts(setting.setting_value || true)
            break
          case "subscription_updates_enabled":
            setSubscriptionUpdates(setting.setting_value || true)
            break
          case "maintenance_notices_enabled":
            setMaintenanceNotices(setting.setting_value || true)
            break
        }
      })
    } catch (error: any) {
      toast({
        title: "Failed to load preferences",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const settings = [
        { setting_key: "email_notifications_enabled", setting_value: emailNotifications },
        { setting_key: "security_alerts_enabled", setting_value: securityAlerts },
        { setting_key: "system_updates_enabled", setting_value: systemUpdates },
        { setting_key: "user_activity_alerts_enabled", setting_value: userActivityAlerts },
        { setting_key: "subscription_updates_enabled", setting_value: subscriptionUpdates },
        { setting_key: "maintenance_notices_enabled", setting_value: maintenanceNotices }
      ]

      for (const setting of settings) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(setting, { onConflict: "setting_key" })

        if (error) throw error
      }

      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved successfully."
      })

      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Failed to update preferences",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={setEmailNotifications}
                disabled={loadingSettings}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Security Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about security events and breaches
                </p>
              </div>
              <Switch 
                checked={securityAlerts} 
                onCheckedChange={setSecurityAlerts}
                disabled={loadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">System Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications about system updates and new features
                </p>
              </div>
              <Switch 
                checked={systemUpdates} 
                onCheckedChange={setSystemUpdates}
                disabled={loadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">User Activity Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about unusual user activity
                </p>
              </div>
              <Switch 
                checked={userActivityAlerts} 
                onCheckedChange={setUserActivityAlerts}
                disabled={loadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Subscription Updates</Label>
                <p className="text-xs text-muted-foreground">
                  Notifications about subscription changes and billing
                </p>
              </div>
              <Switch 
                checked={subscriptionUpdates} 
                onCheckedChange={setSubscriptionUpdates}
                disabled={loadingSettings}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Maintenance Notices</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified about scheduled maintenance windows
                </p>
              </div>
              <Switch 
                checked={maintenanceNotices} 
                onCheckedChange={setMaintenanceNotices}
                disabled={loadingSettings}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || loadingSettings}
          >
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}