import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing information", description: "Please fill in all fields." })
      return
    }

    if (newPassword.length < 8) {
      toast({ title: "Weak password", description: "New password must be at least 8 characters." })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "New password and confirmation do not match." })
      return
    }

    setLoading(true)
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr || !userRes.user?.email) {
        throw new Error(userErr?.message || "Unable to load current user.")
      }

      // Re-authenticate to verify current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: userRes.user.email,
        password: currentPassword,
      })
      if (signInErr) throw new Error("Current password is incorrect.")

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
      if (updateErr) throw new Error(updateErr.message)

      toast({ title: "Password updated", description: "Your password has been changed successfully." })
      onOpenChange(false)
      reset()
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Current password</Label>
            <Input id="current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset() }}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Updating..." : "Update Password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
