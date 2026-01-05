import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState } from "react"

interface ResetAllPasswordsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ResetAllPasswordsDialog({ open, onOpenChange }: ResetAllPasswordsDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleReset = async () => {
    if (confirmText !== "RESET ALL PASSWORDS") {
      toast({
        title: "Confirmation required",
        description: "Please type 'RESET ALL PASSWORDS' to confirm",
        variant: "destructive"
      })
      return
    }

    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for this action",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)

      // First, get all admin users
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")

      if (rolesError) throw rolesError

      if (!adminRoles || adminRoles.length === 0) {
        toast({
          title: "No admin users found",
          description: "No administrators were found to reset passwords for.",
          variant: "destructive"
        })
        return
      }

      // Log the security event before performing the action
      const { error: logError } = await supabase
        .from("security_audit_log")
        .insert({
          event_type: "mass_password_reset",
          user_id: (await supabase.auth.getUser()).data.user?.id,
          details: {
            action: "reset_all_admin_passwords",
            reason: reason,
            affected_users_count: adminRoles.length,
            admin_user_ids: adminRoles.map(r => r.user_id),
            timestamp: new Date().toISOString()
          },
          severity: "critical"
        })

      if (logError) {
        console.error("Failed to log security event:", logError)
      }

      // Store the reset requirement in system settings
      const { error: settingsError } = await supabase
        .from("system_settings")
        .upsert({
          setting_key: "force_password_reset_all_admins",
          setting_value: true,
          description: `Password reset initiated: ${reason}`
        }, { onConflict: "setting_key" })

      if (settingsError) throw settingsError

      toast({
        title: "Password reset initiated",
        description: `All ${adminRoles.length} administrator(s) will be required to reset their passwords on next login.`
      })

      setConfirmText("")
      setReason("")
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Failed to reset passwords",
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
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-destructive" />
            <span>Reset All Admin Passwords</span>
          </DialogTitle>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action will force ALL administrators to reset their passwords on next login. This cannot be undone.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for password reset</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for requiring all administrators to reset their passwords..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for security audit purposes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">Confirmation</Label>
            <Input
              id="confirm-text"
              placeholder="Type 'RESET ALL PASSWORDS' to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Type exactly: <code className="text-xs">RESET ALL PASSWORDS</code>
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <h4 className="text-sm font-medium mb-2">What will happen:</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• All administrators will be logged out</p>
              <p>• They will be required to reset passwords on next login</p>
              <p>• This action will be logged for security audit</p>
              <p>• Email notifications will be sent (if enabled)</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setConfirmText("")
              setReason("")
              onOpenChange(false)
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleReset} 
            disabled={loading || confirmText !== "RESET ALL PASSWORDS" || !reason.trim()}
          >
            {loading ? "Processing..." : "Reset All Passwords"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}