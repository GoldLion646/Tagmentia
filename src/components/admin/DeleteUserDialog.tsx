import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Trash2 } from "lucide-react"
import { securityLogger } from "@/utils/securityLogger"

interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  status: string | null
  created_at: string
  updated_at: string
}

interface DeleteUserDialogProps {
  user: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserDeleted: () => void
}

export function DeleteUserDialog({ user, open, onOpenChange, onUserDeleted }: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const { toast } = useToast()

  const getDisplayName = (user: Profile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email.split('@')[0]
  }

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Log admin action for audit trail
      await securityLogger.logAdminAction(
        session.user.id,
        'delete_user',
        user.id,
        { 
          target_user_email: user.email,
          target_user_name: getDisplayName(user)
        }
      )

      // Call the edge function to delete the user
      const response = await fetch(`https://vgsavnlyathtlvrevtjb.supabase.co/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      onUserDeleted()
      onOpenChange(false)
      setConfirmText("")
    } catch (error: any) {
      console.error('Error deleting user:', error)
      
      // Log failed admin action
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await securityLogger.logAdminAction(
          session.user.id,
          'delete_user_failed',
          user.id,
          { 
            error: error.message,
            target_user_email: user.email 
          }
        )
      }
      
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const canDelete = confirmText === "DELETE"

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{getDisplayName(user)}</strong>'s account and remove all their data from our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE</strong> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setConfirmText("")
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || !canDelete}
            >
              {loading ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}