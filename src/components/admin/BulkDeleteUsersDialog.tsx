import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "@/hooks/use-toast"
import { Trash2, AlertTriangle } from "lucide-react"

interface BulkDeleteUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUsersDeleted: () => void
}

export function BulkDeleteUsersDialog({ open, onOpenChange, onUsersDeleted }: BulkDeleteUsersDialogProps) {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [userIds, setUserIds] = useState("")

  const handleBulkDelete = async () => {
    if (!userIds.trim()) {
      toast({
        title: "Error",
        description: "Please enter user IDs to delete",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Parse the user IDs (expecting comma-separated or line-separated)
      const ids = userIds
        .split(/[,\n\r]+/)
        .map(id => id.trim())
        .filter(id => id.length > 0)

      if (ids.length === 0) {
        throw new Error('No valid user IDs found')
      }

      // Get the current session for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call the bulk delete edge function
      const response = await fetch(`https://vgsavnlyathtlvrevtjb.supabase.co/functions/v1/bulk-delete-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userIds: ids }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete users')
      }

      if (result.results.failed > 0) {
        toast({
          title: "Partial Success",
          description: `Successfully deleted ${result.results.successful} users. Failed to delete ${result.results.failed} users.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: `Successfully deleted all ${result.results.successful} users`,
        })
      }

      onUsersDeleted()
      onOpenChange(false)
      setConfirmText("")
      setUserIds("")
    } catch (error: any) {
      console.error('Error bulk deleting users:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const canDelete = confirmText === "DELETE USERS"

  // Quick fill function for the specific users from the uploaded image
  const fillSpecificUsers = () => {
    const specificUserIds = [
      "d1628cd3-76b2-4f63-91a3-19e8949967dd",
      "53c07167-e249-48c7-864f-c56f843e062e", 
      "a52b2604-df47-4ca2-a145-7b724a135d08",
      "46065f08-1fdd-4191-a1e7-a804a77b02ba"
    ]
    setUserIds(specificUserIds.join('\n'))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Bulk Delete Users
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
            This action cannot be undone. This will permanently delete all specified users and remove all their data from our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="userIds">
                User IDs (one per line or comma-separated):
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillSpecificUsers}
              >
                Fill Specific Users
              </Button>
            </div>
            <Textarea
              id="userIds"
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="Enter user IDs here...&#10;d1628cd3-76b2-4f63-91a3-19e8949967dd&#10;53c07167-e249-48c7-864f-c56f843e062e"
              className="h-32"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <strong>DELETE USERS</strong> to confirm:
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE USERS"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                setConfirmText("")
                setUserIds("")
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={loading || !canDelete || !userIds.trim()}
            >
              {loading ? "Deleting..." : "Delete Users"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}