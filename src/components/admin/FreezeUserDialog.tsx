import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Snowflake } from "lucide-react"

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

interface FreezeUserDialogProps {
  user: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

export function FreezeUserDialog({ user, open, onOpenChange, onUserUpdated }: FreezeUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const getDisplayName = (user: Profile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim()
    }
    return user.email.split('@')[0]
  }

  const isUserFrozen = user?.status === 'frozen'

  const handleToggleFreeze = async () => {
    if (!user) return

    setLoading(true)
    try {
      const newStatus = isUserFrozen ? 'active' : 'frozen'
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus } as any)
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: `User ${isUserFrozen ? 'unfrozen' : 'frozen'} successfully`,
      })

      onUserUpdated()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating user status:', error)
      toast({
        title: "Error",
        description: `Failed to ${isUserFrozen ? 'unfreeze' : 'freeze'} user`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            {isUserFrozen ? 'Unfreeze User' : 'Freeze User'}
          </DialogTitle>
          <DialogDescription>
            {isUserFrozen 
              ? `Are you sure you want to unfreeze ${getDisplayName(user)}? This will restore their account access.`
              : `Are you sure you want to freeze ${getDisplayName(user)}? This will suspend their account access.`
            }
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={isUserFrozen ? "default" : "destructive"}
            onClick={handleToggleFreeze}
            disabled={loading}
          >
            {loading 
              ? (isUserFrozen ? "Unfreezing..." : "Freezing...") 
              : (isUserFrozen ? "Unfreeze User" : "Freeze User")
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}