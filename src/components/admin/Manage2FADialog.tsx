import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useEffect, useState } from "react"
import { Shield, Users, Settings, Smartphone } from "lucide-react"
import Setup2FADialog from "./Setup2FADialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function Manage2FADialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const { toast } = useToast()

  const settingKeys = [
    "enforce_2fa_for_admins",
    "allow_2fa_for_users", 
    "require_2fa_for_sensitive_operations"
  ]

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", settingKeys)
    
    if (error) {
      toast({ title: "Failed to load 2FA settings", description: error.message })
    } else if (data) {
      const map: Record<string, boolean> = {}
      data.forEach((row: any) => { map[row.setting_key] = row.setting_value })
      setSettings(map)
    }
    setLoading(false)
  }

  const handleToggle = async (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    
    const { error } = await supabase
      .from("system_settings")
      .upsert({ setting_key: key, setting_value: value }, { onConflict: "setting_key" })
    
    if (error) {
      setSettings(prev => ({ ...prev, [key]: !value }))
      toast({ title: "Update failed", description: error.message })
    } else {
      toast({ title: "2FA setting updated", description: "Your change has been saved." })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Two-Factor Authentication Management</span>
          </DialogTitle>
          <DialogDescription>
            Configure 2FA policies and requirements for your application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Admin 2FA Policies</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Enforce 2FA for All Admins</Label>
                  <p className="text-xs text-muted-foreground">
                    Require all administrators to enable 2FA for their accounts.
                  </p>
                </div>
                <Switch 
                  checked={!!settings["enforce_2fa_for_admins"]}
                  onCheckedChange={(v) => handleToggle("enforce_2fa_for_admins", v)}
                  disabled={loading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Require 2FA for Sensitive Operations</Label>
                  <p className="text-xs text-muted-foreground">
                    Require 2FA verification for critical admin actions.
                  </p>
                </div>
                <Switch 
                  checked={!!settings["require_2fa_for_sensitive_operations"]}
                  onCheckedChange={(v) => handleToggle("require_2fa_for_sensitive_operations", v)}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>User 2FA Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Allow 2FA for Regular Users</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable 2FA as an optional security feature for all users.
                  </p>
                </div>
                <Switch 
                  checked={!!settings["allow_2fa_for_users"]}
                  onCheckedChange={(v) => handleToggle("allow_2fa_for_users", v)}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>Technical Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Configure TOTP Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    Set up time-based one-time passwords using authenticator apps.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-2 w-full" 
                    onClick={() => setShowSetup2FA(true)}
                  >
                    Setup TOTP 2FA
                  </Button>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Policy settings above will be enforced once users have 2FA enabled.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
      
      <Setup2FADialog 
        open={showSetup2FA} 
        onOpenChange={setShowSetup2FA} 
      />
    </Dialog>
  )
}
