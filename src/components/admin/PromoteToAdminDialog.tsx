import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Shield, AlertTriangle } from "lucide-react"
import { securityLogger } from "@/utils/securityLogger"

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  user_roles?: { role: string }[]
}

interface PromoteToAdminDialogProps {
  user: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserPromoted: () => void
}

export function PromoteToAdminDialog({ user, open, onOpenChange, onUserPromoted }: PromoteToAdminDialogProps) {
  const [loading, setLoading] = useState(false)
  const [currentAdminPassword, setCurrentAdminPassword] = useState("")
  const [confirmationText, setConfirmationText] = useState("")
  const [currentAdminEmail, setCurrentAdminEmail] = useState("")
  const [currentAdminId, setCurrentAdminId] = useState("")
  const { toast } = useToast()

  // Get current admin email
  useEffect(() => {
    const getCurrentAdmin = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setCurrentAdminEmail(currentUser.email || "")
        setCurrentAdminId(currentUser.id)
      }
    }
    
    if (open) {
      getCurrentAdmin()
    }
  }, [open])

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setCurrentAdminPassword("")
      setConfirmationText("")
    }
  }, [open])

  const getUserDisplayName = (user: Profile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email.split('@')[0]
  }

  const isUserAlreadyAdmin = () => {
    if (!user?.user_roles) return false
    return user.user_roles.some(role => role.role === 'admin')
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validation checks
    if (!currentAdminPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter your current password to confirm this action.",
        variant: "destructive",
      })
      return
    }

    if (confirmationText !== "Admin") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "Admin" exactly to confirm this promotion.',
        variant: "destructive",
      })
      return
    }

    if (isUserAlreadyAdmin()) {
      toast({
        title: "Already Admin",
        description: "This user is already an administrator.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Use the secure promotion function
      const { data, error } = await supabase.rpc('secure_promote_to_admin', {
        target_user_id: user.id,
        current_admin_password: currentAdminPassword
      })

      if (error) {
        console.error('Error promoting user:', error)
        await securityLogger.logSuspiciousActivity(currentAdminId, 'admin_promotion_error', { error: error.message, targetUserId: user.id })
        toast({
          title: "Error",
          description: "Failed to promote user to administrator. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Parse the JSON response
      const result = data as { success: boolean; error?: string; message?: string; target_user_email?: string }

      if (result && !result.success) {
        // Handle specific errors from the function
        if (result.error?.includes('already an admin')) {
          toast({
            title: "Already Admin",
            description: "This user is already an administrator.",
            variant: "destructive",
          })
        } else if (result.error?.includes('Unauthorized')) {
          await securityLogger.logAuthFailure(currentAdminEmail, "Unauthorized admin promotion attempt")
          toast({
            title: "Authentication Failed",
            description: "Incorrect password. Please enter your current password.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to promote user",
            variant: "destructive",
          })
        }
        return
      }

      toast({
        title: "Success",
        description: `${getUserDisplayName(user)} has been promoted to administrator.`,
      })

      onUserPromoted()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error promoting user:', error)
      await securityLogger.logSuspiciousActivity(currentAdminId, 'admin_promotion_error', { error: error?.message, targetUserId: user?.id })
      toast({
        title: "Error",
        description: "Failed to promote user to administrator. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Promote User to Administrator
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Warning:</strong> This action will grant full administrative privileges to this user. 
            They will have access to all system functions, user management, and sensitive data.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">User to be promoted:</h4>
            <p className="text-sm text-muted-foreground">
              <strong>{getUserDisplayName(user)}</strong> ({user.email})
            </p>
            {isUserAlreadyAdmin() && (
              <p className="text-sm text-red-600 mt-1">
                ⚠️ This user is already an administrator
              </p>
            )}
          </div>

          <form onSubmit={handlePromote} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Confirm Your Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="admin-password"
                type="password"
                value={currentAdminPassword}
                onChange={(e) => setCurrentAdminPassword(e.target.value)}
                placeholder="Enter your current admin password"
                disabled={loading}
                autoComplete="current-password"
              />
              <p className="text-xs text-muted-foreground">
                Logged in as: {currentAdminEmail}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-text">
                Type "Admin" to confirm <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmation-text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type exactly: Admin"
                disabled={loading}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                This confirms you understand the implications of this action.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || isUserAlreadyAdmin()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Promoting..." : "Promote to Admin"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}