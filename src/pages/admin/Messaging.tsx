import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Send, Eye, Trash2, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/integrations/supabase/client"

interface Broadcast {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  active: boolean
  created_at: string
  created_by: string | null
}

export default function Messaging() {
  const { toast } = useToast()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isCreating, setIsCreating] = useState(false)
  const [newBroadcast, setNewBroadcast] = useState({
    title: '',
    message: '',
    type: 'info' as const
  })
  
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Load broadcasts from database
  useEffect(() => {
    loadBroadcasts()
  }, [])

  const loadBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading broadcasts:', error)
        toast({
          title: "Error",
          description: "Failed to load broadcasts.",
          variant: "destructive"
        })
        return
      }

      setBroadcasts((data as Broadcast[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBroadcast = async () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message fields.",
        variant: "destructive"
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('broadcasts')
        .insert([{
          title: newBroadcast.title,
          message: newBroadcast.message,
          type: newBroadcast.type,
          active: true,
          created_by: user?.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating broadcast:', error)
        toast({
          title: "Error",
          description: "Failed to create broadcast.",
          variant: "destructive"
        })
        return
      }

      // Trigger push notification to all users
      await supabase.functions.invoke('send-push', {
        body: {
          title: newBroadcast.title,
          message: newBroadcast.message,
          type: newBroadcast.type
        }
      })

      setBroadcasts(prev => [data as Broadcast, ...prev])
      setNewBroadcast({ title: '', message: '', type: 'info' })
      setIsCreating(false)
      
      toast({
        title: "Success",
        description: "Broadcast sent as push notification."
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      })
    }
  }

  const toggleBroadcastStatus = async (id: string) => {
    try {
      const broadcast = broadcasts.find(b => b.id === id)
      if (!broadcast) return

      const { error } = await supabase
        .from('broadcasts')
        .update({ active: !broadcast.active })
        .eq('id', id)

      if (error) {
        console.error('Error updating broadcast:', error)
        toast({
          title: "Error",
          description: "Failed to update broadcast status.",
          variant: "destructive"
        })
        return
      }

      setBroadcasts(prev => 
        prev.map(broadcast => 
          broadcast.id === id 
            ? { ...broadcast, active: !broadcast.active }
            : broadcast
        )
      )
      
      toast({
        title: "Success",
        description: "Broadcast status updated."
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const deleteBroadcast = async (id: string) => {
    try {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting broadcast:', error)
        toast({
          title: "Error",
          description: "Failed to delete broadcast.",
          variant: "destructive"
        })
        return
      }

      setBroadcasts(prev => prev.filter(broadcast => broadcast.id !== id))
      
      toast({
        title: "Success",
        description: "Broadcast deleted successfully."
      })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'info': return 'default'
      case 'warning': return 'secondary'
      case 'success': return 'default'
      case 'error': return 'destructive'
      default: return 'default'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-white'
      case 'warning': return 'text-yellow-600'
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-white'
    }
  }

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive'
      default: return 'default'
    }
  }

  const handlePreviewMessage = () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) {
      toast({
        title: "Error", 
        description: "Please fill in both title and message fields to preview.",
        variant: "destructive"
      })
      return
    }
    setIsPreviewOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-2"></div>
          <div className="h-4 bg-muted rounded mb-6"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Broadcasting</h1>
          <p className="text-muted-foreground">
            Create and manage broadcast messages for all users
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Broadcast
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Broadcast</CardTitle>
            <CardDescription>
              Send a message to all users of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter broadcast title..."
                value={newBroadcast.title}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your broadcast message..."
                value={newBroadcast.message}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Message Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newBroadcast.type}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false)
                  setNewBroadcast({ title: '', message: '', type: 'info' })
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="outline"
                onClick={handlePreviewMessage}
              >
                <Play className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button onClick={handleCreateBroadcast}>
                <Send className="mr-2 h-4 w-4" />
                Create Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Broadcasts</h2>
        
        {broadcasts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No broadcasts yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first broadcast to communicate with users
                </p>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Broadcast
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          broadcasts.map((broadcast) => (
            <Card key={broadcast.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{broadcast.title}</h3>
                      <Badge 
                        variant={getTypeVariant(broadcast.type)}
                        className={getTypeColor(broadcast.type)}
                      >
                        {broadcast.type.charAt(0).toUpperCase() + broadcast.type.slice(1)}
                      </Badge>
                      <Badge variant={broadcast.active ? "default" : "secondary"}>
                        {broadcast.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground">{broadcast.message}</p>
                    
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(broadcast.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleBroadcastStatus(broadcast.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBroadcast(broadcast.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>
              This is how your broadcast message will appear to users
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <Alert variant={getAlertVariant(newBroadcast.type)} className="border-2">
                <AlertTitle className="text-base font-semibold">
                  {newBroadcast.title}
                </AlertTitle>
                <AlertDescription className="text-sm mt-2">
                  {newBroadcast.message}
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant={getTypeVariant(newBroadcast.type)}>
                {newBroadcast.type.charAt(0).toUpperCase() + newBroadcast.type.slice(1)}
              </Badge>
              <span>•</span>
              <span>Will be sent to all active users</span>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close Preview
              </Button>
              <Button onClick={() => {
                setIsPreviewOpen(false)
                handleCreateBroadcast()
              }}>
                <Send className="mr-2 h-4 w-4" />
                Send Broadcast
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}