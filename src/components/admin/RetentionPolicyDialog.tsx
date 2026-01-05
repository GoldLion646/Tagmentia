import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"

interface RetentionPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RetentionPolicyDialog({ open, onOpenChange }: RetentionPolicyDialogProps) {
  const [retentionDays, setRetentionDays] = useState("90")
  const [autoArchival, setAutoArchival] = useState(true)
  const [archivalMethod, setArchivalMethod] = useState("delete")
  const [loading, setLoading] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const { toast } = useToast()

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
        .select("setting_key, setting_value, description")
        .in("setting_key", ["audit_retention_days_config", "auto_archival_enabled", "archival_method_configured"])

      if (error) throw error

      data?.forEach(setting => {
        switch (setting.setting_key) {
          case "audit_retention_days_config":
            const match = setting.description?.match(/Retention period: (\d+) days/)
            if (match) setRetentionDays(match[1])
            break
          case "auto_archival_enabled":
            setAutoArchival(setting.setting_value || true)
            break
          case "archival_method_configured":
            const methodMatch = setting.description?.match(/Method: (\w+)/)
            if (methodMatch) setArchivalMethod(methodMatch[1])
            break
        }
      })
    } catch (error: any) {
      toast({
        title: "Failed to load settings",
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

      // Handle numeric setting separately since system_settings.setting_value is boolean
      const { error: retentionError } = await supabase
        .from("system_settings")
        .upsert({ 
          setting_key: "audit_retention_days_config", 
          setting_value: true,
          description: `Retention period: ${retentionDays} days`
        }, { onConflict: "setting_key" })

      if (retentionError) throw retentionError

      const { error: archivalError } = await supabase
        .from("system_settings")
        .upsert({ 
          setting_key: "auto_archival_enabled", 
          setting_value: autoArchival 
        }, { onConflict: "setting_key" })

      if (archivalError) throw archivalError

      const { error: methodError } = await supabase
        .from("system_settings")
        .upsert({ 
          setting_key: "archival_method_configured", 
          setting_value: true,
          description: `Method: ${archivalMethod}`
        }, { onConflict: "setting_key" })

      if (methodError) throw methodError

      toast({
        title: "Retention policy updated",
        description: "Your audit log retention settings have been saved successfully."
      })

      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Failed to update policy",
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
          <DialogTitle>Configure Retention Policy</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="retention-days">Retention Period (Days)</Label>
            <Input
              id="retention-days"
              type="number"
              min="1"
              max="3650"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              placeholder="90"
              disabled={loadingSettings}
            />
            <p className="text-xs text-muted-foreground">
              Number of days to retain audit logs before archival (1-3650 days)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Auto-Archival</Label>
              <p className="text-xs text-muted-foreground">
                Automatically archive logs when retention period expires
              </p>
            </div>
            <Switch 
              checked={autoArchival} 
              onCheckedChange={setAutoArchival}
              disabled={loadingSettings}
            />
          </div>

          {autoArchival && (
            <div className="space-y-2">
              <Label htmlFor="archival-method">Archival Method</Label>
              <Select value={archivalMethod} onValueChange={setArchivalMethod} disabled={loadingSettings}>
                <SelectTrigger>
                  <SelectValue placeholder="Select archival method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">Delete permanently</SelectItem>
                  <SelectItem value="compress">Compress and store</SelectItem>
                  <SelectItem value="export">Export to external storage</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how to handle logs after retention period
              </p>
            </div>
          )}

          <div className="rounded-lg bg-muted p-3">
            <h4 className="text-sm font-medium mb-2">Current Policy Summary</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Logs will be retained for {retentionDays} days</p>
              <p>• Auto-archival: {autoArchival ? 'Enabled' : 'Disabled'}</p>
              {autoArchival && (
                <p>• Archival method: {archivalMethod}</p>
              )}
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
            {loading ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}