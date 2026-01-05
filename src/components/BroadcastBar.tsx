import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface Broadcast {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  active: boolean
  created_at: string
}

export function BroadcastBar() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [currentBroadcastIndex, setCurrentBroadcastIndex] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('dismissedBroadcasts') || '[]'))
  )

  useEffect(() => {
    loadActiveBroadcasts()

    // Set up real-time subscription for broadcasts
    const channel = supabase
      .channel('broadcasts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'broadcasts'
        },
        () => {
          // Reload broadcasts when any change happens
          loadActiveBroadcasts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadActiveBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading broadcasts:', error)
        return
      }

      setBroadcasts((data as Broadcast[]) || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const dismissBroadcast = (id: string) => {
    const updated = new Set(dismissedBroadcasts)
    updated.add(id)
    setDismissedBroadcasts(updated)
    localStorage.setItem('dismissedBroadcasts', JSON.stringify([...updated]))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="h-5 w-5 text-blue-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />
      default: return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive'
      case 'warning': return 'secondary'
      default: return 'default'
    }
  }

  const visibleBroadcasts = broadcasts.filter(
    broadcast => !dismissedBroadcasts.has(broadcast.id)
  )

  const currentBroadcast = visibleBroadcasts[currentBroadcastIndex]

  // Show dialog when there are visible broadcasts
  useEffect(() => {
    if (visibleBroadcasts.length > 0 && !isDialogOpen) {
      setIsDialogOpen(true)
    }
  }, [visibleBroadcasts.length, isDialogOpen])

  const handleClose = () => {
    if (currentBroadcast) {
      dismissBroadcast(currentBroadcast.id)
    }
    
    // Check if there are more broadcasts to show
    const remainingBroadcasts = visibleBroadcasts.filter(
      b => b.id !== currentBroadcast?.id
    )
    
    if (remainingBroadcasts.length > 0) {
      // Show next broadcast
      setCurrentBroadcastIndex(0)
    } else {
      // No more broadcasts, close dialog
      setIsDialogOpen(false)
      setCurrentBroadcastIndex(0)
    }
  }

  if (!currentBroadcast || !isDialogOpen) {
    return null
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-start space-x-3">
            {getTypeIcon(currentBroadcast.type)}
            <div className="flex-1">
              <DialogTitle className="text-left text-lg font-semibold">
                {currentBroadcast.title}
              </DialogTitle>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant={getBadgeVariant(currentBroadcast.type)}>
                  {currentBroadcast.type.charAt(0).toUpperCase() + currentBroadcast.type.slice(1)}
                </Badge>
                {visibleBroadcasts.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {currentBroadcastIndex + 1} of {visibleBroadcasts.length}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="text-left text-base text-foreground">
            {currentBroadcast.message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="flex items-center space-x-2"
          >
            <X className="h-4 w-4" />
            <span>Dismiss</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}